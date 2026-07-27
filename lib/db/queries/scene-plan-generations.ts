import 'server-only'

import { and, eq, isNull, max, sql } from 'drizzle-orm'
import { z } from 'zod'
import { sanitizeScenePlan } from '@/lib/ai/sanitizers/scene-plan'
import {
  scenePlanSchema,
  type ScenePlan,
} from '@/lib/ai/schemas/scene-plan'
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
} from '@/lib/db/schema'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

export async function updateScenePlanGenerationOutput({
  projectId,
  episodeId,
  generationId,
  input,
}: {
  projectId: string
  episodeId: string
  generationId: string
  input: ScenePlan
}) {
  if (!valid(projectId, episodeId, generationId)) return null
  const parsed = scenePlanSchema.safeParse(input)
  if (!parsed.success) return null
  return getDatabase().transaction(async transaction => {
    const [[episode], approvedCharacters, approvedCostumes, approvedLocations] = await Promise.all([
      transaction.select({ targetDurationSeconds: episodes.targetDurationSeconds }).from(episodes)
        .innerJoin(projects, and(
          eq(projects.id, projectId),
          isNull(projects.archivedAt),
        ))
        .where(and(
          eq(episodes.projectId, projectId),
          eq(episodes.id, episodeId),
          isNull(episodes.archivedAt),
        )).limit(1),
      transaction.select({
        id: characters.id,
      }).from(characters).where(and(
        eq(characters.projectId, projectId),
        eq(characters.approvalStatus, 'Approved'),
        isNull(characters.archivedAt),
      )),
      transaction.select({
        id: costumes.id,
        characterId: costumes.characterId,
        isDefault: costumes.isDefault,
      }).from(costumes).where(and(
        eq(costumes.projectId, projectId),
        eq(costumes.approvalStatus, 'Approved'),
        isNull(costumes.archivedAt),
      )),
      transaction.select({
        id: locations.id,
      }).from(locations).where(and(
        eq(locations.projectId, projectId),
        eq(locations.approvalStatus, 'Approved'),
        isNull(locations.archivedAt),
      )),
    ])
    if (!episode) return null
    const output = sanitizeScenePlan(parsed.data, {
      characters: approvedCharacters,
      costumes: approvedCostumes,
      locations: approvedLocations,
    }, episode.targetDurationSeconds)
    const [updated] = await transaction.update(aiGenerations).set({
      output,
      updatedAt: new Date(),
    }).where(and(
      eq(aiGenerations.projectId, projectId),
      eq(aiGenerations.episodeId, episodeId),
      eq(aiGenerations.id, generationId),
      eq(aiGenerations.taskType, AI_TASK_TYPES.episodeScenePlan),
      eq(aiGenerations.status, 'Completed'),
    )).returning({ id: aiGenerations.id })
    return updated ? output : null
  })
}

export type ScenePlanApplyMode = 'append' | 'replace'
export type ScenePlanApplyResult =
  | { ok: true; createdSceneIds: string[] }
  | { ok: false; reason: 'not_found' | 'already_applied' | 'invalid_output' | 'assets_changed' }

export async function saveAndApplyScenePlanGeneration({
  projectId,
  episodeId,
  generationId,
  mode,
  input,
}: {
  projectId: string
  episodeId: string
  generationId: string
  mode: ScenePlanApplyMode
  input: unknown
}): Promise<ScenePlanApplyResult> {
  if (!valid(projectId, episodeId, generationId)) return { ok: false, reason: 'not_found' }
  const parsedInput = scenePlanSchema.safeParse(input)
  if (!parsedInput.success) return { ok: false, reason: 'invalid_output' }
  return getDatabase().transaction(async transaction => {
    const [episodeRow] = await transaction.select({ episode: episodes }).from(episodes)
      .innerJoin(projects, and(
        eq(projects.id, projectId),
        isNull(projects.archivedAt),
      ))
      .where(and(
      eq(episodes.projectId, projectId),
      eq(episodes.id, episodeId),
      isNull(episodes.archivedAt),
    )).limit(1).for('update')
    const episode = episodeRow?.episode
    if (!episode) return { ok: false, reason: 'not_found' } as const

    const [generation] = await transaction.select().from(aiGenerations).where(and(
      eq(aiGenerations.projectId, projectId),
      eq(aiGenerations.episodeId, episodeId),
      eq(aiGenerations.id, generationId),
      eq(aiGenerations.taskType, AI_TASK_TYPES.episodeScenePlan),
    )).limit(1).for('update')
    if (!generation) return { ok: false, reason: 'not_found' } as const
    if (generation.status === 'Applied') return { ok: false, reason: 'already_applied' } as const
    if (generation.status !== 'Completed') return { ok: false, reason: 'invalid_output' } as const

    const [approvedCharacters, approvedCostumes, approvedLocations] = await Promise.all([
      transaction.select({ id: characters.id }).from(characters).where(and(
        eq(characters.projectId, projectId),
        eq(characters.approvalStatus, 'Approved'),
        isNull(characters.archivedAt),
      )),
      transaction.select({
        id: costumes.id,
        characterId: costumes.characterId,
        isDefault: costumes.isDefault,
      }).from(costumes).where(and(
        eq(costumes.projectId, projectId),
        eq(costumes.approvalStatus, 'Approved'),
        isNull(costumes.archivedAt),
      )),
      transaction.select({ id: locations.id }).from(locations).where(and(
        eq(locations.projectId, projectId),
        eq(locations.approvalStatus, 'Approved'),
        isNull(locations.archivedAt),
      )),
    ])
    const sanitized = sanitizeScenePlan(parsedInput.data, {
      characters: approvedCharacters,
      costumes: approvedCostumes,
      locations: approvedLocations,
    }, episode.targetDurationSeconds)

    const now = new Date()
    if (mode === 'replace') {
      await transaction.update(scenes).set({
        status: 'Archived',
        archivedAt: now,
        updatedAt: now,
      }).where(and(
        eq(scenes.projectId, projectId),
        eq(scenes.episodeId, episodeId),
        isNull(scenes.archivedAt),
      ))
    }
    const [positionResult] = await transaction.select({
      value: max(scenes.position),
    }).from(scenes).where(and(
      eq(scenes.projectId, projectId),
      eq(scenes.episodeId, episodeId),
      isNull(scenes.archivedAt),
    ))
    const firstSceneNumber = episode.nextSceneNumber
    const firstPosition = Number(positionResult.value || 0) + 1
    const [updatedEpisode] = await transaction.update(episodes).set({
      nextSceneNumber: sql`${episodes.nextSceneNumber} + ${sanitized.scenes.length}`,
      updatedAt: now,
    }).where(and(
      eq(episodes.projectId, projectId),
      eq(episodes.id, episodeId),
      isNull(episodes.archivedAt),
    )).returning({ id: episodes.id })
    if (!updatedEpisode) return { ok: false, reason: 'not_found' } as const

    const createdSceneIds: string[] = []
    for (const [index, scene] of sanitized.scenes.entries()) {
      const [createdScene] = await transaction.insert(scenes).values({
        projectId,
        episodeId,
        sceneNumber: firstSceneNumber + index,
        position: firstPosition + index,
        title: scene.title,
        purpose: scene.purpose,
        summary: scene.summary,
        emotionalTone: scene.emotionalTone,
        timeOfDay: scene.timeOfDay,
        targetDurationSeconds: scene.estimatedDurationSeconds,
        locationId: scene.suggestedLocationId,
        status: 'Draft',
      }).returning({ id: scenes.id })
      createdSceneIds.push(createdScene.id)
      if (scene.characterAssignments.length) {
        await transaction.insert(sceneCharacters).values(
          scene.characterAssignments.map(assignment => ({
            projectId,
            episodeId,
            sceneId: createdScene.id,
            characterId: assignment.characterId,
            costumeId: assignment.costumeId,
            roleInScene: assignment.roleInScene,
            emotionalState: assignment.emotionalState,
            physicalState: assignment.physicalState,
          })),
        )
      }
    }

    const [updatedGeneration] = await transaction.update(aiGenerations).set({
      output: sanitized,
      status: 'Applied',
      appliedAt: now,
      updatedAt: now,
      applyMetadata: { mode, createdSceneIds },
    }).where(and(
      eq(aiGenerations.projectId, projectId),
      eq(aiGenerations.episodeId, episodeId),
      eq(aiGenerations.id, generationId),
      eq(aiGenerations.status, 'Completed'),
    )).returning({ id: aiGenerations.id })
    if (!updatedGeneration) return { ok: false, reason: 'already_applied' } as const
    return { ok: true, createdSceneIds }
  })
}
