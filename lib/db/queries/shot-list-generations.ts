import 'server-only'

import { and, eq, isNull, max, sql } from 'drizzle-orm'
import { z } from 'zod'
import { buildShotListContextFingerprint } from '@/lib/ai/context/shot-list'
import { sanitizeShotList, type ShotListAssetContext } from '@/lib/ai/sanitizers/shot-list'
import { shotListSchema, type ShotList } from '@/lib/ai/schemas/shot-list'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import { getDatabase } from '@/lib/db'
import {
  aiGenerations,
  characters,
  costumes,
  episodes,
  locations,
  projects,
  sceneCharacters,
  scenes,
  shotCharacters,
  shots,
} from '@/lib/db/schema'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

export type ShotListApplyMode = 'append' | 'replace'
export type ShotListApplyReason =
  | 'not_found'
  | 'already_applied'
  | 'invalid_output'
  | 'blocking_warnings'
  | 'context_changed'
  | 'scene_archived'
  | 'missing_script'
  | 'assets_changed'
  | 'apply_failed'

export type ShotListApplyResult =
  | { ok: true; createdShotIds: string[] }
  | { ok: false; reason: ShotListApplyReason }

async function loadSanitizerContext(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0],
  projectId: string,
  episodeId: string,
  sceneId: string,
) {
  const [scene] = await transaction.select().from(scenes)
    .innerJoin(projects, and(eq(projects.id, projectId), isNull(projects.archivedAt)))
    .innerJoin(episodes, and(
      eq(episodes.id, episodeId),
      eq(episodes.projectId, projectId),
      isNull(episodes.archivedAt),
    ))
    .where(and(
      eq(scenes.projectId, projectId),
      eq(scenes.episodeId, episodeId),
      eq(scenes.id, sceneId),
    )).limit(1).for('update')
  if (!scene) return null

  const [assignments, projectCharacters, projectCostumes, projectLocations] = await Promise.all([
    transaction.select().from(sceneCharacters).where(and(
      eq(sceneCharacters.projectId, projectId),
      eq(sceneCharacters.episodeId, episodeId),
      eq(sceneCharacters.sceneId, sceneId),
    )),
    transaction.select({
      id: characters.id,
      approvalStatus: characters.approvalStatus,
      archivedAt: characters.archivedAt,
    }).from(characters).where(eq(characters.projectId, projectId)),
    transaction.select({
      id: costumes.id,
      characterId: costumes.characterId,
      approvalStatus: costumes.approvalStatus,
      archivedAt: costumes.archivedAt,
      isDefault: costumes.isDefault,
    }).from(costumes).where(eq(costumes.projectId, projectId)),
    transaction.select({
      id: locations.id,
      approvalStatus: locations.approvalStatus,
      archivedAt: locations.archivedAt,
    }).from(locations).where(eq(locations.projectId, projectId)),
  ])
  const assigned = new Map(assignments.map(item => [item.characterId, item]))
  const sceneRecord = scene.scenes
  const fingerprint = buildShotListContextFingerprint({
    ...sceneRecord,
    updatedAt: sceneRecord.updatedAt.toISOString(),
  }, assignments)
  const context: ShotListAssetContext = {
    characters: projectCharacters.map(character => ({
      id: character.id,
      approvalStatus: character.approvalStatus,
      archivedAt: character.archivedAt?.toISOString() || null,
      assignedToScene: assigned.has(character.id),
      sceneCostumeId: assigned.get(character.id)?.costumeId || null,
    })),
    costumes: projectCostumes.map(costume => ({
      id: costume.id,
      characterId: costume.characterId,
      approvalStatus: costume.approvalStatus,
      archivedAt: costume.archivedAt?.toISOString() || null,
      isDefault: costume.isDefault,
    })),
    locations: projectLocations.map(location => ({
      id: location.id,
      approvalStatus: location.approvalStatus,
      archivedAt: location.archivedAt?.toISOString() || null,
    })),
    sceneLocationId: sceneRecord.locationId,
    sceneScript: sceneRecord.script || '',
    targetDurationSeconds: sceneRecord.targetDurationSeconds,
    contextFingerprint: fingerprint,
  }
  return { scene: sceneRecord, context }
}

export async function updateShotListGenerationOutput({
  projectId,
  episodeId,
  sceneId,
  generationId,
  input,
}: {
  projectId: string
  episodeId: string
  sceneId: string
  generationId: string
  input: ShotList
}) {
  if (!valid(projectId, episodeId, sceneId, generationId)) return null
  const parsed = shotListSchema.safeParse(input)
  if (!parsed.success) return null
  return getDatabase().transaction(async transaction => {
    const loaded = await loadSanitizerContext(transaction, projectId, episodeId, sceneId)
    if (!loaded || loaded.scene.archivedAt || !loaded.scene.script?.trim()) return null
    const output = sanitizeShotList(parsed.data, loaded.context)
    const [updated] = await transaction.update(aiGenerations).set({
      output,
      updatedAt: new Date(),
    }).where(and(
      eq(aiGenerations.projectId, projectId),
      eq(aiGenerations.episodeId, episodeId),
      eq(aiGenerations.sceneId, sceneId),
      eq(aiGenerations.id, generationId),
      eq(aiGenerations.taskType, AI_TASK_TYPES.sceneShotList),
      eq(aiGenerations.status, 'Completed'),
    )).returning({ id: aiGenerations.id })
    return updated ? output : null
  })
}

export async function saveAndApplyShotListGeneration({
  projectId,
  episodeId,
  sceneId,
  generationId,
  mode,
  input,
}: {
  projectId: string
  episodeId: string
  sceneId: string
  generationId: string
  mode: ShotListApplyMode
  input: unknown
}): Promise<ShotListApplyResult> {
  if (!valid(projectId, episodeId, sceneId, generationId)) {
    return { ok: false, reason: 'not_found' }
  }
  const parsed = shotListSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_output' }

  try {
    return await getDatabase().transaction(async transaction => {
      const loaded = await loadSanitizerContext(transaction, projectId, episodeId, sceneId)
      if (!loaded) return { ok: false, reason: 'not_found' } as const
      if (loaded.scene.archivedAt) return { ok: false, reason: 'scene_archived' } as const
      if (!loaded.scene.script?.trim()) return { ok: false, reason: 'missing_script' } as const

      const [generation] = await transaction.select().from(aiGenerations).where(and(
        eq(aiGenerations.projectId, projectId),
        eq(aiGenerations.episodeId, episodeId),
        eq(aiGenerations.sceneId, sceneId),
        eq(aiGenerations.id, generationId),
        eq(aiGenerations.taskType, AI_TASK_TYPES.sceneShotList),
      )).limit(1).for('update')
      if (!generation) return { ok: false, reason: 'not_found' } as const
      if (generation.status === 'Applied') return { ok: false, reason: 'already_applied' } as const
      if (generation.status !== 'Completed') return { ok: false, reason: 'invalid_output' } as const

      const snapshot = generation.inputSnapshot as { contextFingerprint?: unknown }
      if (
        typeof snapshot.contextFingerprint !== 'string'
        || snapshot.contextFingerprint !== loaded.context.contextFingerprint
      ) {
        return { ok: false, reason: 'context_changed' } as const
      }
      const sanitized = sanitizeShotList(parsed.data, loaded.context)
      if (sanitized.metadata.blockingErrorCount > 0) {
        return { ok: false, reason: 'blocking_warnings' } as const
      }
      if (
        !loaded.context.sceneLocationId
        || !loaded.context.locations.some(location => (
          location.id === loaded.context.sceneLocationId
          && !location.archivedAt
          && location.approvalStatus === 'Approved'
        ))
      ) {
        return { ok: false, reason: 'assets_changed' } as const
      }

      const now = new Date()
      if (mode === 'replace') {
        await transaction.update(shots).set({
          status: 'Archived',
          approvalStatus: 'Archived',
          archivedAt: now,
          updatedAt: now,
        }).where(and(
          eq(shots.projectId, projectId),
          eq(shots.episodeId, episodeId),
          eq(shots.sceneId, sceneId),
          isNull(shots.archivedAt),
        ))
      }
      const [positionResult] = await transaction.select({
        value: max(shots.position),
      }).from(shots).where(and(
        eq(shots.projectId, projectId),
        eq(shots.episodeId, episodeId),
        eq(shots.sceneId, sceneId),
        isNull(shots.archivedAt),
      ))
      const firstShotNumber = loaded.scene.nextShotNumber
      const firstPosition = Number(positionResult.value || 0) + 1
      const [updatedScene] = await transaction.update(scenes).set({
        nextShotNumber: sql`${scenes.nextShotNumber} + ${sanitized.shots.length}`,
        updatedAt: now,
      }).where(and(
        eq(scenes.projectId, projectId),
        eq(scenes.episodeId, episodeId),
        eq(scenes.id, sceneId),
        isNull(scenes.archivedAt),
      )).returning({ id: scenes.id })
      if (!updatedScene) throw new Error('SCENE_UPDATE_FAILED')

      const createdShotIds: string[] = []
      for (const [index, shot] of sanitized.shots.entries()) {
        const [createdShot] = await transaction.insert(shots).values({
          projectId,
          episodeId,
          sceneId,
          shotNumber: firstShotNumber + index,
          position: firstPosition + index,
          title: shot.title,
          description: shot.description,
          shotType: shot.shotType,
          cameraAngle: shot.cameraAngle,
          cameraMovement: shot.cameraMovement,
          lens: shot.lens,
          composition: shot.composition,
          action: shot.action,
          dialogueExcerpt: shot.dialogueExcerpt,
          emotionalIntent: shot.emotionalIntent,
          targetDurationSeconds: shot.estimatedDurationSeconds,
          locationId: shot.locationId || loaded.context.sceneLocationId,
          timeOfDay: shot.timeOfDay,
          lightingNotes: shot.lightingNotes,
          generationPrompt: shot.generationPrompt,
          negativePrompt: shot.negativePrompt,
          compositionLocked: shot.compositionLocked,
          status: 'Draft',
          approvalStatus: 'Draft',
        }).returning({ id: shots.id })
        if (!createdShot) throw new Error('SHOT_INSERT_FAILED')
        createdShotIds.push(createdShot.id)
        if (shot.characters.length > 0) {
          const inserted = await transaction.insert(shotCharacters).values(
            shot.characters.map(character => ({
              projectId,
              episodeId,
              sceneId,
              shotId: createdShot.id,
              characterId: character.characterId,
              costumeId: character.costumeId,
              screenPosition: character.screenPosition,
              pose: character.pose,
              expression: character.expression,
              action: character.action,
              gazeDirection: character.gazeDirection,
              physicalState: character.physicalState,
            })),
          ).returning({ id: shotCharacters.id })
          if (inserted.length !== shot.characters.length) throw new Error('SHOT_CHARACTER_INSERT_FAILED')
        }
      }

      await transaction.update(episodes).set({
        storyboardStatus: 'In Progress',
        updatedAt: now,
      }).where(and(
        eq(episodes.projectId, projectId),
        eq(episodes.id, episodeId),
        isNull(episodes.archivedAt),
      ))

      const [updatedGeneration] = await transaction.update(aiGenerations).set({
        output: sanitized,
        status: 'Applied',
        appliedAt: now,
        updatedAt: now,
        applyMetadata: {
          mode,
          sceneId,
          createdShotIds,
          shotCount: createdShotIds.length,
        },
      }).where(and(
        eq(aiGenerations.projectId, projectId),
        eq(aiGenerations.episodeId, episodeId),
        eq(aiGenerations.sceneId, sceneId),
        eq(aiGenerations.id, generationId),
        eq(aiGenerations.taskType, AI_TASK_TYPES.sceneShotList),
        eq(aiGenerations.status, 'Completed'),
      )).returning({ id: aiGenerations.id })
      if (!updatedGeneration) throw new Error('GENERATION_APPLY_FAILED')
      return { ok: true, createdShotIds }
    })
  } catch {
    return { ok: false, reason: 'apply_failed' }
  }
}
