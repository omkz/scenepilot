import type { ContinuityIssue } from '@/lib/continuity/types'
import type { EpisodeDto, SceneCharacterDto, SceneDto } from '@/lib/episodes/types'

export interface EpisodeReadiness {
  score: number
  blockingIssues: string[]
  warnings: number
  readyForProduction: boolean
  totalSceneDuration: number
}

export function calculateEpisodeReadiness(
  episode: EpisodeDto,
  scenes: SceneDto[],
  assignments: SceneCharacterDto[],
  issues: ContinuityIssue[],
): EpisodeReadiness {
  const blockingIssues: string[] = []
  if (scenes.length === 0) blockingIssues.push('Add at least one scene')
  if (scenes.some(scene => !scene.locationId)) blockingIssues.push('Assign a location to every scene')
  if (scenes.some(scene => !assignments.some(item => item.sceneId === scene.id))) blockingIssues.push('Assign a character to every scene')
  if (assignments.some(item => !item.costumeId)) blockingIssues.push('Choose a costume for every assigned character')
  if (issues.some(item => item.severity === 'Error')) blockingIssues.push('Resolve continuity errors')
  if (!['Ready', 'Approved'].includes(episode.status)) blockingIssues.push('Set episode status to Ready or Approved')

  const totalSceneDuration = scenes.reduce((sum, scene) => sum + scene.targetDurationSeconds, 0)
  if (scenes.length > 0 && (totalSceneDuration < episode.targetDurationSeconds * 0.7 || totalSceneDuration > episode.targetDurationSeconds * 1.1)) {
    blockingIssues.push('Bring scene duration closer to the episode target')
  }

  const uniqueBlockers = [...new Set(blockingIssues)]
  const warnings = issues.filter(item => item.severity === 'Warning').length
  return {
    score: Math.max(0, 100 - uniqueBlockers.length * 15 - warnings * 3),
    blockingIssues: uniqueBlockers,
    warnings,
    readyForProduction: uniqueBlockers.length === 0,
    totalSceneDuration,
  }
}
