import 'server-only'

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { episodes, locations, scenes, shots, type ShotRecord } from '@/lib/db/schema'
import type { AssetStatus } from '@/lib/assets/types'
import type { ShotApprovalStatus, ShotDto, ShotStatus } from '@/lib/production/types'
import type { ShotInput } from '@/lib/production/validation'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

function serialize(row: ShotRecord, location: typeof locations.$inferSelect | null): ShotDto {
  return {
    ...row,
    status: row.status as ShotStatus,
    approvalStatus: row.approvalStatus as ShotApprovalStatus,
    locationName: location?.name || null,
    locationCode: location?.assetCode || null,
    locationStatus: location ? location.approvalStatus as AssetStatus : null,
    locationArchivedAt: location?.archivedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() || null,
  }
}

async function validateParents(projectId: string, episodeId: string, sceneId: string, locationId: string | null | undefined) {
  if (!valid(projectId, episodeId, sceneId, ...(locationId ? [locationId] : []))) return false
  const database = getDatabase()
  const [[episode], [scene], location] = await Promise.all([
    database.select({ id: episodes.id }).from(episodes).where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId), isNull(episodes.archivedAt))).limit(1),
    database.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId), isNull(scenes.archivedAt))).limit(1),
    locationId
      ? database.select({ id: locations.id }).from(locations).where(and(eq(locations.projectId, projectId), eq(locations.id, locationId), isNull(locations.archivedAt))).limit(1)
      : Promise.resolve([{ id: 'none' }]),
  ])
  return Boolean(episode && scene && location[0])
}

export async function listShots(projectId: string, episodeId: string, sceneId?: string, archived = false) {
  if (!valid(projectId, episodeId, ...(sceneId ? [sceneId] : []))) return []
  const conditions = [
    eq(shots.projectId, projectId),
    eq(shots.episodeId, episodeId),
    archived ? isNotNull(shots.archivedAt) : isNull(shots.archivedAt),
  ]
  if (sceneId) conditions.push(eq(shots.sceneId, sceneId))
  const rows = await getDatabase().select({ shot: shots, location: locations }).from(shots)
    .leftJoin(locations, and(eq(shots.locationId, locations.id), eq(locations.projectId, projectId)))
    .where(and(...conditions)).orderBy(shots.sceneId, shots.position)
  return rows.map(row => serialize(row.shot, row.location))
}

export async function getShot(projectId: string, episodeId: string, shotId: string, includeArchived = false) {
  if (!valid(projectId, episodeId, shotId)) return null
  const conditions = [eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId)]
  if (!includeArchived) conditions.push(isNull(shots.archivedAt))
  const [row] = await getDatabase().select({ shot: shots, location: locations }).from(shots)
    .leftJoin(locations, and(eq(shots.locationId, locations.id), eq(locations.projectId, projectId)))
    .where(and(...conditions)).limit(1)
  return row ? serialize(row.shot, row.location) : null
}

export async function createShot(projectId: string, episodeId: string, sceneId: string, input: ShotInput) {
  if (!await validateParents(projectId, episodeId, sceneId, input.locationId)) return null
  return getDatabase().transaction(async transaction => {
    const [counter] = await transaction.update(scenes)
      .set({ nextShotNumber: sql`${scenes.nextShotNumber} + 1`, updatedAt: new Date() })
      .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId), isNull(scenes.archivedAt)))
      .returning({ value: scenes.nextShotNumber })
    if (!counter) return null
    const shotNumber = counter.value - 1
    const [row] = await transaction.insert(shots).values({ ...input, projectId, episodeId, sceneId, shotNumber, position: shotNumber }).returning()
    return serialize(row, null)
  })
}

export async function updateShot(projectId: string, episodeId: string, shotId: string, input: ShotInput) {
  const existing = await getShot(projectId, episodeId, shotId)
  if (!existing || !await validateParents(projectId, episodeId, existing.sceneId, input.locationId)) return null
  const [row] = await getDatabase().update(shots).set({ ...input, updatedAt: new Date() })
    .where(and(eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNull(shots.archivedAt))).returning()
  return row ? serialize(row, null) : null
}

export async function duplicateShot(projectId: string, episodeId: string, shotId: string) {
  const source = await getShot(projectId, episodeId, shotId)
  if (!source) return null
  return createShot(projectId, episodeId, source.sceneId, {
    title: `${source.title} Copy`,
    description: source.description,
    shotType: source.shotType as ShotInput['shotType'],
    cameraAngle: source.cameraAngle as ShotInput['cameraAngle'],
    cameraMovement: source.cameraMovement as ShotInput['cameraMovement'],
    lens: source.lens as ShotInput['lens'],
    composition: source.composition,
    action: source.action,
    dialogueExcerpt: source.dialogueExcerpt,
    emotionalIntent: source.emotionalIntent,
    targetDurationSeconds: source.targetDurationSeconds,
    locationId: source.locationId,
    timeOfDay: source.timeOfDay as ShotInput['timeOfDay'],
    lightingNotes: source.lightingNotes,
    generationPrompt: source.generationPrompt,
    negativePrompt: source.negativePrompt,
    status: 'Draft',
    approvalStatus: 'Draft',
    compositionLocked: false,
  })
}

export async function reorderShots(projectId: string, episodeId: string, sceneId: string, orderedShotIds: string[]) {
  if (!valid(projectId, episodeId, sceneId, ...orderedShotIds) || new Set(orderedShotIds).size !== orderedShotIds.length) return false
  return getDatabase().transaction(async transaction => {
    const rows = await transaction.select({ id: shots.id }).from(shots).where(and(
      eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.sceneId, sceneId), isNull(shots.archivedAt),
    ))
    if (rows.length !== orderedShotIds.length || rows.some(row => !orderedShotIds.includes(row.id))) return false
    await transaction.update(shots).set({ position: sql`${shots.position} + 100000` }).where(and(
      eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.sceneId, sceneId), inArray(shots.id, orderedShotIds),
    ))
    for (const [position, id] of orderedShotIds.entries()) {
      await transaction.update(shots).set({ position: position + 1, updatedAt: new Date() }).where(and(
        eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.sceneId, sceneId), eq(shots.id, id),
      ))
    }
    return true
  })
}

export async function setShotState(projectId: string, episodeId: string, shotId: string, values: {
  status?: ShotStatus
  approvalStatus?: ShotApprovalStatus
  compositionLocked?: boolean
}) {
  if (!valid(projectId, episodeId, shotId)) return null
  const [row] = await getDatabase().update(shots).set({ ...values, updatedAt: new Date() }).where(and(
    eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNull(shots.archivedAt),
  )).returning()
  return row ? serialize(row, null) : null
}

export async function patchShot(projectId: string, episodeId: string, shotId: string, values: Partial<{
  locationId: string | null
  timeOfDay: string
  generationPrompt: string | null
  negativePrompt: string | null
}>) {
  if (!valid(projectId, episodeId, shotId)) return null
  if (values.locationId) {
    const [location] = await getDatabase().select({ id: locations.id }).from(locations).where(and(
      eq(locations.projectId, projectId), eq(locations.id, values.locationId), isNull(locations.archivedAt),
    )).limit(1)
    if (!location) return null
  }
  const [row] = await getDatabase().update(shots).set({ ...values, updatedAt: new Date() }).where(and(
    eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNull(shots.archivedAt),
  )).returning()
  return row ? serialize(row, null) : null
}

export async function archiveShot(projectId: string, episodeId: string, shotId: string) {
  if (!valid(projectId, episodeId, shotId)) return null
  const [row] = await getDatabase().update(shots).set({
    status: 'Archived',
    approvalStatus: 'Archived',
    position: sql`-${shots.shotNumber}`,
    archivedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNull(shots.archivedAt))).returning()
  return row ? serialize(row, null) : null
}

export async function restoreShot(projectId: string, episodeId: string, shotId: string) {
  if (!valid(projectId, episodeId, shotId)) return null
  return getDatabase().transaction(async transaction => {
    const [archived] = await transaction.select({ sceneId: shots.sceneId }).from(shots).where(and(
      eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNotNull(shots.archivedAt),
    )).limit(1)
    if (!archived) return null
    const active = await transaction.select({ position: shots.position }).from(shots).where(and(
      eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.sceneId, archived.sceneId), isNull(shots.archivedAt),
    ))
    const position = active.reduce((maximum, item) => Math.max(maximum, item.position), 0) + 1
    const [row] = await transaction.update(shots).set({
      status: 'Draft', approvalStatus: 'Draft', position, archivedAt: null, updatedAt: new Date(),
    }).where(and(eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNotNull(shots.archivedAt))).returning()
    return row ? serialize(row, null) : null
  })
}

export async function deleteShot(projectId: string, episodeId: string, shotId: string) {
  if (!valid(projectId, episodeId, shotId)) return null
  const [row] = await getDatabase().delete(shots).where(and(
    eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId),
  )).returning({ id: shots.id })
  return row || null
}
