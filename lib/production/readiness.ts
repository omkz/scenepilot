import 'server-only'

import { listScenes } from '@/lib/db/queries/scenes'
import { listShots } from '@/lib/db/queries/shots'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'
import { listStoryboardJobs } from '@/lib/db/queries/storyboard-jobs'
import { checkShot, type ShotIssue } from '@/lib/continuity/check-shot'
import type { SceneDto } from '@/lib/episodes/types'
import type { ShotCharacterDto, ShotDto } from '@/lib/production/types'

export interface ShotReadiness {
  score: number
  errors: number
  warnings: number
  ready: boolean
}

export interface SceneStoryboardReadiness {
  scene: SceneDto
  shots: ShotDto[]
  issues: ShotIssue[]
  totalShots: number
  approvedShots: number
  generatedPlaceholders: number
  totalDuration: number
  errors: number
  warnings: number
  score: number
  ready: boolean
}

export interface EpisodeStoryboardReadiness {
  scenes: SceneStoryboardReadiness[]
  shots: ShotDto[]
  assignments: ShotCharacterDto[]
  totalScenes: number
  scenesWithShots: number
  totalShots: number
  approvedShots: number
  generatedPlaceholders: number
  totalErrors: number
  totalWarnings: number
  score: number
  readyForApproval: boolean
}

export function calculateShotReadiness(shot: ShotDto, assignments: ShotCharacterDto[], issues: ShotIssue[]): ShotReadiness {
  const errors = issues.filter(item => item.severity === 'Error').length
  const warnings = issues.filter(item => item.severity === 'Warning').length
  const complete = Boolean(
    shot.title.trim() &&
    (shot.description?.trim() || shot.action?.trim()) &&
    shot.shotType &&
    shot.cameraAngle &&
    shot.targetDurationSeconds > 0 &&
    shot.locationId &&
    assignments.every(item => item.costumeId),
  )
  const ready = complete && errors === 0 && shot.approvalStatus === 'Approved'
  return { score: Math.max(0, 100 - (complete ? 0 : 30) - errors * 25 - warnings * 5 - (shot.approvalStatus === 'Approved' ? 0 : 15)), errors, warnings, ready }
}

export async function getEpisodeStoryboardReadiness(projectId: string, episodeId: string): Promise<EpisodeStoryboardReadiness> {
  const [scenes, shots, assignments, jobs] = await Promise.all([
    listScenes(projectId, episodeId),
    listShots(projectId, episodeId),
    listShotCharacters(projectId, episodeId),
    listStoryboardJobs(projectId, episodeId),
  ])
  const issuesByShot = new Map<string, ShotIssue[]>()
  await Promise.all(shots.map(async shot => issuesByShot.set(shot.id, await checkShot(projectId, episodeId, shot.id))))
  const sceneResults = scenes.map(scene => {
    const sceneShots = shots.filter(shot => shot.sceneId === scene.id)
    const issues = sceneShots.flatMap(shot => issuesByShot.get(shot.id) || [])
    const errors = issues.filter(item => item.severity === 'Error').length
    const warnings = issues.filter(item => item.severity === 'Warning').length
    const totalDuration = sceneShots.reduce((sum, shot) => sum + shot.targetDurationSeconds, 0)
    const approvedShots = sceneShots.filter(shot => shot.approvalStatus === 'Approved').length
    const durationReady = totalDuration >= scene.targetDurationSeconds * 0.7 && totalDuration <= scene.targetDurationSeconds * 1.1
    const ready = sceneShots.length > 0 && approvedShots === sceneShots.length && errors === 0 && durationReady &&
      sceneShots.every(shot => assignments.filter(item => item.shotId === shot.id).every(item => item.costumeId))
    return {
      scene,
      shots: sceneShots,
      issues,
      totalShots: sceneShots.length,
      approvedShots,
      generatedPlaceholders: jobs.filter(job => job.sceneId === scene.id && job.status === 'Completed').length,
      totalDuration,
      errors,
      warnings,
      score: Math.max(0, 100 - (sceneShots.length ? 0 : 40) - errors * 20 - warnings * 4 - (durationReady ? 0 : 20) - (sceneShots.length - approvedShots) * 10),
      ready,
    }
  })
  const totalErrors = sceneResults.reduce((sum, item) => sum + item.errors, 0)
  const totalWarnings = sceneResults.reduce((sum, item) => sum + item.warnings, 0)
  const approvedShots = shots.filter(shot => shot.approvalStatus === 'Approved').length
  const readyForApproval = scenes.length > 0 && sceneResults.every(item => item.ready)
  return {
    scenes: sceneResults,
    shots,
    assignments,
    totalScenes: scenes.length,
    scenesWithShots: sceneResults.filter(item => item.totalShots > 0).length,
    totalShots: shots.length,
    approvedShots,
    generatedPlaceholders: jobs.filter(job => job.status === 'Completed').length,
    totalErrors,
    totalWarnings,
    score: scenes.length ? Math.round(sceneResults.reduce((sum, item) => sum + item.score, 0) / scenes.length) : 0,
    readyForApproval,
  }
}
