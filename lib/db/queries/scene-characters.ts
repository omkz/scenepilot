import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { characters, costumes, episodes, sceneCharacters, scenes } from '@/lib/db/schema'
import type { AssetStatus } from '@/lib/assets/types'
import type { SceneCharacterDto } from '@/lib/episodes/types'
import type { SceneCharacterInput } from '@/lib/episodes/validation'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

export async function listSceneCharacters(projectId: string, episodeId: string, sceneId?: string) {
  if (!valid(projectId, episodeId, ...(sceneId ? [sceneId] : []))) return []
  const conditions = [eq(sceneCharacters.projectId, projectId), eq(sceneCharacters.episodeId, episodeId)]
  if (sceneId) conditions.push(eq(sceneCharacters.sceneId, sceneId))
  const rows = await getDatabase().select({
    assignment: sceneCharacters,
    character: characters,
    costume: costumes,
  }).from(sceneCharacters)
    .innerJoin(characters, and(eq(sceneCharacters.characterId, characters.id), eq(characters.projectId, projectId)))
    .leftJoin(costumes, and(eq(sceneCharacters.costumeId, costumes.id), eq(costumes.projectId, projectId)))
    .where(and(...conditions))
  return rows.map(({ assignment, character, costume }): SceneCharacterDto => ({
    ...assignment,
    characterName: character.name,
    characterCode: character.assetCode,
    characterStatus: character.approvalStatus as AssetStatus,
    characterArchivedAt: character.archivedAt?.toISOString() || null,
    costumeCharacterId: costume?.characterId || null,
    costumeName: costume?.name || null,
    costumeCode: costume?.assetCode || null,
    costumeCondition: costume?.condition || null,
    costumeStatus: costume ? costume.approvalStatus as AssetStatus : null,
    costumeArchivedAt: costume?.archivedAt?.toISOString() || null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }))
}

async function validateScope(projectId: string, episodeId: string, sceneId: string, input: SceneCharacterInput) {
  if (!valid(projectId, episodeId, sceneId, input.characterId, ...(input.costumeId ? [input.costumeId] : []))) return false
  const database = getDatabase()
  const [[episode], [scene], [character]] = await Promise.all([
    database.select({ id: episodes.id }).from(episodes).where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId), isNull(episodes.archivedAt))).limit(1),
    database.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.projectId, projectId), eq(scenes.episodeId, episodeId), eq(scenes.id, sceneId), isNull(scenes.archivedAt))).limit(1),
    database.select({ id: characters.id }).from(characters).where(and(eq(characters.projectId, projectId), eq(characters.id, input.characterId), isNull(characters.archivedAt))).limit(1),
  ])
  if (!episode || !scene || !character) return false
  if (input.costumeId) {
    const [costume] = await database.select({ id: costumes.id }).from(costumes).where(and(
      eq(costumes.projectId, projectId),
      eq(costumes.id, input.costumeId),
      eq(costumes.characterId, input.characterId),
      isNull(costumes.archivedAt),
    )).limit(1)
    if (!costume) return false
  }
  return true
}

export async function assignCharacterToScene(projectId: string, episodeId: string, sceneId: string, input: SceneCharacterInput) {
  if (!await validateScope(projectId, episodeId, sceneId, input)) return null
  const [row] = await getDatabase().insert(sceneCharacters).values({ ...input, projectId, episodeId, sceneId })
    .onConflictDoNothing({ target: [sceneCharacters.sceneId, sceneCharacters.characterId] })
    .returning()
  return row || null
}

export async function updateSceneCharacter(
  projectId: string,
  episodeId: string,
  sceneId: string,
  assignmentId: string,
  input: SceneCharacterInput,
) {
  if (!valid(assignmentId) || !await validateScope(projectId, episodeId, sceneId, input)) return null
  const [row] = await getDatabase().update(sceneCharacters).set({ ...input, updatedAt: new Date() }).where(and(
    eq(sceneCharacters.projectId, projectId),
    eq(sceneCharacters.episodeId, episodeId),
    eq(sceneCharacters.sceneId, sceneId),
    eq(sceneCharacters.id, assignmentId),
  )).returning()
  return row || null
}

export async function removeCharacterFromScene(projectId: string, episodeId: string, sceneId: string, assignmentId: string) {
  if (!valid(projectId, episodeId, sceneId, assignmentId)) return null
  const [row] = await getDatabase().delete(sceneCharacters).where(and(
    eq(sceneCharacters.projectId, projectId),
    eq(sceneCharacters.episodeId, episodeId),
    eq(sceneCharacters.sceneId, sceneId),
    eq(sceneCharacters.id, assignmentId),
  )).returning({ id: sceneCharacters.id })
  return row || null
}
