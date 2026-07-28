import type {
  AssetImageDto,
  AssetType,
  CharacterDto,
  CostumeDto,
  LocationDto,
} from '@/lib/assets/types'
import type { ProjectDto } from '@/lib/projects/types'

export type AssetConceptType = AssetType

export interface GenerateAssetConceptsInput {
  projectId: string
  assetType: AssetConceptType
  assetId: string
  candidateCount?: number
}

export interface GeneratedConceptImage {
  bytes?: Uint8Array
  url?: string
  mimeType: string
  width?: number | null
  height?: number | null
}

export interface ImageGenerationResult {
  images: GeneratedConceptImage[]
  provider: string
  model: string
  durationMs: number
}

export interface ImageGenerationProvider {
  readonly id: string
  readonly model: string
  generateAssetConcepts(input: {
    assetType: AssetConceptType
    prompt: string
    referenceImageUrls: string[]
    candidateCount: number
  }): Promise<ImageGenerationResult>
  generateStoryboardImage(input: {
    prompt: string
    negativePrompt?: string | null
    referenceImageUrls: string[]
    orientation: ProjectDto['orientation']
  }): Promise<ImageGenerationResult>
}

export interface AssetConceptContext {
  assetType: AssetConceptType
  character?: CharacterDto
  costume?: CostumeDto
  linkedCharacter?: CharacterDto
  location?: LocationDto
  assetImages: AssetImageDto[]
  linkedCharacterImages?: AssetImageDto[]
}
