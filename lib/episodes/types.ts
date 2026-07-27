import type { AssetStatus } from '@/lib/assets/types'

export const EPISODE_STATUSES = ['Draft', 'Ready', 'In Review', 'Approved', 'Archived'] as const
export const PRODUCTION_STATUSES = ['Not Started', 'Ready for Production', 'In Production', 'Completed', 'Published'] as const
export const SCENE_STATUSES = ['Draft', 'Ready', 'Continuity Review', 'Approved', 'Sent to Production', 'Archived'] as const
export const SCENE_TIMES = ['Dawn', 'Morning', 'Afternoon', 'Golden Hour', 'Evening', 'Night', 'Continuous', 'Unspecified'] as const
export const EPISODE_TABS = ['overview', 'outline', 'script', 'scenes', 'assets', 'continuity'] as const

export type EpisodeStatus = typeof EPISODE_STATUSES[number]
export type ProductionStatus = typeof PRODUCTION_STATUSES[number]
export type SceneStatus = typeof SCENE_STATUSES[number]
export type SceneTime = typeof SCENE_TIMES[number]
export type EpisodeTab = typeof EPISODE_TABS[number]

export interface EpisodeDto {
  id: string
  projectId: string
  episodeNumber: number
  title: string
  summary: string | null
  outline: string | null
  script: string | null
  cliffhanger: string | null
  targetDurationSeconds: number
  status: EpisodeStatus
  productionStatus: ProductionStatus
  storyboardStatus: string
  storyboardApprovedAt: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface SceneDto {
  id: string
  projectId: string
  episodeId: string
  sceneNumber: number
  position: number
  title: string
  purpose: string | null
  summary: string | null
  script: string | null
  emotionalTone: string | null
  timeOfDay: SceneTime
  targetDurationSeconds: number
  locationId: string | null
  locationName: string | null
  locationCode: string | null
  locationStatus: AssetStatus | null
  locationArchivedAt: string | null
  status: SceneStatus
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  characterCount: number
}

export interface SceneCharacterDto {
  id: string
  projectId: string
  episodeId: string
  sceneId: string
  characterId: string
  characterName: string
  characterCode: string
  characterStatus: AssetStatus
  characterArchivedAt: string | null
  costumeId: string | null
  costumeCharacterId: string | null
  costumeName: string | null
  costumeCode: string | null
  costumeCondition: string | null
  costumeStatus: AssetStatus | null
  costumeArchivedAt: string | null
  roleInScene: string | null
  emotionalState: string | null
  physicalState: string | null
  createdAt: string
  updatedAt: string
}
