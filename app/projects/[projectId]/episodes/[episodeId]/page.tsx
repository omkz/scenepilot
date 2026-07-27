import { notFound } from 'next/navigation'
import { getEpisode, listEpisodes } from '@/lib/db/queries/episodes'
import { getAIGeneration, listEpisodeGenerations } from '@/lib/db/queries/ai-generations'
import { AI_TASK_CONFIG, getAIProviderConfigurationStatus } from '@/lib/ai/config'
import { persistedEpisodeOutlineSchema } from '@/lib/ai/schemas/episode-outline'
import { listScenes } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { listCharacters } from '@/lib/db/queries/characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { listLocations } from '@/lib/db/queries/locations'
import { checkEpisodeContinuity } from '@/lib/continuity/check-episode'
import { calculateEpisodeReadiness } from '@/lib/episodes/readiness'
import { EPISODE_TABS, type EpisodeTab } from '@/lib/episodes/types'
import { EpisodeDetail } from '@/components/episodes/episode-detail'

export default async function EpisodeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; episodeId: string }>
  searchParams: Promise<{ tab?: string; error?: string; generation?: string; aiError?: string; notice?: string }>
}) {
  const [{ projectId, episodeId }, query] = await Promise.all([params, searchParams])
  const [episode, allEpisodes, scenes, archivedScenes, assignments, characters, costumes, locations, issues, generations] = await Promise.all([
    getEpisode(projectId, episodeId),
    listEpisodes(projectId),
    listScenes(projectId, episodeId),
    listScenes(projectId, episodeId, true),
    listSceneCharacters(projectId, episodeId),
    listCharacters(projectId),
    listCostumes(projectId),
    listLocations(projectId),
    checkEpisodeContinuity(projectId, episodeId),
    listEpisodeGenerations(projectId, episodeId),
  ])
  if (!episode) notFound()
  const selectedGeneration = query.generation ? await getAIGeneration(projectId, query.generation) : null
  const scopedGeneration = selectedGeneration?.episodeId === episodeId && selectedGeneration.taskType === 'Episode Outline' ? selectedGeneration : null
  const parsedOutline = scopedGeneration ? persistedEpisodeOutlineSchema.safeParse(scopedGeneration.output) : null
  const approvedCharacters = characters.filter(item => item.approvalStatus === 'Approved')
  const approvedCostumes = costumes.filter(item => item.approvalStatus === 'Approved')
  const approvedLocations = locations.filter(item => item.approvalStatus === 'Approved')
  const providerStatus = getAIProviderConfigurationStatus(AI_TASK_CONFIG.episodeOutline.provider)
  const activeTab = EPISODE_TABS.includes(query.tab as EpisodeTab) ? query.tab as EpisodeTab : 'overview'
  return <EpisodeDetail projectId={projectId} episode={episode} activeTab={activeTab} scenes={scenes} archivedScenes={archivedScenes} assignments={assignments} characters={characters} costumes={costumes} locations={locations} issues={issues} readiness={calculateEpisodeReadiness(episode, scenes, assignments, issues)} error={query.error} aiOutline={{
    context: {
      configured: providerStatus.configured,
      approvedCharacters: approvedCharacters.length,
      approvedCostumes: approvedCostumes.length,
      approvedLocations: approvedLocations.length,
      hasPreviousEpisode: allEpisodes.some(item => item.episodeNumber === episode.episodeNumber - 1),
      targetDurationSeconds: episode.targetDurationSeconds,
      characterCodes: Object.fromEntries(approvedCharacters.map(item => [item.id, item.assetCode])),
      locationCodes: Object.fromEntries(approvedLocations.map(item => [item.id, item.assetCode])),
    },
    generations,
    selectedGeneration: scopedGeneration,
    selectedOutline: parsedOutline?.success ? parsedOutline.data : null,
    aiError: query.aiError,
    notice: query.notice,
  }} />
}
