'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { normalizeAIError } from '@/lib/ai/errors'
import { persistedEpisodeOutlineSchema } from '@/lib/ai/schemas/episode-outline'
import { scenePlanSchema } from '@/lib/ai/schemas/scene-plan'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import { generateEpisodeOutline } from '@/lib/ai/tasks/generate-episode-outline'
import { generateEpisodeScenePlan } from '@/lib/ai/tasks/generate-scene-plan'
import { applyEpisodeOutlineGeneration, getAIGeneration } from '@/lib/db/queries/ai-generations'
import { getEpisode } from '@/lib/db/queries/episodes'
import {
  applyScenePlanGeneration,
  updateScenePlanGenerationOutput,
  type ScenePlanApplyMode,
} from '@/lib/db/queries/scene-plan-generations'

const outlinePath = (projectId: string, episodeId: string, params: Record<string, string> = {}) => {
  const query = new URLSearchParams({ tab: 'outline', ...params })
  return `/projects/${projectId}/episodes/${episodeId}?${query}`
}

const scenesPath = (projectId: string, episodeId: string, params: Record<string, string> = {}) => {
  const query = new URLSearchParams({ tab: 'scenes', ...params })
  return `/projects/${projectId}/episodes/${episodeId}?${query}`
}

function refresh(projectId: string, episodeId: string) {
  revalidatePath(`/projects/${projectId}/episodes/${episodeId}`)
  revalidatePath(`/projects/${projectId}/episodes`)
  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath(`/projects/${projectId}/production`)
  revalidatePath(`/projects/${projectId}/production/episodes/${episodeId}`)
}

export async function generateEpisodeOutlineAction(projectId: string, episodeId: string) {
  const episode = await getEpisode(projectId, episodeId)
  if (!episode) redirect(`/projects/${projectId}/episodes`)
  try {
    const result = await generateEpisodeOutline({ projectId, episodeId })
    refresh(projectId, episodeId)
    redirect(outlinePath(projectId, episodeId, { generation: result.generation.id, notice: 'outline-generated' }))
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    const normalized = normalizeAIError(error)
    refresh(projectId, episodeId)
    redirect(outlinePath(projectId, episodeId, { aiError: normalized.code }))
  }
}

export async function applyEpisodeOutlineAction(projectId: string, episodeId: string, generationId: string) {
  const [episode, generation] = await Promise.all([
    getEpisode(projectId, episodeId),
    getAIGeneration(projectId, episodeId, generationId),
  ])
  if (!episode || !generation || generation.taskType !== AI_TASK_TYPES.episodeOutline || generation.status !== 'Completed') {
    redirect(outlinePath(projectId, episodeId, { aiError: 'AI_CONTEXT_ERROR' }))
  }
  const parsed = persistedEpisodeOutlineSchema.safeParse(generation.output)
  if (!parsed.success) redirect(outlinePath(projectId, episodeId, { generation: generationId, aiError: 'AI_INVALID_OUTPUT' }))
  const applied = await applyEpisodeOutlineGeneration(projectId, episodeId, generationId, parsed.data)
  if (!applied) redirect(outlinePath(projectId, episodeId, { generation: generationId, aiError: 'AI_CONTEXT_ERROR' }))
  refresh(projectId, episodeId)
  redirect(outlinePath(projectId, episodeId, { generation: generationId, notice: 'outline-applied' }))
}

export async function generateScenePlanAction(projectId: string, episodeId: string) {
  const episode = await getEpisode(projectId, episodeId)
  if (!episode) redirect(`/projects/${projectId}/episodes`)
  try {
    const result = await generateEpisodeScenePlan({ projectId, episodeId })
    refresh(projectId, episodeId)
    redirect(scenesPath(projectId, episodeId, {
      generation: result.generation.id,
      notice: 'scene-plan-generated',
    }))
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    const normalized = normalizeAIError(error)
    refresh(projectId, episodeId)
    redirect(scenesPath(projectId, episodeId, { aiError: normalized.code }))
  }
}

export async function updateScenePlanPreviewAction(
  projectId: string,
  episodeId: string,
  generationId: string,
  formData: FormData,
) {
  try {
    const parsedJson = JSON.parse(String(formData.get('scenePlan') || ''))
    const parsed = scenePlanSchema.safeParse(parsedJson)
    if (!parsed.success) {
      redirect(scenesPath(projectId, episodeId, {
        generation: generationId,
        aiError: 'AI_INVALID_OUTPUT',
      }))
    }
    const updated = await updateScenePlanGenerationOutput({
      projectId,
      episodeId,
      generationId,
      input: parsed.data,
    })
    if (!updated) {
      redirect(scenesPath(projectId, episodeId, {
        generation: generationId,
        aiError: 'AI_CONTEXT_ERROR',
      }))
    }
    refresh(projectId, episodeId)
    redirect(scenesPath(projectId, episodeId, {
      generation: generationId,
      notice: 'scene-plan-saved',
    }))
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    redirect(scenesPath(projectId, episodeId, {
      generation: generationId,
      aiError: 'AI_INVALID_OUTPUT',
    }))
  }
}

export async function applyScenePlanAction(
  projectId: string,
  episodeId: string,
  generationId: string,
  mode: ScenePlanApplyMode,
) {
  if (mode !== 'append' && mode !== 'replace') {
    redirect(scenesPath(projectId, episodeId, {
      generation: generationId,
      scenePlanError: 'invalid',
    }))
  }
  try {
    const result = await applyScenePlanGeneration({
      projectId,
      episodeId,
      generationId,
      mode,
    })
    if (!result.ok) {
      redirect(scenesPath(projectId, episodeId, {
        generation: generationId,
        scenePlanError: result.reason,
      }))
    }
    refresh(projectId, episodeId)
    redirect(scenesPath(projectId, episodeId, {
      selectedScene: result.createdSceneIds[0] || '',
      notice: 'scene-plan-applied',
    }))
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('scene_plan_apply', {
      projectId,
      episodeId,
      generationId,
      status: 'Failed',
    })
    redirect(scenesPath(projectId, episodeId, {
      generation: generationId,
      scenePlanError: 'apply_failed',
    }))
  }
}
