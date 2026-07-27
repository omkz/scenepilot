import 'server-only'

import { AI_TASK_CONFIG } from '@/lib/ai/config'
import { ScenePilotAIError, normalizeAIError } from '@/lib/ai/errors'
import { generateStructured } from '@/lib/ai/generate'
import { buildEpisodeOutlinePrompt, EPISODE_OUTLINE_SYSTEM_PROMPT } from '@/lib/ai/prompts/episode-outline'
import { episodeOutlineSchema, type EpisodeOutline, type PersistedEpisodeOutline } from '@/lib/ai/schemas/episode-outline'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import { listCharacters } from '@/lib/db/queries/characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { getEpisode, listEpisodes } from '@/lib/db/queries/episodes'
import { listLocations } from '@/lib/db/queries/locations'
import { getProjectById } from '@/lib/db/queries/projects'
import {
  completeAIGeneration,
  createAIGeneration,
  failAIGeneration,
  markAIGenerationRunning,
} from '@/lib/db/queries/ai-generations'

function sanitizeAssetReferences(
  outline: EpisodeOutline,
  characterIds: Set<string>,
  locationIds: Set<string>,
): PersistedEpisodeOutline {
  const assetWarnings: PersistedEpisodeOutline['assetWarnings'] = []
  const sceneSuggestions = outline.sceneSuggestions.map((scene, sceneIndex) => {
    const suggestedCharacterIds = scene.suggestedCharacterIds.filter(id => {
      if (characterIds.has(id)) return true
      assetWarnings.push({
        sceneIndex,
        field: 'suggestedCharacterIds',
        removedValue: id,
        message: 'Unknown or unavailable character reference removed.',
      })
      return false
    })
    let suggestedLocationId = scene.suggestedLocationId
    if (suggestedLocationId && !locationIds.has(suggestedLocationId)) {
      assetWarnings.push({
        sceneIndex,
        field: 'suggestedLocationId',
        removedValue: suggestedLocationId,
        message: 'Unknown or unavailable location reference removed.',
      })
      suggestedLocationId = null
    }
    return { ...scene, suggestedCharacterIds: [...new Set(suggestedCharacterIds)], suggestedLocationId }
  })
  return { ...outline, sceneSuggestions, assetWarnings }
}

export async function generateEpisodeOutline({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const config = AI_TASK_CONFIG.episodeOutline
  const [project, episode, allEpisodes, allCharacters, allCostumes, allLocations] = await Promise.all([
    getProjectById(projectId),
    getEpisode(projectId, episodeId),
    listEpisodes(projectId),
    listCharacters(projectId),
    listCostumes(projectId),
    listLocations(projectId),
  ])
  if (!project || !episode) throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Project or episode not found.')

  const characters = allCharacters.filter(item => item.approvalStatus === 'Approved')
  const costumes = allCostumes.filter(item => item.approvalStatus === 'Approved')
  const locations = allLocations.filter(item => item.approvalStatus === 'Approved')
  const previousEpisode = allEpisodes.find(item => item.episodeNumber === episode.episodeNumber - 1) || null
  const nextEpisode = allEpisodes.find(item => item.episodeNumber === episode.episodeNumber + 1) || null
  const inputSnapshot = {
    project,
    episode,
    previousEpisode,
    nextEpisode,
    approvedCharacters: characters,
    approvedCostumes: costumes,
    approvedLocations: locations,
  }
  const generation = await createAIGeneration({
    projectId,
    episodeId,
    taskType: AI_TASK_TYPES.episodeOutline,
    provider: config.provider,
    model: config.model,
    promptVersion: config.promptVersion,
    inputSnapshot,
  })
  if (!generation) throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Unable to create a scoped generation record.')
  await markAIGenerationRunning(projectId, episodeId, generation.id)
  const startedAt = performance.now()

  try {
    if (characters.length === 0 || locations.length === 0 || !episode.targetDurationSeconds) {
      throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Approved characters, approved locations, and target duration are required.')
    }
    const prompt = buildEpisodeOutlinePrompt({
      project,
      episode,
      previousEpisode,
      nextEpisode,
      characters,
      costumes,
      locations,
    })
    const result = await generateStructured({
      provider: config.provider,
      model: config.model,
      systemPrompt: EPISODE_OUTLINE_SYSTEM_PROMPT,
      prompt,
      schema: episodeOutlineSchema,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    })
    const validated = episodeOutlineSchema.safeParse(result.output)
    if (!validated.success) throw new ScenePilotAIError('AI_INVALID_OUTPUT', validated.error.message)
    const output = sanitizeAssetReferences(
      validated.data,
      new Set(characters.map(item => item.id)),
      new Set(locations.map(item => item.id)),
    )
    const completed = await completeAIGeneration(projectId, episodeId, generation.id, result, output)
    if (!completed) throw new ScenePilotAIError('AI_UNKNOWN_ERROR', 'Unable to persist completed generation.')
    console.info('ai_generation', {
      generationId: generation.id,
      taskType: AI_TASK_TYPES.episodeOutline,
      provider: result.provider,
      model: result.model,
      status: 'Completed',
      durationMs: result.durationMs,
      usage: result.usage,
    })
    return { generation: completed, outline: output }
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
      taskType: AI_TASK_TYPES.episodeOutline,
      provider: config.provider,
      model: config.model,
      status: 'Failed',
      durationMs,
      errorCode: normalized.code,
    })
    throw normalized
  }
}
