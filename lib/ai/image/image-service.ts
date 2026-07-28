import 'server-only'

import { z } from 'zod'
import { ImageAIError, normalizeImageAIError } from '@/lib/ai/image/errors'
import {
  getImageGenerationProvider,
  readImageAIConfig,
} from '@/lib/ai/image/image-provider'
import {
  ASSET_CONCEPT_PROMPT_VERSION,
  buildCharacterConceptPrompt,
  buildCostumeConceptPrompt,
  buildLocationConceptPrompt,
} from '@/lib/ai/image/prompts'
import {
  selectCharacterConceptReferences,
  selectCostumeConceptReferences,
  selectLocationConceptReferences,
} from '@/lib/ai/image/references'
import { resolveImageGenerationReferences } from '@/lib/ai/image/reference-resolver'
import type {
  AssetConceptContext,
  GenerateAssetConceptsInput,
  GeneratedConceptImage,
  ImageGenerationProvider,
} from '@/lib/ai/image/types'
import { validateAssetImage } from '@/lib/assets/image-validation'
import type { AssetImageDto } from '@/lib/assets/types'
import { createGeneratedAssetImages, listAssetImages } from '@/lib/db/queries/asset-images'
import {
  processAssetStorageDeletionJobs,
  queueAssetStorageDeletion,
} from '@/lib/db/queries/asset-storage-deletion-jobs'
import { getCharacter } from '@/lib/db/queries/characters'
import { getCostume } from '@/lib/db/queries/costumes'
import { getLocation } from '@/lib/db/queries/locations'
import { getProjectById } from '@/lib/db/queries/projects'
import {
  createAssetStorageKey,
  getAssetStorage,
  type AssetStorage,
} from '@/lib/storage/asset-storage'

const inputSchema = z.object({
  projectId: z.uuid(),
  assetType: z.enum(['character', 'costume', 'location']),
  assetId: z.uuid(),
  candidateCount: z.number().int().min(1).max(6).optional(),
})

export interface AssetConceptServiceDependencies {
  provider?: ImageGenerationProvider
  storage?: AssetStorage
  loadContext?: (input: GenerateAssetConceptsInput) => Promise<AssetConceptContext | null>
  persist?: typeof createGeneratedAssetImages
  scheduleCleanup?: typeof queueAssetStorageDeletion
  processCleanup?: typeof processAssetStorageDeletionJobs
  download?: (image: GeneratedConceptImage) => Promise<Uint8Array>
  resolveReferences?: typeof resolveImageGenerationReferences
}

function isAllowedProviderUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && (url.hostname === 'aliyuncs.com' || url.hostname.endsWith('.aliyuncs.com'))
  } catch {
    return false
  }
}

export async function downloadGeneratedConcept(
  image: GeneratedConceptImage,
  fetcher: typeof fetch = fetch,
) {
  if (image.bytes) return image.bytes
  if (!image.url || !isAllowedProviderUrl(image.url)) {
    throw new ImageAIError('generation_failed', 'The provider returned an unsafe image URL.')
  }
  const response = await fetcher(image.url, {
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new ImageAIError('generation_failed', 'The provider image could not be downloaded.')
  }
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > 10 * 1024 * 1024) {
    throw new ImageAIError('generation_failed', 'The provider image is too large.')
  }
  return new Uint8Array(await response.arrayBuffer())
}

async function defaultLoadContext(input: GenerateAssetConceptsInput) {
  const project = await getProjectById(input.projectId)
  if (!project) return null
  if (input.assetType === 'character') {
    const character = await getCharacter(input.projectId, input.assetId, true)
    if (!character) return null
    return {
      assetType: input.assetType,
      character,
      assetImages: await listAssetImages(input.projectId, 'character', input.assetId),
    } satisfies AssetConceptContext
  }
  if (input.assetType === 'costume') {
    const costume = await getCostume(input.projectId, input.assetId, true)
    if (!costume) return null
    const linkedCharacter = await getCharacter(input.projectId, costume.characterId, true)
    if (!linkedCharacter) return null
    const [assetImages, linkedCharacterImages] = await Promise.all([
      listAssetImages(input.projectId, 'costume', input.assetId),
      listAssetImages(input.projectId, 'character', costume.characterId),
    ])
    return {
      assetType: input.assetType,
      costume,
      linkedCharacter,
      assetImages,
      linkedCharacterImages,
    } satisfies AssetConceptContext
  }
  const location = await getLocation(input.projectId, input.assetId, true)
  if (!location) return null
  return {
    assetType: input.assetType,
    location,
    assetImages: await listAssetImages(input.projectId, 'location', input.assetId),
  } satisfies AssetConceptContext
}

function buildRequest(context: AssetConceptContext) {
  if (context.assetType === 'character' && context.character) {
    return {
      prompt: buildCharacterConceptPrompt(context.character),
      references: selectCharacterConceptReferences(context.assetImages, context.character.id, 3),
      archived: Boolean(context.character.archivedAt),
    }
  }
  if (context.assetType === 'costume' && context.costume && context.linkedCharacter) {
    return {
      prompt: buildCostumeConceptPrompt(context.costume, context.linkedCharacter),
      references: selectCostumeConceptReferences({
        costumeImages: context.assetImages,
        costumeId: context.costume.id,
        characterImages: context.linkedCharacterImages || [],
        characterId: context.linkedCharacter.id,
        limit: 3,
      }),
      archived: Boolean(context.costume.archivedAt) || Boolean(context.linkedCharacter.archivedAt),
    }
  }
  if (context.assetType === 'location' && context.location) {
    return {
      prompt: buildLocationConceptPrompt(context.location),
      references: selectLocationConceptReferences(context.assetImages, context.location.id, 3),
      archived: Boolean(context.location.archivedAt),
    }
  }
  throw new ImageAIError('asset_not_found', 'The project asset could not be loaded.')
}

async function cleanupUploads(
  uploaded: Array<{ provider: string; key: string }>,
  scheduleCleanup: typeof queueAssetStorageDeletion,
  processCleanup: typeof processAssetStorageDeletionJobs,
) {
  const jobIds: string[] = []
  for (const item of uploaded) {
    try {
      jobIds.push(await scheduleCleanup(item.provider, item.key))
    } catch {
      // The primary operation is already failing; never expose cleanup internals.
    }
  }
  if (jobIds.length) await processCleanup(jobIds)
}

export async function generateAssetConcepts(
  rawInput: GenerateAssetConceptsInput,
  dependencies: AssetConceptServiceDependencies = {},
): Promise<AssetImageDto[]> {
  const parsed = inputSchema.safeParse(rawInput)
  if (!parsed.success) throw new ImageAIError('invalid_candidate_count', 'Invalid concept request.')
  const config = readImageAIConfig()
  const candidateCount = parsed.data.candidateCount ?? config.candidateCount
  if (candidateCount < 1 || candidateCount > 6) {
    throw new ImageAIError('invalid_candidate_count', 'Image candidate count must be between 1 and 6.')
  }
  const loadContext = dependencies.loadContext || defaultLoadContext
  const context = await loadContext(parsed.data)
  if (!context) throw new ImageAIError('asset_not_found', 'The project asset could not be found.')
  const request = buildRequest(context)
  if (request.archived) throw new ImageAIError('asset_archived', 'Archived assets cannot generate concepts.')

  const provider = dependencies.provider || getImageGenerationProvider(config)
  let storage: AssetStorage
  try {
    storage = dependencies.storage || getAssetStorage()
  } catch {
    throw new ImageAIError('storage_unavailable', 'Image storage is not configured.')
  }
  const persist = dependencies.persist || createGeneratedAssetImages
  const scheduleCleanup = dependencies.scheduleCleanup || queueAssetStorageDeletion
  const processCleanup = dependencies.processCleanup || processAssetStorageDeletionJobs
  const download = dependencies.download || downloadGeneratedConcept
  const resolveReferences = dependencies.resolveReferences || resolveImageGenerationReferences
  const uploaded: Array<{
    provider: string
    key: string
    url: string
    mimeType: string
    sizeBytes: number
    width: number | null
    height: number | null
  }> = []

  try {
    const referenceImages = await resolveReferences(request.references)
    const generated = await provider.generateAssetConcepts({
      assetType: parsed.data.assetType,
      prompt: request.prompt,
      referenceImageUrls: referenceImages,
      candidateCount,
    })
    if (!generated.images.length) {
      throw new ImageAIError('no_images_returned', 'The provider returned no images.')
    }
    for (const [index, image] of generated.images.slice(0, candidateCount).entries()) {
      const bytes = await download(image)
      const validation = validateAssetImage({
        bytes,
        claimedMimeType: image.mimeType,
      })
      if (!validation.valid) {
        throw new ImageAIError('generation_failed', 'The provider returned an invalid image.')
      }
      const extension = validation.mimeType === 'image/jpeg'
        ? 'jpg'
        : validation.mimeType.split('/')[1]
      const key = createAssetStorageKey(
        parsed.data.projectId,
        parsed.data.assetType,
        parsed.data.assetId,
        `concept-${index + 1}.${extension}`,
      )
      let stored: Awaited<ReturnType<AssetStorage['upload']>>
      try {
        stored = await storage.upload({
          storageKey: key,
          filename: `concept-${index + 1}.${extension}`,
          mimeType: validation.mimeType,
          bytes,
        })
      } catch {
        throw new ImageAIError('storage_upload_failed', 'Generated concepts could not be stored.')
      }
      uploaded.push({
        provider: stored.provider,
        key: stored.key,
        url: stored.url,
        mimeType: validation.mimeType,
        sizeBytes: bytes.byteLength,
        width: image.width ?? validation.width,
        height: image.height ?? validation.height,
      })
    }
    const result = await persist({
      projectId: parsed.data.projectId,
      assetType: parsed.data.assetType,
      assetId: parsed.data.assetId,
      provider: provider.id,
      model: provider.model,
      promptVersion: ASSET_CONCEPT_PROMPT_VERSION,
      images: uploaded.map(item => ({
        storageProvider: item.provider,
        storageKey: item.key,
        storageUrl: item.url,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        width: item.width,
        height: item.height,
      })),
    })
    if (!result.ok) {
      throw new ImageAIError('persistence_failed', 'Generated concepts could not be saved.')
    }
    console.info('asset_concepts_generated', {
      projectId: parsed.data.projectId,
      assetType: parsed.data.assetType,
      assetId: parsed.data.assetId,
      provider: provider.id,
      model: provider.model,
      candidateCount: result.value.length,
    })
    return result.value
  } catch (error) {
    if (uploaded.length) {
      await cleanupUploads(uploaded, scheduleCleanup, processCleanup).catch(() => undefined)
    }
    throw normalizeImageAIError(error)
  }
}
