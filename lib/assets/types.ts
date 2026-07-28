export const ASSET_STATUSES = ['Draft', 'Pending', 'Approved', 'Rejected', 'Archived'] as const
export const NARRATIVE_ROLES = [
  'Protagonist',
  'Antagonist',
  'Supporting',
  'Recurring',
  'Mentor',
  'Rival',
  'Love Interest',
  'Other',
] as const
export const COSTUME_CATEGORIES = [
  'Default',
  'Casual',
  'Formal',
  'Work',
  'Ceremonial',
  'Action',
  'Disguise',
  'Sleepwear',
  'Other',
] as const
export const COSTUME_CONDITIONS = [
  'Clean',
  'Worn',
  'Damaged',
  'Wet',
  'Dirty',
  'Bloodstained',
  'Burned',
  'Other',
] as const
export const LOCATION_TYPES = ['Interior', 'Exterior', 'Vehicle', 'Virtual', 'Hybrid', 'Other'] as const
export const LOCATION_TIMES = [
  'Dawn',
  'Morning',
  'Afternoon',
  'Golden Hour',
  'Evening',
  'Night',
  'Variable',
] as const
export const LOCATION_LIGHTING = [
  'Natural',
  'Soft Cinematic',
  'Low-key Dramatic',
  'High Contrast',
  'Candlelit',
  'Neon',
  'Overcast',
  'Custom',
] as const
export const ASSET_IMAGE_ROLES = [
  'Inspiration',
  'Generated Concept',
  'Master Reference',
  'Alternate View',
] as const
export const ASSET_IMAGE_SOURCE_TYPES = ['Upload', 'AI Generated'] as const
export const ASSET_TYPES = ['character', 'costume', 'location'] as const

export type AssetStatus = typeof ASSET_STATUSES[number]
export type NarrativeRole = typeof NARRATIVE_ROLES[number]
export type CostumeCategory = typeof COSTUME_CATEGORIES[number]
export type CostumeCondition = typeof COSTUME_CONDITIONS[number]
export type LocationType = typeof LOCATION_TYPES[number]
export type LocationTime = typeof LOCATION_TIMES[number]
export type LocationLighting = typeof LOCATION_LIGHTING[number]
export type AssetImageRole = typeof ASSET_IMAGE_ROLES[number]
export type AssetImageSourceType = typeof ASSET_IMAGE_SOURCE_TYPES[number]
export type AssetType = typeof ASSET_TYPES[number]

export interface AssetStorageStatusDto {
  configured: boolean
  driver: 'local' | 'vercel-blob'
  uploadMode: 'server' | 'client'
}

export interface ImageAIStatusDto {
  configured: boolean
  provider: 'qwen'
  model: string
  candidateCount: number
}

interface AssetDto {
  id: string
  projectId: string
  assetCode: string
  name: string
  approvalStatus: AssetStatus
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface CharacterDto extends AssetDto {
  narrativeRole: NarrativeRole
  age: number | null
  genderPresentation: string | null
  personality: string | null
  motivation: string | null
  visualDirection: string | null
  appearance: string | null
  distinguishingFeatures: string | null
  facialIdentityLocked: boolean
  skinToneLocked: boolean
  eyeColorLocked: boolean
  hairstyleLocked: boolean
  bodyProportionsLocked: boolean
  distinguishingFeaturesLocked: boolean
  accessoriesLocked: boolean
  costumeCount: number
}

export interface CostumeDto extends AssetDto {
  characterId: string
  characterName: string
  description: string | null
  category: CostumeCategory
  condition: CostumeCondition
  isDefault: boolean
}

export interface LocationDto extends AssetDto {
  description: string | null
  locationType: LocationType
  architectureStyle: string | null
  defaultTimeOfDay: LocationTime
  defaultLighting: LocationLighting
  visualIdentityNotes: string | null
  architectureLocked: boolean
  layoutLocked: boolean
  lightingLocked: boolean
}

export interface AssetImageDto {
  id: string
  projectId: string
  assetType: AssetType
  assetId: string
  imageRole: AssetImageRole
  sourceType: AssetImageSourceType
  storageProvider: string
  storageKey: string
  storageUrl: string
  originalFilename: string | null
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  sourceUrl: string | null
  sourceNote: string | null
  generationProvider: string | null
  generationModel: string | null
  generationPromptVersion: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export type StoryStudioTab = 'characters' | 'costumes' | 'locations' | 'story-bible'

export interface AssetUsage {
  costumes?: number
  scenes?: number
  shots?: number
}

export type AssetDeleteResult =
  | { deleted: true }
  | {
      deleted: false
      reason: 'not-found' | 'in-use'
      usage?: AssetUsage
    }
