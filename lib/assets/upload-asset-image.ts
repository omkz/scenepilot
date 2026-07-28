import 'server-only'

import type { AssetType } from '@/lib/assets/types'
import {
  validateAssetImage,
  type AssetImageValidationReason,
} from '@/lib/assets/image-validation'
import {
  createUploadedAssetImage,
  type AssetImageMutationResult,
} from '@/lib/db/queries/asset-images'
import { queueAssetStorageDeletion } from '@/lib/db/queries/asset-storage-deletion-jobs'
import {
  createAssetStorageKey,
  getAssetStorage,
  type AssetStorage,
  type AssetStorageDriver,
} from '@/lib/storage/asset-storage'

interface UploadInput {
  projectId: string
  assetType: AssetType
  assetId: string
  originalFilename: string
  claimedMimeType: string
  bytes: Uint8Array
  sourceUrl: string | null
  sourceNote: string | null
}

function validationReason(reason: AssetImageValidationReason) {
  return reason
}

export async function persistStoredAssetImage(input: UploadInput & {
  storageProvider: string
  storageKey: string
  storageUrl: string
  cleanupStorage: AssetStorage
}): Promise<AssetImageMutationResult> {
  const validated = validateAssetImage({
    bytes: input.bytes,
    claimedMimeType: input.claimedMimeType,
    filename: input.originalFilename,
    sizeBytes: input.bytes.byteLength,
  })
  if (!validated.valid) {
    try {
      await input.cleanupStorage.remove(input.storageKey)
    } catch {
      await queueAssetStorageDeletion(input.storageProvider, input.storageKey).catch(() => undefined)
      console.error('invalid_asset_upload_cleanup_failed', {
        storageProvider: input.storageProvider,
        storageKey: input.storageKey,
      })
    }
    return { ok: false, reason: validationReason(validated.reason) }
  }
  const created = await createUploadedAssetImage({
    projectId: input.projectId,
    assetType: input.assetType,
    assetId: input.assetId,
    storageProvider: input.storageProvider,
    storageKey: input.storageKey,
    storageUrl: input.storageUrl,
    originalFilename: input.originalFilename,
    mimeType: validated.mimeType,
    sizeBytes: input.bytes.byteLength,
    width: validated.width,
    height: validated.height,
    sourceUrl: input.sourceUrl,
    sourceNote: input.sourceNote,
  })
  if (!created.ok) {
    try {
      await input.cleanupStorage.remove(input.storageKey)
    } catch {
      await queueAssetStorageDeletion(input.storageProvider, input.storageKey).catch(() => undefined)
      console.error('rejected_asset_upload_cleanup_failed', {
        storageProvider: input.storageProvider,
        storageKey: input.storageKey,
        reason: created.reason,
      })
    }
  }
  return created
}

export async function storeAssetImageUpload(
  input: UploadInput,
  options?: {
    driver?: AssetStorageDriver
    storage?: AssetStorage
  },
): Promise<AssetImageMutationResult> {
  const validated = validateAssetImage({
    bytes: input.bytes,
    claimedMimeType: input.claimedMimeType,
    filename: input.originalFilename,
    sizeBytes: input.bytes.byteLength,
  })
  if (!validated.valid) return { ok: false, reason: validationReason(validated.reason) }
  let storage: AssetStorage
  try {
    storage = options?.storage || getAssetStorage(options?.driver)
  } catch {
    return { ok: false, reason: 'storage_unavailable' }
  }
  const storageKey = createAssetStorageKey(
    input.projectId,
    input.assetType,
    input.assetId,
    input.originalFilename,
  )
  let stored: Awaited<ReturnType<AssetStorage['upload']>>
  try {
    stored = await storage.upload({
      storageKey,
      filename: input.originalFilename,
      mimeType: validated.mimeType,
      bytes: input.bytes,
    })
  } catch {
    return { ok: false, reason: 'upload_failed' }
  }
  return persistStoredAssetImage({
    ...input,
    claimedMimeType: validated.mimeType,
    storageProvider: stored.provider,
    storageKey: stored.key,
    storageUrl: stored.url,
    cleanupStorage: storage,
  })
}
