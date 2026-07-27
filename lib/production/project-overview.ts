import 'server-only'

import { listEpisodes } from '@/lib/db/queries/episodes'
import { getEpisodeStoryboardReadiness, type EpisodeStoryboardReadiness } from '@/lib/production/readiness'
import type { EpisodeDto } from '@/lib/episodes/types'

export interface ProductionEpisodeItem {
  episode: EpisodeDto
  storyboard: EpisodeStoryboardReadiness
}

export async function getProductionOverview(projectId: string) {
  const episodes = (await listEpisodes(projectId)).filter(episode =>
    ['Ready for Production', 'In Production', 'Completed', 'Published'].includes(episode.productionStatus)
  )
  const items: ProductionEpisodeItem[] = await Promise.all(episodes.map(async episode => ({
    episode,
    storyboard: await getEpisodeStoryboardReadiness(projectId, episode.id),
  })))
  return {
    items,
    approvedEpisodes: items.filter(item => item.episode.storyboardStatus === 'Approved').length,
    approvedScenes: items.filter(item => item.episode.storyboardStatus === 'Approved').reduce((sum, item) => sum + item.storyboard.totalScenes, 0),
    approvedShots: items.reduce((sum, item) => sum + item.storyboard.approvedShots, 0),
    placeholders: items.reduce((sum, item) => sum + item.storyboard.generatedPlaceholders, 0),
    errors: items.reduce((sum, item) => sum + item.storyboard.totalErrors, 0),
    warnings: items.reduce((sum, item) => sum + item.storyboard.totalWarnings, 0),
  }
}
