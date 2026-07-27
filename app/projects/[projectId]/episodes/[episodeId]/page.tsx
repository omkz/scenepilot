import { notFound } from 'next/navigation'
import { getEpisode } from '@/lib/db/queries/episodes'
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
  searchParams: Promise<{ tab?: string; error?: string }>
}) {
  const [{ projectId, episodeId }, query] = await Promise.all([params, searchParams])
  const [episode, scenes, archivedScenes, assignments, characters, costumes, locations, issues] = await Promise.all([
    getEpisode(projectId, episodeId),
    listScenes(projectId, episodeId),
    listScenes(projectId, episodeId, true),
    listSceneCharacters(projectId, episodeId),
    listCharacters(projectId),
    listCostumes(projectId),
    listLocations(projectId),
    checkEpisodeContinuity(projectId, episodeId),
  ])
  if (!episode) notFound()
  const activeTab = EPISODE_TABS.includes(query.tab as EpisodeTab) ? query.tab as EpisodeTab : 'overview'
  return <EpisodeDetail projectId={projectId} episode={episode} activeTab={activeTab} scenes={scenes} archivedScenes={archivedScenes} assignments={assignments} characters={characters} costumes={costumes} locations={locations} issues={issues} readiness={calculateEpisodeReadiness(episode, scenes, assignments, issues)} error={query.error} />
}
