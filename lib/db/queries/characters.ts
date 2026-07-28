import 'server-only'

import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import {
  characters,
  costumes,
  projects,
  sceneCharacters,
  shotCharacters,
  type CharacterRecord,
} from '@/lib/db/schema'
import type { AssetDeleteResult, AssetStatus, AssetUsage, CharacterDto } from '@/lib/assets/types'
import type { CharacterInput } from '@/lib/assets/validation'
import {
  collectAssetImageStorageObjects,
  processAssetStorageDeletionJobs,
  scheduleAssetStorageDeletionJobs,
} from '@/lib/db/queries/asset-storage-deletion-jobs'

function validIds(...ids: string[]) {
  return ids.every(id => z.uuid().safeParse(id).success)
}

function serializeCharacter(character: CharacterRecord, costumeCount = 0): CharacterDto {
  return {
    ...character,
    narrativeRole: character.narrativeRole as CharacterDto['narrativeRole'],
    approvalStatus: character.approvalStatus as AssetStatus,
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
    archivedAt: character.archivedAt?.toISOString() || null,
    costumeCount,
  }
}

export async function listCharacters(projectId: string, includeArchived = false) {
  if (!validIds(projectId)) return []
  const database = getDatabase()
  const archiveCondition = includeArchived ? isNotNull(characters.archivedAt) : isNull(characters.archivedAt)
  const [rows, costumeCounts] = await Promise.all([
    database.select().from(characters).where(and(eq(characters.projectId, projectId), archiveCondition)).orderBy(characters.assetCode),
    database
      .select({ characterId: costumes.characterId, value: count(costumes.id) })
      .from(costumes)
      .where(eq(costumes.projectId, projectId))
      .groupBy(costumes.characterId),
  ])
  const counts = new Map(costumeCounts.map(item => [item.characterId, Number(item.value)]))
  return rows.map(row => serializeCharacter(row, counts.get(row.id) || 0))
}

export async function getCharacter(projectId: string, characterId: string, includeArchived = false) {
  if (!validIds(projectId, characterId)) return null
  const database = getDatabase()
  const conditions = [eq(characters.projectId, projectId), eq(characters.id, characterId)]
  if (!includeArchived) conditions.push(isNull(characters.archivedAt))
  const [row] = await database.select().from(characters).where(and(...conditions)).limit(1)
  if (!row) return null
  const [costumeTotal] = await database
    .select({ value: count(costumes.id) })
    .from(costumes)
    .where(and(eq(costumes.projectId, projectId), eq(costumes.characterId, characterId)))
  return serializeCharacter(row, Number(costumeTotal.value))
}

export async function createCharacter(projectId: string, input: CharacterInput) {
  if (!validIds(projectId)) return null
  return getDatabase().transaction(async transaction => {
    const [counter] = await transaction
      .update(projects)
      .set({ nextCharacterNumber: sql`${projects.nextCharacterNumber} + 1` })
      .where(and(eq(projects.id, projectId), isNull(projects.archivedAt)))
      .returning({ value: projects.nextCharacterNumber })
    if (!counter) return null

    const assetCode = `CHAR-${String(counter.value - 1).padStart(3, '0')}`
    const [row] = await transaction.insert(characters).values({ ...input, projectId, assetCode }).returning()
    return serializeCharacter(row)
  })
}

export async function updateCharacter(projectId: string, characterId: string, input: CharacterInput) {
  if (!validIds(projectId, characterId)) return null
  const [row] = await getDatabase()
    .update(characters)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(characters.projectId, projectId), eq(characters.id, characterId), isNull(characters.archivedAt)))
    .returning()
  return row ? serializeCharacter(row) : null
}

export async function setCharacterStatus(projectId: string, characterId: string, status: AssetStatus) {
  if (!validIds(projectId, characterId)) return null
  const archivedAt = status === 'Archived' ? new Date() : null
  const [row] = await getDatabase()
    .update(characters)
    .set({ approvalStatus: status, archivedAt, updatedAt: new Date() })
    .where(and(eq(characters.projectId, projectId), eq(characters.id, characterId)))
    .returning()
  return row ? serializeCharacter(row) : null
}

export function archiveCharacter(projectId: string, characterId: string) {
  return setCharacterStatus(projectId, characterId, 'Archived')
}

export function restoreCharacter(projectId: string, characterId: string) {
  return setCharacterStatus(projectId, characterId, 'Draft')
}

export async function deleteCharacter(projectId: string, characterId: string): Promise<AssetDeleteResult> {
  if (!validIds(projectId, characterId)) return { deleted: false, reason: 'not-found' }
  let usage: AssetUsage = {}
  try {
    const outcome = await getDatabase().transaction(async transaction => {
      const [target] = await transaction.select({ id: characters.id }).from(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.id, characterId)))
        .limit(1).for('update')
      if (!target) {
        return { result: { deleted: false, reason: 'not-found' } as const, cleanupJobIds: [] }
      }
      const [costumeUsage, sceneUsage, shotUsage] = await Promise.all([
        transaction.select({ value: count(costumes.id) }).from(costumes)
          .where(and(eq(costumes.projectId, projectId), eq(costumes.characterId, characterId))),
        transaction.select({ value: count(sceneCharacters.id) }).from(sceneCharacters)
          .where(and(eq(sceneCharacters.projectId, projectId), eq(sceneCharacters.characterId, characterId))),
        transaction.select({ value: count(shotCharacters.id) }).from(shotCharacters)
          .where(and(eq(shotCharacters.projectId, projectId), eq(shotCharacters.characterId, characterId))),
      ])
      usage = {
        costumes: Number(costumeUsage[0].value),
        scenes: Number(sceneUsage[0].value),
        shots: Number(shotUsage[0].value),
      }
      if (Object.values(usage).some(value => value > 0)) {
        return { result: { deleted: false, reason: 'in-use', usage } as const, cleanupJobIds: [] }
      }
      const storageObjects = await collectAssetImageStorageObjects(transaction, projectId, 'character', characterId)
      const [row] = await transaction.delete(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.id, characterId)))
        .returning({ id: characters.id })
      const jobs = row
        ? await scheduleAssetStorageDeletionJobs(transaction, storageObjects)
        : []
      return {
        result: row
          ? { deleted: true } as const
          : { deleted: false, reason: 'not-found' } as const,
        cleanupJobIds: row ? jobs.map(job => job.id) : [],
      }
    })
    if (outcome.cleanupJobIds.length) {
      await processAssetStorageDeletionJobs(outcome.cleanupJobIds)
    }
    return outcome.result
  } catch (error) {
    if ((error as { code?: string }).code === '23503') {
      return { deleted: false, reason: 'in-use', usage }
    }
    throw error
  }
}
