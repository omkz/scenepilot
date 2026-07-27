import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { characters, costumes, sceneCharacters, shotCharacters, shots } from '@/lib/db/schema'
import type { AssetStatus } from '@/lib/assets/types'
import type { ShotCharacterDto } from '@/lib/production/types'
import type { ShotCharacterInput } from '@/lib/production/validation'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

export async function listShotCharacters(projectId: string, episodeId: string, shotId?: string) {
  if (!valid(projectId, episodeId, ...(shotId ? [shotId] : []))) return []
  const conditions = [eq(shotCharacters.projectId, projectId), eq(shotCharacters.episodeId, episodeId)]
  if (shotId) conditions.push(eq(shotCharacters.shotId, shotId))
  const rows = await getDatabase().select({
    assignment: shotCharacters,
    character: characters,
    costume: costumes,
  }).from(shotCharacters)
    .innerJoin(characters, and(eq(shotCharacters.characterId, characters.id), eq(characters.projectId, projectId)))
    .leftJoin(costumes, and(eq(shotCharacters.costumeId, costumes.id), eq(costumes.projectId, projectId)))
    .where(and(...conditions))
  return rows.map(({ assignment, character, costume }): ShotCharacterDto => ({
    ...assignment,
    characterName: character.name,
    characterCode: character.assetCode,
    characterStatus: character.approvalStatus as AssetStatus,
    characterArchivedAt: character.archivedAt?.toISOString() || null,
    costumeCharacterId: costume?.characterId || null,
    costumeName: costume?.name || null,
    costumeCode: costume?.assetCode || null,
    costumeStatus: costume ? costume.approvalStatus as AssetStatus : null,
    costumeArchivedAt: costume?.archivedAt?.toISOString() || null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }))
}

async function validateScope(projectId: string, episodeId: string, shotId: string, input: ShotCharacterInput) {
  if (!valid(projectId, episodeId, shotId, input.characterId, ...(input.costumeId ? [input.costumeId] : []))) return null
  const database = getDatabase()
  const [shot] = await database.select({ id: shots.id, sceneId: shots.sceneId }).from(shots).where(and(
    eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNull(shots.archivedAt),
  )).limit(1)
  if (!shot) return null
  const [sceneCharacter] = await database.select({ id: sceneCharacters.id }).from(sceneCharacters).where(and(
    eq(sceneCharacters.projectId, projectId),
    eq(sceneCharacters.episodeId, episodeId),
    eq(sceneCharacters.sceneId, shot.sceneId),
    eq(sceneCharacters.characterId, input.characterId),
  )).limit(1)
  if (!sceneCharacter) return null
  const [character] = await database.select({ id: characters.id }).from(characters).where(and(
    eq(characters.projectId, projectId), eq(characters.id, input.characterId), isNull(characters.archivedAt),
  )).limit(1)
  if (!character) return null
  if (input.costumeId) {
    const [costume] = await database.select({ id: costumes.id }).from(costumes).where(and(
      eq(costumes.projectId, projectId),
      eq(costumes.id, input.costumeId),
      eq(costumes.characterId, input.characterId),
      isNull(costumes.archivedAt),
    )).limit(1)
    if (!costume) return null
  }
  return shot
}

export async function assignCharacterToShot(projectId: string, episodeId: string, shotId: string, input: ShotCharacterInput) {
  const shot = await validateScope(projectId, episodeId, shotId, input)
  if (!shot) return null
  const [row] = await getDatabase().insert(shotCharacters).values({
    ...input, projectId, episodeId, sceneId: shot.sceneId, shotId,
  }).onConflictDoNothing({ target: [shotCharacters.shotId, shotCharacters.characterId] }).returning()
  return row || null
}

export async function updateShotCharacter(projectId: string, episodeId: string, shotId: string, assignmentId: string, input: ShotCharacterInput) {
  if (!valid(assignmentId) || !await validateScope(projectId, episodeId, shotId, input)) return null
  const [row] = await getDatabase().update(shotCharacters).set({ ...input, updatedAt: new Date() }).where(and(
    eq(shotCharacters.projectId, projectId),
    eq(shotCharacters.episodeId, episodeId),
    eq(shotCharacters.shotId, shotId),
    eq(shotCharacters.id, assignmentId),
  )).returning()
  return row || null
}

export async function removeCharacterFromShot(projectId: string, episodeId: string, shotId: string, assignmentId: string) {
  if (!valid(projectId, episodeId, shotId, assignmentId)) return null
  const [row] = await getDatabase().delete(shotCharacters).where(and(
    eq(shotCharacters.projectId, projectId),
    eq(shotCharacters.episodeId, episodeId),
    eq(shotCharacters.shotId, shotId),
    eq(shotCharacters.id, assignmentId),
  )).returning({ id: shotCharacters.id })
  return row || null
}

export async function addSceneCharactersToShot(projectId: string, episodeId: string, shotId: string, characterIds: string[]) {
  if (characterIds.length === 0 || !valid(projectId, episodeId, shotId, ...characterIds)) return 0
  const [shot] = await getDatabase().select({ sceneId: shots.sceneId }).from(shots).where(and(
    eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId), isNull(shots.archivedAt),
  )).limit(1)
  if (!shot) return 0
  const parents = await getDatabase().select().from(sceneCharacters).where(and(
    eq(sceneCharacters.projectId, projectId),
    eq(sceneCharacters.episodeId, episodeId),
    eq(sceneCharacters.sceneId, shot.sceneId),
  ))
  const selected = parents.filter(item => characterIds.includes(item.characterId))
  if (selected.length !== new Set(characterIds).size) return 0
  const rows = await getDatabase().insert(shotCharacters).values(selected.map(item => ({
    projectId,
    episodeId,
    sceneId: shot.sceneId,
    shotId,
    characterId: item.characterId,
    costumeId: item.costumeId,
    physicalState: item.physicalState,
  }))).onConflictDoNothing({ target: [shotCharacters.shotId, shotCharacters.characterId] }).returning({ id: shotCharacters.id })
  return rows.length
}
