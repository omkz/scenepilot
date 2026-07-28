import 'server-only'

import { and, desc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { aiGenerations, episodes, projects, scenes, type AIGenerationRecord } from '@/lib/db/schema'
import type { AIErrorCode } from '@/lib/ai/errors'
import type { AIGenerationDto, ScenePilotAIResult } from '@/lib/ai/types'
import type { PersistedEpisodeOutline } from '@/lib/ai/schemas/episode-outline'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

function serialize(row: AIGenerationRecord): AIGenerationDto {
  return {
    ...row,
    status: row.status as AIGenerationDto['status'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() || null,
    completedAt: row.completedAt?.toISOString() || null,
    appliedAt: row.appliedAt?.toISOString() || null,
  }
}

export async function createAIGeneration(input: {
  projectId: string
  episodeId: string
  sceneId?: string
  taskType: string
  provider: string
  model: string
  promptVersion: string
  inputSnapshot: Record<string, unknown>
}) {
  if (!valid(input.projectId, input.episodeId, ...(input.sceneId ? [input.sceneId] : []))) return null
  const [[project], [episode], scene] = await Promise.all([
    getDatabase().select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), isNull(projects.archivedAt))).limit(1),
    getDatabase().select({ id: episodes.id }).from(episodes).where(and(eq(episodes.projectId, input.projectId), eq(episodes.id, input.episodeId), isNull(episodes.archivedAt))).limit(1),
    input.sceneId
      ? getDatabase().select({ id: scenes.id }).from(scenes).where(and(
          eq(scenes.projectId, input.projectId),
          eq(scenes.episodeId, input.episodeId),
          eq(scenes.id, input.sceneId),
          isNull(scenes.archivedAt),
        )).limit(1)
      : Promise.resolve([{ id: 'episode-scope' }]),
  ])
  if (!project || !episode || !scene[0]) return null
  const [row] = await getDatabase().insert(aiGenerations).values({
    ...input,
    status: 'Queued',
  }).returning()
  return serialize(row)
}

export async function markAIGenerationRunning(projectId: string, episodeId: string, generationId: string) {
  if (!valid(projectId, episodeId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Running',
    startedAt: new Date(),
    errorCode: null,
    errorMessage: null,
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Queued'),
  )).returning()
  return row ? serialize(row) : null
}

export async function completeAIGeneration<T>(
  projectId: string,
  episodeId: string,
  generationId: string,
  result: ScenePilotAIResult<T>,
  output: T,
) {
  if (!valid(projectId, episodeId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Completed',
    output,
    rawOutput: result.rawText || null,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    totalTokens: result.usage?.totalTokens,
    durationMs: result.durationMs,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Running'),
  )).returning()
  return row ? serialize(row) : null
}

export async function failAIGeneration(
  projectId: string,
  episodeId: string,
  generationId: string,
  error: { code: AIErrorCode; message: string; durationMs?: number },
) {
  if (!valid(projectId, episodeId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Failed',
    errorCode: error.code,
    errorMessage: error.message,
    durationMs: error.durationMs,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Running'),
  )).returning()
  return row ? serialize(row) : null
}

export async function getAIGeneration(projectId: string, episodeId: string, generationId: string) {
  if (!valid(projectId, episodeId, generationId)) return null
  const [row] = await getDatabase().select().from(aiGenerations).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.id, generationId),
  )).limit(1)
  return row ? serialize(row) : null
}

export async function listEpisodeGenerations(projectId: string, episodeId: string, taskType?: string) {
  if (!valid(projectId, episodeId)) return []
  const conditions = [
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
  ]
  if (taskType) conditions.push(eq(aiGenerations.taskType, taskType))
  const rows = await getDatabase().select().from(aiGenerations).where(and(
    ...conditions
  )).orderBy(desc(aiGenerations.createdAt))
  return rows.map(serialize)
}

export async function listSceneGenerations(
  projectId: string,
  episodeId: string,
  sceneId: string,
  taskType?: string,
) {
  if (!valid(projectId, episodeId, sceneId)) return []
  const conditions = [
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.sceneId, sceneId),
  ]
  if (taskType) conditions.push(eq(aiGenerations.taskType, taskType))
  const rows = await getDatabase().select().from(aiGenerations)
    .where(and(...conditions))
    .orderBy(desc(aiGenerations.createdAt))
  return rows.map(serialize)
}

export async function getSceneAIGeneration(
  projectId: string,
  episodeId: string,
  sceneId: string,
  generationId: string,
  taskType?: string,
) {
  if (!valid(projectId, episodeId, sceneId, generationId)) return null
  const conditions = [
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.sceneId, sceneId),
    eq(aiGenerations.id, generationId),
  ]
  if (taskType) conditions.push(eq(aiGenerations.taskType, taskType))
  const [row] = await getDatabase().select().from(aiGenerations)
    .where(and(...conditions)).limit(1)
  return row ? serialize(row) : null
}

export async function markSceneAIGenerationRunning(
  projectId: string,
  episodeId: string,
  sceneId: string,
  generationId: string,
) {
  if (!valid(projectId, episodeId, sceneId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Running',
    startedAt: new Date(),
    errorCode: null,
    errorMessage: null,
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.sceneId, sceneId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Queued'),
  )).returning()
  return row ? serialize(row) : null
}

export async function completeSceneAIGeneration<T>(
  projectId: string,
  episodeId: string,
  sceneId: string,
  generationId: string,
  result: ScenePilotAIResult<T>,
  output: T,
) {
  if (!valid(projectId, episodeId, sceneId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Completed',
    output,
    rawOutput: result.rawText || null,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    totalTokens: result.usage?.totalTokens,
    durationMs: result.durationMs,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.sceneId, sceneId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Running'),
  )).returning()
  return row ? serialize(row) : null
}

export async function failSceneAIGeneration(
  projectId: string,
  episodeId: string,
  sceneId: string,
  generationId: string,
  error: { code: AIErrorCode; message: string; durationMs?: number },
) {
  if (!valid(projectId, episodeId, sceneId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Failed',
    errorCode: error.code,
    errorMessage: error.message,
    durationMs: error.durationMs,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.sceneId, sceneId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Running'),
  )).returning()
  return row ? serialize(row) : null
}

export async function markAIGenerationApplied(projectId: string, episodeId: string, generationId: string) {
  if (!valid(projectId, episodeId, generationId)) return null
  const [row] = await getDatabase().update(aiGenerations).set({
    status: 'Applied',
    appliedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(aiGenerations.projectId, projectId),
    eq(aiGenerations.episodeId, episodeId),
    eq(aiGenerations.id, generationId),
    eq(aiGenerations.status, 'Completed'),
  )).returning()
  return row ? serialize(row) : null
}

export async function applyEpisodeOutlineGeneration(
  projectId: string,
  episodeId: string,
  generationId: string,
  output: PersistedEpisodeOutline,
) {
  if (!valid(projectId, episodeId, generationId)) return null
  return getDatabase().transaction(async transaction => {
    const [generation] = await transaction.select({ id: aiGenerations.id }).from(aiGenerations).where(and(
      eq(aiGenerations.projectId, projectId),
      eq(aiGenerations.episodeId, episodeId),
      eq(aiGenerations.id, generationId),
      eq(aiGenerations.taskType, AI_TASK_TYPES.episodeOutline),
      eq(aiGenerations.status, 'Completed'),
    )).limit(1)
    if (!generation) return null
    const [episode] = await transaction.update(episodes).set({
      title: output.title,
      summary: output.summary,
      outline: JSON.stringify(output, null, 2),
      cliffhanger: output.cliffhanger,
      updatedAt: new Date(),
    }).where(and(
      eq(episodes.projectId, projectId),
      eq(episodes.id, episodeId),
      isNull(episodes.archivedAt),
    )).returning({ id: episodes.id })
    if (!episode) return null
    const now = new Date()
    await transaction.update(aiGenerations).set({ status: 'Applied', appliedAt: now, updatedAt: now }).where(and(
      eq(aiGenerations.projectId, projectId),
      eq(aiGenerations.id, generationId),
    ))
    return { episodeId: episode.id, generationId }
  })
}
