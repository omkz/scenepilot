'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ASSET_TYPES, type AssetType } from '@/lib/assets/types'
import {
  IMAGE_AI_USER_MESSAGES,
  normalizeImageAIError,
  type ImageAIErrorReason,
} from '@/lib/ai/image/errors'
import { generateAssetConcepts } from '@/lib/ai/image/image-service'
import {
  deleteAssetImage,
  getAssetImageScopeState,
  listAssetImages,
  reorderAssetImages,
  setAssetImageAsMaster,
  updateAssetImageMetadata,
  type AssetImageMutationReason,
} from '@/lib/db/queries/asset-images'
import { processAssetStorageDeletionJobs } from '@/lib/db/queries/asset-storage-deletion-jobs'
import {
  createAssetStorageKey,
  getAssetStorageStatus,
} from '@/lib/storage/asset-storage'

const scopeSchema = z.object({
  projectId: z.uuid(),
  assetType: z.enum(ASSET_TYPES),
  assetId: z.uuid(),
})
const metadataSchema = z.object({
  sourceUrl: z.preprocess(
    value => value || null,
    z.url({ protocol: /^https?$/ }).max(2000).nullable(),
  ),
  sourceNote: z.preprocess(
    value => value || null,
    z.string().trim().max(500).nullable(),
  ),
})

export type AssetImageActionResult =
  | { ok: true }
  | { ok: false; reason: AssetImageMutationReason }

export type GenerateAssetConceptsActionResult =
  | { ok: true; count: number }
  | { ok: false; reason: ImageAIErrorReason; message: string }

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}/story-studio`)
  revalidatePath(`/projects/${projectId}/overview`)
}

export async function prepareAssetImageUploadAction(input: {
  projectId: string
  assetType: AssetType
  assetId: string
  originalFilename: string
  sourceUrl?: string
  sourceNote?: string
}) {
  const parsed = scopeSchema.extend({
    originalFilename: z.string().min(1).max(255),
    sourceUrl: z.url({ protocol: /^https?$/ }).max(2000).optional(),
    sourceNote: z.string().trim().max(500).optional(),
  }).safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'not_found' } as const
  if (!/\.(jpe?g|png|webp)$/i.test(parsed.data.originalFilename)) {
    return { ok: false, reason: 'unsupported_type' } as const
  }
  const storageStatus = getAssetStorageStatus()
  if (!storageStatus.configured || storageStatus.uploadMode !== 'client') {
    return { ok: false, reason: 'storage_unavailable' } as const
  }
  const scope = await getAssetImageScopeState(
    parsed.data.projectId,
    parsed.data.assetType,
    parsed.data.assetId,
  )
  if (scope.crossProject) return { ok: false, reason: 'cross_project_reference' } as const
  if (!scope.found) return { ok: false, reason: 'not_found' } as const
  if (scope.archived) return { ok: false, reason: 'asset_archived' } as const
  const images = await listAssetImages(
    parsed.data.projectId,
    parsed.data.assetType,
    parsed.data.assetId,
  )
  if (images.filter(image => image.imageRole === 'Inspiration').length >= 5) {
    return { ok: false, reason: 'image_limit_reached' } as const
  }
  const pathname = createAssetStorageKey(
    parsed.data.projectId,
    parsed.data.assetType,
    parsed.data.assetId,
    parsed.data.originalFilename,
  )
  return {
    ok: true,
    pathname,
    clientPayload: JSON.stringify({
      ...parsed.data,
      pathname,
    }),
  } as const
}

export async function listAssetImagesAction(
  projectId: string,
  assetType: AssetType,
  assetId: string,
) {
  const scope = scopeSchema.safeParse({ projectId, assetType, assetId })
  if (!scope.success) return []
  return listAssetImages(projectId, assetType, assetId)
}

export async function setAssetImageAsMasterAction(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
): Promise<AssetImageActionResult> {
  const parsed = scopeSchema.safeParse({ projectId, assetType, assetId })
  if (!parsed.success || !z.uuid().safeParse(imageId).success) {
    return { ok: false, reason: 'not_found' }
  }
  const result = await setAssetImageAsMaster(projectId, assetType, assetId, imageId)
  if (result.ok) refresh(projectId)
  return result.ok ? { ok: true } : result
}

export async function updateAssetImageMetadataAction(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
  formData: FormData,
): Promise<AssetImageActionResult> {
  const scope = scopeSchema.safeParse({ projectId, assetType, assetId })
  const metadata = metadataSchema.safeParse({
    sourceUrl: formData.get('sourceUrl'),
    sourceNote: formData.get('sourceNote'),
  })
  if (!scope.success || !metadata.success || !z.uuid().safeParse(imageId).success) {
    return { ok: false, reason: 'not_found' }
  }
  const result = await updateAssetImageMetadata(
    projectId,
    assetType,
    assetId,
    imageId,
    metadata.data,
  )
  if (result.ok) refresh(projectId)
  return result.ok ? { ok: true } : result
}

export async function deleteAssetImageAction(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
): Promise<AssetImageActionResult> {
  const scope = scopeSchema.safeParse({ projectId, assetType, assetId })
  if (!scope.success || !z.uuid().safeParse(imageId).success) {
    return { ok: false, reason: 'not_found' }
  }
  const result = await deleteAssetImage(projectId, assetType, assetId, imageId)
  if (!result.ok) return result
  refresh(projectId)
  await processAssetStorageDeletionJobs([result.value.cleanupJobId])
  return { ok: true }
}

export async function reorderAssetImagesAction(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  orderedImageIds: string[],
): Promise<AssetImageActionResult> {
  const scope = scopeSchema.safeParse({ projectId, assetType, assetId })
  if (!scope.success) return { ok: false, reason: 'not_found' }
  const reordered = await reorderAssetImages(projectId, assetType, assetId, orderedImageIds)
  if (!reordered) return { ok: false, reason: 'not_found' }
  refresh(projectId)
  return { ok: true }
}

export async function generateAssetConceptsAction(
  projectId: string,
  assetType: AssetType,
  assetId: string,
): Promise<GenerateAssetConceptsActionResult> {
  const scope = scopeSchema.safeParse({ projectId, assetType, assetId })
  if (!scope.success) {
    return {
      ok: false,
      reason: 'asset_not_found',
      message: IMAGE_AI_USER_MESSAGES.asset_not_found,
    }
  }
  try {
    const images = await generateAssetConcepts({ projectId, assetType, assetId })
    refresh(projectId)
    return { ok: true, count: images.length }
  } catch (error) {
    const normalized = normalizeImageAIError(error)
    return {
      ok: false,
      reason: normalized.reason,
      message: IMAGE_AI_USER_MESSAGES[normalized.reason],
    }
  }
}
