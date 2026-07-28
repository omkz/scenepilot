import 'server-only'

import { AI_TASK_CONFIG } from '@/lib/ai/config'
import { buildShotListContextFingerprint } from '@/lib/ai/context/shot-list'
import { ScenePilotAIError, normalizeAIError } from '@/lib/ai/errors'
import { generateStructured } from '@/lib/ai/generate'
import { buildShotListPrompt, SHOT_LIST_SYSTEM_PROMPT } from '@/lib/ai/prompts/shot-list'
import { sanitizeShotList } from '@/lib/ai/sanitizers/shot-list'
import { shotListSchema } from '@/lib/ai/schemas/shot-list'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import {
  completeSceneAIGeneration,
  createAIGeneration,
  failSceneAIGeneration,
  markSceneAIGenerationRunning,
} from '@/lib/db/queries/ai-generations'
import { listCharacters } from '@/lib/db/queries/characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { getEpisode } from '@/lib/db/queries/episodes'
import { getLocation } from '@/lib/db/queries/locations'
import { getProjectById } from '@/lib/db/queries/projects'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { getScene, listScenes } from '@/lib/db/queries/scenes'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'
import { listShots } from '@/lib/db/queries/shots'

export async function generateSceneShotList({
  projectId,
  episodeId,
  sceneId,
}: {
  projectId: string
  episodeId: string
  sceneId: string
}) {
  const config = AI_TASK_CONFIG.shotList
  const [
    project,
    episode,
    scene,
    scenes,
    sceneAssignments,
    characters,
    costumes,
    existingShots,
    existingShotCharacters,
  ] = await Promise.all([
    getProjectById(projectId),
    getEpisode(projectId, episodeId),
    getScene(projectId, episodeId, sceneId),
    listScenes(projectId, episodeId),
    listSceneCharacters(projectId, episodeId, sceneId),
    listCharacters(projectId),
    listCostumes(projectId),
    listShots(projectId, episodeId, sceneId),
    listShotCharacters(projectId, episodeId),
  ])
  if (!project || !episode || !scene) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Project, episode, or scene not found.')
  }
  if (!scene.script?.trim()) {
    throw new ScenePilotAIError(
      'AI_CONTEXT_ERROR',
      'The Scene Script is required before generating a Shot List.',
    )
  }
  if (!scene.locationId) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'An approved scene location is required.')
  }
  const location = await getLocation(projectId, scene.locationId)
  if (!location || location.approvalStatus !== 'Approved') {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'An approved scene location is required.')
  }
  const assignedCharacterIds = new Set(sceneAssignments.map(item => item.characterId))
  const approvedCharacters = characters.filter(item => (
    assignedCharacterIds.has(item.id) && item.approvalStatus === 'Approved'
  ))
  if (approvedCharacters.length === 0) {
    throw new ScenePilotAIError(
      'AI_CONTEXT_ERROR',
      'At least one approved character must be assigned to the scene.',
    )
  }
  if (scene.targetDurationSeconds < 1) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'The scene target duration is invalid.')
  }

  const approvedCharacterIds = new Set(approvedCharacters.map(item => item.id))
  const approvedCostumes = costumes.filter(item => (
    approvedCharacterIds.has(item.characterId) && item.approvalStatus === 'Approved'
  ))
  const currentIndex = scenes.findIndex(item => item.id === scene.id)
  const previousScene = currentIndex > 0 ? scenes[currentIndex - 1] : null
  const nextScene = currentIndex >= 0 && currentIndex < scenes.length - 1
    ? scenes[currentIndex + 1]
    : null
  const fingerprint = buildShotListContextFingerprint(scene, sceneAssignments)
  const inputSnapshot = {
    contextFingerprint: fingerprint,
    projectId,
    episodeId,
    sceneId,
    sceneUpdatedAt: scene.updatedAt,
    scriptLength: scene.script.length,
    assignedCharacterIds: sceneAssignments.map(item => item.characterId),
    assignedCostumeIds: sceneAssignments.map(item => item.costumeId).filter(Boolean),
    locationId: scene.locationId,
    existingShotIds: existingShots.map(item => item.id),
  }
  const generation = await createAIGeneration({
    projectId,
    episodeId,
    sceneId,
    taskType: AI_TASK_TYPES.sceneShotList,
    provider: config.provider,
    model: config.model,
    promptVersion: config.promptVersion,
    inputSnapshot,
  })
  if (!generation) {
    throw new ScenePilotAIError('AI_CONTEXT_ERROR', 'Unable to create a scoped generation record.')
  }
  const running = await markSceneAIGenerationRunning(projectId, episodeId, sceneId, generation.id)
  if (!running) {
    throw new ScenePilotAIError('AI_UNKNOWN_ERROR', 'Unable to start the Shot List generation.')
  }
  const startedAt = performance.now()

  try {
    const prompt = buildShotListPrompt({
      project,
      episode,
      scene,
      previousScene,
      nextScene,
      sceneAssignments: sceneAssignments.filter(item => approvedCharacterIds.has(item.characterId)),
      characters: approvedCharacters,
      costumes: approvedCostumes,
      location,
      existingShots,
      existingShotCharacters: existingShotCharacters.filter(item => (
        existingShots.some(shot => shot.id === item.shotId)
      )),
    })
    const result = await generateStructured({
      provider: config.provider,
      model: config.model,
      systemPrompt: SHOT_LIST_SYSTEM_PROMPT,
      prompt,
      schema: shotListSchema,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    })
    const validated = shotListSchema.safeParse(result.output)
    if (!validated.success) {
      throw new ScenePilotAIError('AI_INVALID_OUTPUT', validated.error.message)
    }
    const output = sanitizeShotList(validated.data, {
      characters: approvedCharacters.map(character => {
        const assignment = sceneAssignments.find(item => item.characterId === character.id)
        return {
          id: character.id,
          approvalStatus: character.approvalStatus,
          archivedAt: character.archivedAt,
          assignedToScene: true,
          sceneCostumeId: assignment?.costumeId || null,
        }
      }),
      costumes: approvedCostumes.map(costume => ({
        id: costume.id,
        characterId: costume.characterId,
        approvalStatus: costume.approvalStatus,
        archivedAt: costume.archivedAt,
        isDefault: costume.isDefault,
      })),
      locations: [{
        id: location.id,
        approvalStatus: location.approvalStatus,
        archivedAt: location.archivedAt,
      }],
      sceneLocationId: scene.locationId,
      sceneScript: scene.script,
      targetDurationSeconds: scene.targetDurationSeconds,
      contextFingerprint: fingerprint,
    })
    const completed = await completeSceneAIGeneration(
      projectId,
      episodeId,
      sceneId,
      generation.id,
      result,
      output,
    )
    if (!completed) {
      throw new ScenePilotAIError('AI_UNKNOWN_ERROR', 'Unable to persist completed generation.')
    }
    console.info('ai_generation', {
      generationId: generation.id,
      taskType: AI_TASK_TYPES.sceneShotList,
      projectId,
      episodeId,
      sceneId,
      provider: result.provider,
      model: result.model,
      status: 'Completed',
      durationMs: result.durationMs,
      tokenUsage: result.usage,
    })
    return { generation: completed, shotList: output }
  } catch (error) {
    const normalized = normalizeAIError(error)
    const durationMs = Math.round(performance.now() - startedAt)
    await failSceneAIGeneration(projectId, episodeId, sceneId, generation.id, {
      code: normalized.code,
      message: normalized.userMessage,
      durationMs,
    })
    console.error('ai_generation', {
      generationId: generation.id,
      taskType: AI_TASK_TYPES.sceneShotList,
      projectId,
      episodeId,
      sceneId,
      provider: config.provider,
      model: config.model,
      status: 'Failed',
      durationMs,
      normalizedErrorCode: normalized.code,
    })
    throw normalized
  }
}
