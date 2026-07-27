import 'server-only'

import { listEpisodes } from '@/lib/db/queries/episodes'
import { listScenes } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { checkEpisodeContinuity } from '@/lib/continuity/check-episode'
import { calculateEpisodeReadiness } from '@/lib/episodes/readiness'
import type { EpisodeDto } from '@/lib/episodes/types'
import { getEpisodeStoryboardReadiness } from '@/lib/production/readiness'

export interface EpisodeOverviewItem {
  episode: EpisodeDto
  sceneCount: number
  errorCount: number
  warningCount: number
  readinessScore: number
  readyForProduction: boolean
  totalShots: number
  storyboardErrors: number
  storyboardWarnings: number
  storyboardReady: boolean
}

export interface ProjectEpisodeOverview {
  items: EpisodeOverviewItem[]
  total: number
  draft: number
  ready: number
  inProduction: number
  completed: number
  errors: number
  warnings: number
  storyboardsStarted: number
  storyboardsApproved: number
  storyboardErrors: number
  storyboardWarnings: number
}

export async function getProjectEpisodeOverview(projectId: string): Promise<ProjectEpisodeOverview> {
  const episodes = await listEpisodes(projectId)
  const items = await Promise.all(episodes.map(async episode => {
    const productionEligible = ['Ready for Production', 'In Production', 'Completed', 'Published'].includes(episode.productionStatus)
    const [scenes, assignments, issues, storyboard] = await Promise.all([
      listScenes(projectId, episode.id),
      listSceneCharacters(projectId, episode.id),
      checkEpisodeContinuity(projectId, episode.id),
      productionEligible ? getEpisodeStoryboardReadiness(projectId, episode.id) : null,
    ])
    const readiness = calculateEpisodeReadiness(episode, scenes, assignments, issues)
    return {
      episode,
      sceneCount: scenes.length,
      errorCount: issues.filter(issue => issue.severity === 'Error').length,
      warningCount: issues.filter(issue => issue.severity === 'Warning').length,
      readinessScore: readiness.score,
      readyForProduction: readiness.readyForProduction,
      totalShots: storyboard?.totalShots || 0,
      storyboardErrors: storyboard?.totalErrors || 0,
      storyboardWarnings: storyboard?.totalWarnings || 0,
      storyboardReady: storyboard?.readyForApproval || false,
    }
  }))
  return {
    items,
    total: items.length,
    draft: items.filter(item => ['Draft', 'In Review'].includes(item.episode.status)).length,
    ready: items.filter(item => ['Ready', 'Approved'].includes(item.episode.status) && item.episode.productionStatus === 'Not Started').length,
    inProduction: items.filter(item => ['Ready for Production', 'In Production'].includes(item.episode.productionStatus)).length,
    completed: items.filter(item => ['Completed', 'Published'].includes(item.episode.productionStatus)).length,
    errors: items.reduce((sum, item) => sum + item.errorCount, 0),
    warnings: items.reduce((sum, item) => sum + item.warningCount, 0),
    storyboardsStarted: items.filter(item => item.totalShots > 0).length,
    storyboardsApproved: items.filter(item => item.episode.storyboardStatus === 'Approved').length,
    storyboardErrors: items.reduce((sum, item) => sum + item.storyboardErrors, 0),
    storyboardWarnings: items.reduce((sum, item) => sum + item.storyboardWarnings, 0),
  }
}
