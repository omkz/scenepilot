import 'server-only'

import { z } from 'zod'
import { ImageAIError } from '@/lib/ai/image/errors'
import {
  getImageGenerationProvider,
  readImageAIConfig,
} from '@/lib/ai/image/image-provider'
import {
  downloadGeneratedConcept,
  GENERATED_IMAGE_MAX_BYTES,
} from '@/lib/ai/image/image-service'
import { resolveImageGenerationReferences } from '@/lib/ai/image/reference-resolver'
import { validateAssetImage } from '@/lib/assets/image-validation'
import type { AssetImageDto } from '@/lib/assets/types'
import { listAssetImages } from '@/lib/db/queries/asset-images'
import {
  processAssetStorageDeletionJobs,
  queueAssetStorageDeletion,
} from '@/lib/db/queries/asset-storage-deletion-jobs'
import { getCharacter } from '@/lib/db/queries/characters'
import { getCostume } from '@/lib/db/queries/costumes'
import { getEpisode } from '@/lib/db/queries/episodes'
import { getLocation } from '@/lib/db/queries/locations'
import { getProjectById } from '@/lib/db/queries/projects'
import { getScene } from '@/lib/db/queries/scenes'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'
import { getShot } from '@/lib/db/queries/shots'
import {
  completeStoryboardImageJob,
  createStoryboardImageJob,
  failStoryboardImageJob,
  markStoryboardImageJobGenerating,
} from '@/lib/db/queries/storyboard-jobs'
import { buildShotPrompt } from '@/lib/production/build-shot-prompt'
import {
  createStoryboardStorageKey,
  getAssetStorage,
  type AssetStorage,
} from '@/lib/storage/asset-storage'

export const STORYBOARD_IMAGE_PROMPT_VERSION = 'storyboard-image-v1'

const inputSchema = z.object({
  projectId: z.uuid(),
  episodeId: z.uuid(),
  shotId: z.uuid(),
})

const renderingInstruction = [
  'Render as a polished cinematic storyboard frame with realistic physical textures,',
  'coherent anatomy, readable faces, controlled exposure, and no text or watermark.',
  'Preserve the supplied Master Reference identities and environment design.',
].join(' ')

interface SelectedReference {
  image: AssetImageDto
  assetType: 'character' | 'costume' | 'location'
  assetId: string
  assetCode: string
}

function masterReference(images: AssetImageDto[]) {
  return images.find(image => image.imageRole === 'Master Reference') || null
}

function safeFailureMessage(error: unknown) {
  if (error instanceof ImageAIError && error.reason === 'generation_timeout') {
    return 'Image generation took too long to complete.'
  }
  return 'Storyboard image generation could not be completed.'
}

async function cleanupStoredImage(storageProvider: string, storageKey: string) {
  try {
    const jobId = await queueAssetStorageDeletion(storageProvider, storageKey)
    await processAssetStorageDeletionJobs([jobId])
  } catch {
    console.error('storyboard_image_cleanup_queue_failed', {
      storageProvider,
      errorCode: 'CLEANUP_QUEUE_FAILED',
    })
  }
}

export async function generateStoryboardImage(rawInput: {
  projectId: string
  episodeId: string
  shotId: string
}) {
  const parsed = inputSchema.safeParse(rawInput)
  if (!parsed.success) {
    throw new ImageAIError('asset_not_found', 'The storyboard shot could not be found.')
  }
  const { projectId, episodeId, shotId } = parsed.data
  const config = readImageAIConfig()
  let storage: AssetStorage
  try {
    storage = getAssetStorage()
  } catch {
    throw new ImageAIError('storage_unavailable', 'Image storage is not configured.')
  }

  const [project, episode, shot] = await Promise.all([
    getProjectById(projectId),
    getEpisode(projectId, episodeId),
    getShot(projectId, episodeId, shotId),
  ])
  if (!project || !episode || !shot) {
    throw new ImageAIError('asset_not_found', 'The storyboard shot could not be found.')
  }
  const scene = await getScene(projectId, episodeId, shot.sceneId)
  if (!scene) {
    throw new ImageAIError('asset_not_found', 'The storyboard scene could not be found.')
  }
  if (!shot.locationId) {
    throw new ImageAIError('storyboard_invalid_assets', 'An approved shot location is required.')
  }

  const [assignments, location] = await Promise.all([
    listShotCharacters(projectId, episodeId, shot.id),
    getLocation(projectId, shot.locationId),
  ])
  if (!location || location.approvalStatus !== 'Approved') {
    throw new ImageAIError('storyboard_invalid_assets', 'The shot location must be active and approved.')
  }

  const locationImages = await listAssetImages(projectId, 'location', location.id)
  const locationMaster = masterReference(locationImages)
  if (!locationMaster) {
    throw new ImageAIError('storyboard_missing_master', 'The shot location needs a Master Reference.')
  }

  const characterContexts = await Promise.all(assignments.map(async assignment => {
    const [character, costume] = await Promise.all([
      getCharacter(projectId, assignment.characterId),
      assignment.costumeId ? getCostume(projectId, assignment.costumeId) : Promise.resolve(null),
    ])
    if (
      !character
      || character.approvalStatus !== 'Approved'
      || assignment.characterStatus !== 'Approved'
    ) {
      throw new ImageAIError('storyboard_invalid_assets', 'Every shot character must be active and approved.')
    }
    if (
      !costume
      || costume.approvalStatus !== 'Approved'
      || costume.characterId !== character.id
      || assignment.costumeStatus !== 'Approved'
    ) {
      throw new ImageAIError(
        'storyboard_invalid_assets',
        'Every shot character needs an approved assigned costume.',
      )
    }
    const [characterImages, costumeImages] = await Promise.all([
      listAssetImages(projectId, 'character', character.id),
      listAssetImages(projectId, 'costume', costume.id),
    ])
    const characterMaster = masterReference(characterImages)
    const costumeMaster = masterReference(costumeImages)
    if (!characterMaster || !costumeMaster) {
      throw new ImageAIError(
        'storyboard_missing_master',
        'Every assigned character and costume needs a Master Reference.',
      )
    }
    return {
      assignment,
      character,
      costume,
      characterMaster,
      costumeMaster,
    }
  }))

  const selectedReferences: SelectedReference[] = characterContexts.length === 1
    ? [
        {
          image: characterContexts[0].characterMaster,
          assetType: 'character',
          assetId: characterContexts[0].character.id,
          assetCode: characterContexts[0].character.assetCode,
        },
        {
          image: characterContexts[0].costumeMaster,
          assetType: 'costume',
          assetId: characterContexts[0].costume.id,
          assetCode: characterContexts[0].costume.assetCode,
        },
        {
          image: locationMaster,
          assetType: 'location',
          assetId: location.id,
          assetCode: location.assetCode,
        },
      ]
    : [
        ...characterContexts.slice(0, 2).map(item => ({
          image: item.characterMaster,
          assetType: 'character' as const,
          assetId: item.character.id,
          assetCode: item.character.assetCode,
        })),
        {
          image: locationMaster,
          assetType: 'location' as const,
          assetId: location.id,
          assetCode: location.assetCode,
        },
      ]

  const referenceImageUrls = await resolveImageGenerationReferences(
    selectedReferences.map(item => item.image),
  )
  if (referenceImageUrls.length !== selectedReferences.length) {
    throw new ImageAIError(
      'storyboard_missing_master',
      'One or more Master References could not be loaded.',
    )
  }

  const prompt = `${buildShotPrompt({
    project,
    scene,
    shot,
    characters: assignments,
    characterAssets: characterContexts.map(item => item.character),
    location,
  })}\n\nRENDERING:\n${renderingInstruction}`
  const inputSnapshot = {
    prompt,
    negativePrompt: shot.negativePrompt,
    orientation: project.orientation,
    referenceImageIds: selectedReferences.map(item => item.image.id),
    referenceAssets: selectedReferences.map(item => ({
      imageId: item.image.id,
      assetType: item.assetType,
      assetId: item.assetId,
      assetCode: item.assetCode,
    })),
    characterIds: assignments.map(item => item.characterId),
    costumeIds: assignments.map(item => item.costumeId).filter((id): id is string => Boolean(id)),
    locationId: location.id,
  }
  const job = await createStoryboardImageJob({
    projectId,
    episodeId,
    sceneId: scene.id,
    shotId: shot.id,
    prompt,
    inputSnapshot,
  })
  if (!job) {
    throw new ImageAIError('persistence_failed', 'The storyboard image job could not be created.')
  }

  let stored: { provider: string; key: string; url: string } | null = null
  try {
    const generating = await markStoryboardImageJobGenerating(
      projectId,
      episodeId,
      scene.id,
      shot.id,
      job.id,
    )
    if (!generating) {
      throw new ImageAIError('persistence_failed', 'The storyboard image job could not start.')
    }
    const provider = getImageGenerationProvider(config)
    const generated = await provider.generateStoryboardImage({
      prompt,
      negativePrompt: shot.negativePrompt,
      referenceImageUrls,
      orientation: project.orientation,
    })
    const image = generated.images[0]
    if (!image) {
      throw new ImageAIError('no_images_returned', 'The provider returned no storyboard image.')
    }
    const bytes = await downloadGeneratedConcept(image)
    const validation = validateAssetImage({
      bytes,
      claimedMimeType: image.mimeType,
      maximumBytes: GENERATED_IMAGE_MAX_BYTES,
      allowMimeTypeMismatch: true,
    })
    if (!validation.valid) {
      throw new ImageAIError('generation_failed', 'The provider returned an invalid storyboard image.')
    }
    const extension = validation.mimeType === 'image/jpeg'
      ? 'jpg'
      : validation.mimeType.split('/')[1]
    const storageKey = createStoryboardStorageKey(
      projectId,
      episodeId,
      scene.id,
      shot.id,
      `storyboard.${extension}`,
    )
    let uploaded: Awaited<ReturnType<AssetStorage['upload']>>
    try {
      uploaded = await storage.upload({
        storageKey,
        filename: `storyboard.${extension}`,
        mimeType: validation.mimeType,
        bytes,
      })
    } catch {
      throw new ImageAIError('storage_upload_failed', 'The storyboard image could not be stored.')
    }
    stored = uploaded
    const output = {
      kind: 'Storyboard Image',
      storageProvider: uploaded.provider,
      storageKey: uploaded.key,
      storageUrl: uploaded.url,
      mimeType: validation.mimeType,
      sizeBytes: bytes.byteLength,
      width: image.width ?? validation.width,
      height: image.height ?? validation.height,
      generationProvider: generated.provider,
      generationModel: generated.model,
      generationPromptVersion: STORYBOARD_IMAGE_PROMPT_VERSION,
      durationMs: generated.durationMs,
    }
    const completed = await completeStoryboardImageJob(
      projectId,
      episodeId,
      scene.id,
      shot.id,
      job.id,
      output,
    )
    if (!completed) {
      throw new ImageAIError('persistence_failed', 'The storyboard image could not be saved.')
    }
    console.info('storyboard_image_generated', {
      projectId,
      episodeId,
      sceneId: scene.id,
      shotId: shot.id,
      jobId: job.id,
      provider: generated.provider,
      model: generated.model,
      durationMs: generated.durationMs,
      referenceImageCount: referenceImageUrls.length,
    })
    return completed
  } catch (error) {
    if (stored) await cleanupStoredImage(stored.provider, stored.key)
    try {
      await failStoryboardImageJob(
        projectId,
        episodeId,
        scene.id,
        shot.id,
        job.id,
        safeFailureMessage(error),
      )
    } catch {
      console.error('storyboard_image_failure_state_update_failed', {
        projectId,
        episodeId,
        sceneId: scene.id,
        shotId: shot.id,
        jobId: job.id,
        errorCode: 'FAILURE_STATE_UPDATE_FAILED',
      })
    }
    if (error instanceof ImageAIError) throw error
    throw new ImageAIError(
      'generation_failed',
      'Storyboard image generation could not be completed.',
    )
  }
}
