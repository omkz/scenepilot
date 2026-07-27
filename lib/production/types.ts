import type { AssetStatus } from '@/lib/assets/types'

export const SHOT_STATUSES = ['Draft', 'Ready', 'Queued', 'Generating', 'Generated', 'Failed', 'Archived'] as const
export const SHOT_APPROVAL_STATUSES = ['Draft', 'Pending', 'Approved', 'Rejected', 'Archived'] as const
export const STORYBOARD_STATUSES = ['Not Started', 'In Progress', 'Ready for Review', 'Approved', 'Rejected'] as const
export const SHOT_TYPES = ['Establishing', 'Extreme Wide', 'Wide', 'Full', 'Medium Wide', 'Medium', 'Medium Close-Up', 'Close-Up', 'Extreme Close-Up', 'Over-the-Shoulder', 'Point of View', 'Insert', 'Cutaway', 'Two Shot', 'Group Shot', 'Custom'] as const
export const CAMERA_ANGLES = ['Eye Level', 'High Angle', 'Low Angle', 'Dutch Angle', "Bird's-Eye", "Worm's-Eye", 'Overhead', 'Shoulder Level', 'Custom'] as const
export const CAMERA_MOVEMENTS = ['Static', 'Pan', 'Tilt', 'Dolly In', 'Dolly Out', 'Tracking', 'Push In', 'Pull Out', 'Crane', 'Handheld', 'Orbit', 'Zoom', 'Custom'] as const
export const LENSES = ['14mm', '18mm', '24mm', '28mm', '35mm', '50mm', '85mm', '100mm', 'Anamorphic', 'Unspecified', 'Custom'] as const
export const SHOT_TIMES = ['Dawn', 'Morning', 'Afternoon', 'Golden Hour', 'Evening', 'Night', 'Continuous', 'Unspecified'] as const
export const SCREEN_POSITIONS = ['Far Left', 'Left', 'Center Left', 'Center', 'Center Right', 'Right', 'Far Right', 'Background', 'Foreground', 'Custom'] as const

export type ShotStatus = typeof SHOT_STATUSES[number]
export type ShotApprovalStatus = typeof SHOT_APPROVAL_STATUSES[number]
export type StoryboardStatus = typeof STORYBOARD_STATUSES[number]

export interface ShotDto {
  id: string
  projectId: string
  episodeId: string
  sceneId: string
  shotNumber: number
  position: number
  title: string
  description: string | null
  shotType: string
  cameraAngle: string
  cameraMovement: string
  lens: string
  composition: string | null
  action: string | null
  dialogueExcerpt: string | null
  emotionalIntent: string | null
  targetDurationSeconds: number
  locationId: string | null
  locationName: string | null
  locationCode: string | null
  locationStatus: AssetStatus | null
  locationArchivedAt: string | null
  timeOfDay: string
  lightingNotes: string | null
  generationPrompt: string | null
  negativePrompt: string | null
  status: ShotStatus
  approvalStatus: ShotApprovalStatus
  compositionLocked: boolean
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface ShotCharacterDto {
  id: string
  projectId: string
  episodeId: string
  sceneId: string
  shotId: string
  characterId: string
  characterName: string
  characterCode: string
  characterStatus: AssetStatus
  characterArchivedAt: string | null
  costumeId: string | null
  costumeCharacterId: string | null
  costumeName: string | null
  costumeCode: string | null
  costumeStatus: AssetStatus | null
  costumeArchivedAt: string | null
  screenPosition: string | null
  pose: string | null
  expression: string | null
  action: string | null
  gazeDirection: string | null
  physicalState: string | null
  createdAt: string
  updatedAt: string
}

export interface StoryboardJobDto {
  id: string
  projectId: string
  episodeId: string
  sceneId: string
  shotId: string
  jobType: string
  status: string
  progress: number
  inputSnapshot: unknown
  outputPlaceholder: unknown
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}
