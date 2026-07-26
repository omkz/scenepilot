import 'server-only'

import { and, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { characters, costumes, projects, type CostumeRecord } from '@/lib/db/schema'
import type { AssetStatus, CostumeDto } from '@/lib/assets/types'
import type { CostumeInput } from '@/lib/assets/validation'

function validIds(...ids: string[]) {
  return ids.every(id => z.uuid().safeParse(id).success)
}

function serializeCostume(costume: CostumeRecord, characterName: string): CostumeDto {
  return {
    ...costume,
    characterName,
    category: costume.category as CostumeDto['category'],
    condition: costume.condition as CostumeDto['condition'],
    approvalStatus: costume.approvalStatus as AssetStatus,
    createdAt: costume.createdAt.toISOString(),
    updatedAt: costume.updatedAt.toISOString(),
    archivedAt: costume.archivedAt?.toISOString() || null,
  }
}

export async function listCostumes(projectId: string, includeArchived = false) {
  if (!validIds(projectId)) return []
  const archiveCondition = includeArchived ? isNotNull(costumes.archivedAt) : isNull(costumes.archivedAt)
  const rows = await getDatabase()
    .select({ costume: costumes, characterName: characters.name })
    .from(costumes)
    .innerJoin(characters, and(eq(costumes.characterId, characters.id), eq(characters.projectId, projectId)))
    .where(and(eq(costumes.projectId, projectId), archiveCondition))
    .orderBy(costumes.assetCode)
  return rows.map(row => serializeCostume(row.costume, row.characterName))
}

export async function getCostume(projectId: string, costumeId: string, includeArchived = false) {
  if (!validIds(projectId, costumeId)) return null
  const conditions = [eq(costumes.projectId, projectId), eq(costumes.id, costumeId)]
  if (!includeArchived) conditions.push(isNull(costumes.archivedAt))
  const [row] = await getDatabase()
    .select({ costume: costumes, characterName: characters.name })
    .from(costumes)
    .innerJoin(characters, and(eq(costumes.characterId, characters.id), eq(characters.projectId, projectId)))
    .where(and(...conditions))
    .limit(1)
  return row ? serializeCostume(row.costume, row.characterName) : null
}

export async function createCostume(projectId: string, input: CostumeInput) {
  if (!validIds(projectId, input.characterId)) return { costume: null, reason: 'invalid-character' } as const
  return getDatabase().transaction(async transaction => {
    const [character] = await transaction
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(and(eq(characters.projectId, projectId), eq(characters.id, input.characterId), isNull(characters.archivedAt)))
      .limit(1)
    if (!character) return { costume: null, reason: 'invalid-character' } as const

    const [counter] = await transaction
      .update(projects)
      .set({ nextCostumeNumber: sql`${projects.nextCostumeNumber} + 1` })
      .where(and(eq(projects.id, projectId), isNull(projects.archivedAt)))
      .returning({ value: projects.nextCostumeNumber })
    if (!counter) return { costume: null, reason: 'not-found' } as const

    if (input.isDefault) {
      await transaction
        .update(costumes)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(costumes.projectId, projectId), eq(costumes.characterId, input.characterId), eq(costumes.isDefault, true)))
    }

    const assetCode = `COSTUME-${String(counter.value - 1).padStart(3, '0')}`
    const [row] = await transaction.insert(costumes).values({ ...input, projectId, assetCode }).returning()
    return { costume: serializeCostume(row, character.name), reason: null } as const
  })
}

export async function updateCostume(projectId: string, costumeId: string, input: CostumeInput) {
  if (!validIds(projectId, costumeId, input.characterId)) return { costume: null, reason: 'invalid-character' } as const
  return getDatabase().transaction(async transaction => {
    const [character] = await transaction
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(and(eq(characters.projectId, projectId), eq(characters.id, input.characterId), isNull(characters.archivedAt)))
      .limit(1)
    if (!character) return { costume: null, reason: 'invalid-character' } as const

    if (input.isDefault) {
      await transaction
        .update(costumes)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(
          eq(costumes.projectId, projectId),
          eq(costumes.characterId, input.characterId),
          eq(costumes.isDefault, true),
          ne(costumes.id, costumeId),
        ))
    }

    const [row] = await transaction
      .update(costumes)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(costumes.projectId, projectId), eq(costumes.id, costumeId), isNull(costumes.archivedAt)))
      .returning()
    return row
      ? { costume: serializeCostume(row, character.name), reason: null } as const
      : { costume: null, reason: 'not-found' } as const
  })
}

export async function setCostumeStatus(projectId: string, costumeId: string, status: AssetStatus) {
  if (!validIds(projectId, costumeId)) return null
  const archivedAt = status === 'Archived' ? new Date() : null
  const [row] = await getDatabase()
    .update(costumes)
    .set({ approvalStatus: status, archivedAt, updatedAt: new Date() })
    .where(and(eq(costumes.projectId, projectId), eq(costumes.id, costumeId)))
    .returning()
  if (!row) return null
  const [character] = await getDatabase()
    .select({ name: characters.name })
    .from(characters)
    .where(and(eq(characters.projectId, projectId), eq(characters.id, row.characterId)))
    .limit(1)
  return serializeCostume(row, character?.name || 'Unknown character')
}

export function archiveCostume(projectId: string, costumeId: string) {
  return setCostumeStatus(projectId, costumeId, 'Archived')
}

export async function restoreCostume(projectId: string, costumeId: string) {
  if (!validIds(projectId, costumeId)) return null
  return getDatabase().transaction(async transaction => {
    const [costume] = await transaction
      .select()
      .from(costumes)
      .where(and(eq(costumes.projectId, projectId), eq(costumes.id, costumeId), isNotNull(costumes.archivedAt)))
      .limit(1)
    if (!costume) return null

    let isDefault = costume.isDefault
    if (isDefault) {
      const [existingDefault] = await transaction
        .select({ id: costumes.id })
        .from(costumes)
        .where(and(
          eq(costumes.projectId, projectId),
          eq(costumes.characterId, costume.characterId),
          eq(costumes.isDefault, true),
          isNull(costumes.archivedAt),
          ne(costumes.id, costumeId),
        ))
        .limit(1)
      isDefault = !existingDefault
    }

    const [row] = await transaction
      .update(costumes)
      .set({ approvalStatus: 'Draft', archivedAt: null, isDefault, updatedAt: new Date() })
      .where(and(eq(costumes.projectId, projectId), eq(costumes.id, costumeId)))
      .returning()
    const [character] = await transaction
      .select({ name: characters.name })
      .from(characters)
      .where(and(eq(characters.projectId, projectId), eq(characters.id, row.characterId)))
      .limit(1)
    return serializeCostume(row, character?.name || 'Unknown character')
  })
}

export async function deleteCostume(projectId: string, costumeId: string) {
  if (!validIds(projectId, costumeId)) return null
  const [row] = await getDatabase()
    .delete(costumes)
    .where(and(eq(costumes.projectId, projectId), eq(costumes.id, costumeId)))
    .returning({ id: costumes.id })
  return row || null
}
