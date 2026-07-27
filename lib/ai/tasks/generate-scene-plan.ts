import 'server-only'

import { AI_TASK_CONFIG } from '@/lib/ai/config'
import { ScenePilotAIError, normalizeAIError } from '@/lib/ai/errors'
import { generateStructured } from '@/lib/ai/generate'
import { buildScenePlanPrompt, SCENE_PLAN_SYSTEM_PROMPT } from '@/lib/ai/prompts/scene-plan'
import { sanitizeScenePlan } from '@/lib/ai/sanitizers/scene-plan'
import { scenePlanSchema } from '@/lib/ai/schemas/scene-plan'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import {
  completeAIGeneration,
  createAIGeneration,
  failAIGeneration,
  markAIGenerationRunning,
} from '@/lib/db/queries/ai-generations'
import { listCharacters } from '@/lib/db/queries/characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { getEpisode, listEpisodes } from '@/lib/db/queries/episodes'
import { listLocations } from '@/lib/db/queries/locations'
import { getProjectById } from '@/lib/db/queries/projects'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { listScenes } from '@/lib/db/queries/scenes'

export async function generateEpisodeScenePlan({
  projectId,
  episodeId,
}: {
  projectId: string
  episodeId: string
}) {
  const config = AI_TASK_CONFIG.scenePlan
  const [
    project,
    episode,
    allEpisodes,
    existingScenes,
    existingAssignments,
    allCharacters,
    allCostumes,
    allLocations,
  ] = await Promise.all([
    getProjectById(projectId),
    getEpisode(projectId, episodeId),
    listEpisodes(projectId),
    listScenes(projectId, episodeId),
    listSceneCharacters(projectId, episodeId),
    listCharacters(projectId),
    listCostumes(projectId),
    listLocations(projectId),
  ])
  if (!project || !episode) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Project or episode not found.')
  }
  if (!episode.outline?.trim()) {
    throw new ScenePilotAIError(
      'AI_CONTEXT_ERROR',
      'The episode outline is required before generating scenes.',
    )
  }

  const characters = allCharacters.filter(item => item.approvalStatus === 'Approved')
  const approvedCharacterIds = new Set(characters.map(item => item.id))
  const costumes = allCostumes.filter(item => (
    item.approvalStatus === 'Approved' && approvedCharacterIds.has(item.characterId)
  ))
  const locations = allLocations.filter(item => item.approvalStatus === 'Approved')
  if (characters.length === 0) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Approved characters are required.')
  }
  if (locations.length === 0) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Approved locations are required.')
  }

  const previousEpisode = allEpisodes.find(
    item => item.episodeNumber === episode.episodeNumber - 1,
  ) || null
  const nextEpisode = allEpisodes.find(
    item => item.episodeNumber === episode.episodeNumber + 1,
  ) || null
  const inputSnapshot = {
    project,
    episode,
    previousEpisode,
    nextEpisode,
    existingScenes,
    existingAssignments,
    approvedCharacters: characters,
    approvedCostumes: costumes,
    approvedLocations: locations,
  }
  const generation = await createAIGeneration({
    projectId,
    episodeId,
    taskType: AI_TASK_TYPES.episodeScenePlan,
    provider: config.provider,
    model: config.model,
    promptVersion: config.promptVersion,
    inputSnapshot,
  })
  if (!generation) {
    throw new ScenePilotAIError(
      'AI_CONTEXT_ERROR',
      'Unable to create a scoped generation record.',
    )
  }
  await markAIGenerationRunning(projectId, episodeId, generation.id)
  const startedAt = performance.now()

  try {
    const prompt = buildScenePlanPrompt({
      project,
      episode,
      previousEpisode,
      nextEpisode,
      existingScenes,
      existingAssignments,
      characters,
      costumes,
      locations,
    })
    const result = await generateStructured({
      provider: config.provider,
      model: config.model,
      systemPrompt: SCENE_PLAN_SYSTEM_PROMPT,
      prompt,
      schema: scenePlanSchema,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    })
    const validated = scenePlanSchema.safeParse(result.output)
    if (!validated.success) {
      throw new ScenePilotAIError('AI_INVALID_OUTPUT', validated.error.message)
    }
    const output = sanitizeScenePlan(validated.data, {
      characters,
      costumes,
      locations,
    }, episode.targetDurationSeconds)
    const completed = await completeAIGeneration(
      projectId,
      episodeId,
      generation.id,
      result,
      output,
    )
    if (!completed) {
      throw new ScenePilotAIError(
        'AI_UNKNOWN_ERROR',
        'Unable to persist completed generation.',
      )
    }
    console.info('ai_generation', {
      generationId: generation.id,
      taskType: AI_TASK_TYPES.episodeScenePlan,
      provider: result.provider,
      model: result.model,
      status: 'Completed',
      durationMs: result.durationMs,
      usage: result.usage,
    })
    return { generation: completed, scenePlan: output }
  } catch (error) {
    const normalized = normalizeAIError(error)
    const durationMs = Math.round(performance.now() - startedAt)
    await failAIGeneration(projectId, episodeId, generation.id, {
      code: normalized.code,
      message: normalized.userMessage,
      durationMs,
    })
    console.error('ai_generation', {
      generationId: generation.id,
      taskType: AI_TASK_TYPES.episodeScenePlan,
      provider: config.provider,
      model: config.model,
      status: 'Failed',
      durationMs,
      errorCode: normalized.code,
    })
    throw normalized
  }
}
