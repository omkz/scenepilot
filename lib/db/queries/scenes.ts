import 'server-only'

import { and, count, eq, inArray, isNotNull, isNull, max, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { episodes, locations, sceneCharacters, scenes, type SceneRecord } from '@/lib/db/schema'
import type { AssetStatus } from '@/lib/assets/types'
import type { SceneDto, SceneStatus, SceneTime } from '@/lib/episodes/types'
import type { SceneInput } from '@/lib/episodes/validation'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

function serialize(
  row: SceneRecord,
  location: { name: string; assetCode: string; approvalStatus: string; archivedAt: Date | null } | null,
  characterCount = 0,
): SceneDto {
  return {
    ...row,
    timeOfDay: row.timeOfDay as SceneTime,
    status: row.status as SceneStatus,
    locationName: location?.name || null,
    locationCode: location?.assetCode || null,
    locationStatus: location ? location.approvalStatus as AssetStatus : null,
    locationArchivedAt: location?.archivedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() || null,
    characterCount,
  }
}

export async function listScenes(projectId: string, episodeId: string, includeArchived = false) {
  if (!valid(projectId, episodeId)) return []
  const archive = includeArchived ? isNotNull(scenes.archivedAt) : isNull(scenes.archivedAt)
  const [rows, counts] = await Promise.all([
    getDatabase().select({ scene: scenes, location: locations }).from(scenes)
      .leftJoin(locations, and(eq(scenes.locationId, locations.id), eq(locations.projectId, projectId)))
      .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), archive))
      .orderBy(scenes.position),
    getDatabase().select({ sceneId: sceneCharacters.sceneId, value: count(sceneCharacters.id) }).from(sceneCharacters)
      .where(and(eq(sceneCharacters.projectId, projectId), eq(sceneCharacters.episodeId, episodeId)))
      .groupBy(sceneCharacters.sceneId),
  ])
  const countMap = new Map(counts.map(item => [item.sceneId, Number(item.value)]))
  return rows.map(row => serialize(row.scene, row.location, countMap.get(row.scene.id) || 0))
}

export async function getScene(projectId: string, episodeId: string, sceneId: string, includeArchived = false) {
  if (!valid(projectId, episodeId, sceneId)) return null
  const conditions = [eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId)]
  if (!includeArchived) conditions.push(isNull(scenes.archivedAt))
  const [row] = await getDatabase().select({ scene: scenes, location: locations }).from(scenes)
    .leftJoin(locations, and(eq(scenes.locationId, locations.id), eq(locations.projectId, projectId)))
    .where(and(...conditions)).limit(1)
  if (!row) return null
  const [assignmentCount] = await getDatabase().select({ value: count(sceneCharacters.id) }).from(sceneCharacters)
    .where(and(eq(sceneCharacters.projectId, projectId), eq(sceneCharacters.episodeId, episodeId), eq(sceneCharacters.sceneId, sceneId)))
  return serialize(row.scene, row.location, Number(assignmentCount.value))
}

async function validLocation(projectId: string, locationId: string | null) {
  if (!locationId) return true
  if (!valid(locationId)) return false
  const [row] = await getDatabase().select({ id: locations.id }).from(locations)
    .where(and(eq(locations.projectId, projectId), eq(locations.id, locationId), isNull(locations.archivedAt))).limit(1)
  return Boolean(row)
}

export async function createScene(projectId: string, episodeId: string, input: SceneInput) {
  if (!valid(projectId, episodeId) || !await validLocation(projectId, input.locationId)) return null
  return getDatabase().transaction(async transaction => {
    const [counter] = await transaction.update(episodes)
      .set({ nextSceneNumber: sql`${episodes.nextSceneNumber} + 1`, updatedAt: new Date() })
      .where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId), isNull(episodes.archivedAt)))
      .returning({ value: episodes.nextSceneNumber })
    if (!counter) return null
    const sceneNumber = counter.value - 1
    const [row] = await transaction.insert(scenes).values({
      ...input,
      projectId,
      episodeId,
      sceneNumber,
      position: sceneNumber,
    }).returning()
    return serialize(row, null)
  })
}

export async function updateScene(projectId: string, episodeId: string, sceneId: string, input: SceneInput) {
  if (!valid(projectId, episodeId, sceneId) || !await validLocation(projectId, input.locationId)) return null
  const [row] = await getDatabase().update(scenes).set({ ...input, updatedAt: new Date() })
    .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId), isNull(scenes.archivedAt)))
    .returning()
  return row ? serialize(row, null) : null
}

export async function reorderScenes(projectId: string, episodeId: string, orderedSceneIds: string[]) {
  if (!valid(projectId, episodeId, ...orderedSceneIds) || new Set(orderedSceneIds).size !== orderedSceneIds.length) return false
  return getDatabase().transaction(async transaction => {
    const rows = await transaction.select({ id: scenes.id }).from(scenes)
      .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), isNull(scenes.archivedAt)))
    if (rows.length !== orderedSceneIds.length || rows.some(row => !orderedSceneIds.includes(row.id))) return false
    await transaction.update(scenes).set({ position: sql`${scenes.position} + 100000` })
      .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), inArray(scenes.id, orderedSceneIds)))
    for (const [position, id] of orderedSceneIds.entries()) {
      await transaction.update(scenes).set({ position: position + 1, updatedAt: new Date() })
        .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, id)))
    }
    return true
  })
}

export async function setSceneStatus(projectId: string, episodeId: string, sceneId: string, status: SceneStatus) {
  if (!valid(projectId, episodeId, sceneId)) return null
  const [row] = await getDatabase().update(scenes)
    .set({ status, ...(status === 'Archived' ? { archivedAt: new Date() } : {}), updatedAt: new Date() })
    .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId)))
    .returning()
  return row ? serialize(row, null) : null
}

export function archiveScene(projectId: string, episodeId: string, sceneId: string) {
  return setSceneStatus(projectId, episodeId, sceneId, 'Archived')
}

export async function restoreScene(projectId: string, episodeId: string, sceneId: string) {
  if (!valid(projectId, episodeId, sceneId)) return null
  return getDatabase().transaction(async transaction => {
    const [episode] = await transaction.select({ id: episodes.id }).from(episodes)
      .where(and(
        eq(episodes.projectId, projectId),
        eq(episodes.id, episodeId),
        isNull(episodes.archivedAt),
      )).limit(1).for('update')
    if (!episode) return null
    const [archived] = await transaction.select({ id: scenes.id }).from(scenes)
      .where(and(
        eq(scenes.projectId, projectId),
        eq(scenes.episodeId, episodeId),
        eq(scenes.id, sceneId),
        isNotNull(scenes.archivedAt),
      )).limit(1).for('update')
    if (!archived) return null
    const [lastPosition] = await transaction.select({ value: max(scenes.position) }).from(scenes)
      .where(and(
        eq(scenes.projectId, projectId),
        eq(scenes.episodeId, episodeId),
        isNull(scenes.archivedAt),
      ))
    const [row] = await transaction.update(scenes).set({
      status: 'Draft',
      archivedAt: null,
      position: Number(lastPosition.value || 0) + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(scenes.projectId, projectId),
      eq(scenes.episodeId, episodeId),
      eq(scenes.id, sceneId),
      isNotNull(scenes.archivedAt),
    )).returning()
    return row ? serialize(row, null) : null
  })
}

export async function deleteScene(projectId: string, episodeId: string, sceneId: string) {
  if (!valid(projectId, episodeId, sceneId)) return null
  const [row] = await getDatabase().delete(scenes)
    .where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId)))
    .returning({ id: scenes.id })
  return row || null
}
