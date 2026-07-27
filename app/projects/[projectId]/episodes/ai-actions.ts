'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { normalizeAIError } from '@/lib/ai/errors'
import { persistedEpisodeOutlineSchema } from '@/lib/ai/schemas/episode-outline'
import { generateEpisodeOutline } from '@/lib/ai/tasks/generate-episode-outline'
import { applyEpisodeOutlineGeneration, getAIGeneration } from '@/lib/db/queries/ai-generations'
import { getEpisode } from '@/lib/db/queries/episodes'

const outlinePath = (projectId: string, episodeId: string, params: Record<string, string> = {}) => {
  const query = new URLSearchParams({ tab: 'outline', ...params })
  return `/projects/${projectId}/episodes/${episodeId}?${query}`
}

function refresh(projectId: string, episodeId: string) {
  revalidatePath(`/projects/${projectId}/episodes/${episodeId}`)
  revalidatePath(`/projects/${projectId}/episodes`)
  revalidatePath(`/projects/${projectId}/overview`)
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
    getAIGeneration(projectId, generationId),
  ])
  if (!episode || !generation || generation.episodeId !== episodeId || generation.taskType !== 'Episode Outline' || generation.status !== 'Completed') {
    redirect(outlinePath(projectId, episodeId, { aiError: 'AI_CONTEXT_ERROR' }))
  }
  const parsed = persistedEpisodeOutlineSchema.safeParse(generation.output)
  if (!parsed.success) redirect(outlinePath(projectId, episodeId, { generation: generationId, aiError: 'AI_INVALID_OUTPUT' }))
  const applied = await applyEpisodeOutlineGeneration(projectId, episodeId, generationId, parsed.data)
  if (!applied) redirect(outlinePath(projectId, episodeId, { generation: generationId, aiError: 'AI_CONTEXT_ERROR' }))
  refresh(projectId, episodeId)
  redirect(outlinePath(projectId, episodeId, { generation: generationId, notice: 'outline-applied' }))
}
