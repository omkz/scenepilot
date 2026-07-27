import 'server-only'

import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { locations, projects, scenes, shots, type LocationRecord } from '@/lib/db/schema'
import type { AssetDeleteResult, AssetStatus, AssetUsage, LocationDto } from '@/lib/assets/types'
import type { LocationInput } from '@/lib/assets/validation'

function validIds(...ids: string[]) {
  return ids.every(id => z.uuid().safeParse(id).success)
}

function serializeLocation(location: LocationRecord): LocationDto {
  return {
    ...location,
    locationType: location.locationType as LocationDto['locationType'],
    defaultTimeOfDay: location.defaultTimeOfDay as LocationDto['defaultTimeOfDay'],
    defaultLighting: location.defaultLighting as LocationDto['defaultLighting'],
    approvalStatus: location.approvalStatus as AssetStatus,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
    archivedAt: location.archivedAt?.toISOString() || null,
  }
}

export async function listLocations(projectId: string, includeArchived = false) {
  if (!validIds(projectId)) return []
  const archiveCondition = includeArchived ? isNotNull(locations.archivedAt) : isNull(locations.archivedAt)
  const rows = await getDatabase()
    .select()
    .from(locations)
    .where(and(eq(locations.projectId, projectId), archiveCondition))
    .orderBy(locations.assetCode)
  return rows.map(serializeLocation)
}

export async function getLocation(projectId: string, locationId: string, includeArchived = false) {
  if (!validIds(projectId, locationId)) return null
  const conditions = [eq(locations.projectId, projectId), eq(locations.id, locationId)]
  if (!includeArchived) conditions.push(isNull(locations.archivedAt))
  const [row] = await getDatabase().select().from(locations).where(and(...conditions)).limit(1)
  return row ? serializeLocation(row) : null
}

export async function createLocation(projectId: string, input: LocationInput) {
  if (!validIds(projectId)) return null
  return getDatabase().transaction(async transaction => {
    const [counter] = await transaction
      .update(projects)
      .set({ nextLocationNumber: sql`${projects.nextLocationNumber} + 1` })
      .where(and(eq(projects.id, projectId), isNull(projects.archivedAt)))
      .returning({ value: projects.nextLocationNumber })
    if (!counter) return null

    const assetCode = `LOCATION-${String(counter.value - 1).padStart(3, '0')}`
    const [row] = await transaction.insert(locations).values({ ...input, projectId, assetCode }).returning()
    return serializeLocation(row)
  })
}

export async function updateLocation(projectId: string, locationId: string, input: LocationInput) {
  if (!validIds(projectId, locationId)) return null
  const [row] = await getDatabase()
    .update(locations)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(locations.projectId, projectId), eq(locations.id, locationId), isNull(locations.archivedAt)))
    .returning()
  return row ? serializeLocation(row) : null
}

export async function setLocationStatus(projectId: string, locationId: string, status: AssetStatus) {
  if (!validIds(projectId, locationId)) return null
  const archivedAt = status === 'Archived' ? new Date() : null
  const [row] = await getDatabase()
    .update(locations)
    .set({ approvalStatus: status, archivedAt, updatedAt: new Date() })
    .where(and(eq(locations.projectId, projectId), eq(locations.id, locationId)))
    .returning()
  return row ? serializeLocation(row) : null
}

export function archiveLocation(projectId: string, locationId: string) {
  return setLocationStatus(projectId, locationId, 'Archived')
}

export function restoreLocation(projectId: string, locationId: string) {
  return setLocationStatus(projectId, locationId, 'Draft')
}

export async function deleteLocation(projectId: string, locationId: string): Promise<AssetDeleteResult> {
  if (!validIds(projectId, locationId)) return { deleted: false, reason: 'not-found' }
  let usage: AssetUsage = {}
  try {
    return await getDatabase().transaction(async transaction => {
      const [target] = await transaction.select({ id: locations.id }).from(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.id, locationId)))
        .limit(1).for('update')
      if (!target) return { deleted: false, reason: 'not-found' } as const
      const [sceneUsage, shotUsage] = await Promise.all([
        transaction.select({ value: count(scenes.id) }).from(scenes)
          .where(and(eq(scenes.projectId, projectId), eq(scenes.locationId, locationId))),
        transaction.select({ value: count(shots.id) }).from(shots)
          .where(and(eq(shots.projectId, projectId), eq(shots.locationId, locationId))),
      ])
      usage = {
        scenes: Number(sceneUsage[0].value),
        shots: Number(shotUsage[0].value),
      }
      if (Object.values(usage).some(value => value > 0)) {
        return { deleted: false, reason: 'in-use', usage } as const
      }
      const [row] = await transaction.delete(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.id, locationId)))
        .returning({ id: locations.id })
      return row
        ? { deleted: true } as const
        : { deleted: false, reason: 'not-found' } as const
    })
  } catch (error) {
    if ((error as { code?: string }).code === '23503') {
      return { deleted: false, reason: 'in-use', usage }
    }
    throw error
  }
}
