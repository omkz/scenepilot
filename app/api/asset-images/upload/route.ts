import type { HandleUploadBody } from '@vercel/blob/client'
import { handleUpload } from '@vercel/blob/client'
import { z } from 'zod'
import { ASSET_TYPES } from '@/lib/assets/types'
import {
  ASSET_IMAGE_ALLOWED_MIME_TYPES,
  ASSET_IMAGE_MAX_BYTES,
} from '@/lib/assets/image-validation'
import { persistStoredAssetImage } from '@/lib/assets/upload-asset-image'
import {
  getAssetImageScopeState,
  listAssetImages,
} from '@/lib/db/queries/asset-images'
import { queueAssetStorageDeletion } from '@/lib/db/queries/asset-storage-deletion-jobs'
import { getAssetStorage, getAssetStorageStatus } from '@/lib/storage/asset-storage'

const payloadSchema = z.object({
  projectId: z.uuid(),
  assetType: z.enum(ASSET_TYPES),
  assetId: z.uuid(),
  originalFilename: z.string().min(1).max(255),
  sourceUrl: z.url({ protocol: /^https?$/ }).max(2000).optional(),
  sourceNote: z.string().trim().max(500).optional(),
  pathname: z.string().min(1).max(1000),
})

async function removeRejectedBlob(pathname: string) {
  try {
    await getAssetStorage('vercel-blob').remove(pathname)
  } catch {
    await queueAssetStorageDeletion('vercel-blob', pathname).catch(() => undefined)
    console.error('asset_image_rejected_blob_cleanup_failed', {
      storageProvider: 'vercel-blob',
      pathname,
    })
  }
}

export async function POST(request: Request) {
  const storageStatus = getAssetStorageStatus()
  if (
    storageStatus.driver !== 'vercel-blob'
    || !storageStatus.configured
    || !process.env.BLOB_READ_WRITE_TOKEN
  ) {
    return Response.json({ error: 'storage_unavailable' }, { status: 503 })
  }
  try {
    const body = await request.json() as HandleUploadBody
    const response = await handleUpload({
      request,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsedPayload = payloadSchema.safeParse(
          clientPayload ? JSON.parse(clientPayload) : null,
        )
        if (!parsedPayload.success || parsedPayload.data.pathname !== pathname) {
          throw new Error('INVALID_UPLOAD_SCOPE')
        }
        const expectedPrefix = `asset-images/${parsedPayload.data.projectId}/${parsedPayload.data.assetType}/${parsedPayload.data.assetId}/`
        const filename = pathname.slice(expectedPrefix.length)
        if (
          !pathname.startsWith(expectedPrefix)
          || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)
        ) {
          throw new Error('INVALID_STORAGE_KEY')
        }
        const scope = await getAssetImageScopeState(
          parsedPayload.data.projectId,
          parsedPayload.data.assetType,
          parsedPayload.data.assetId,
        )
        if (!scope.found || scope.archived || scope.crossProject) {
          throw new Error('INVALID_ASSET_SCOPE')
        }
        const images = await listAssetImages(
          parsedPayload.data.projectId,
          parsedPayload.data.assetType,
          parsedPayload.data.assetId,
        )
        if (images.filter(image => image.imageRole === 'Inspiration').length >= 5) {
          throw new Error('IMAGE_LIMIT_REACHED')
        }
        return {
          allowedContentTypes: [...ASSET_IMAGE_ALLOWED_MIME_TYPES],
          maximumSizeInBytes: ASSET_IMAGE_MAX_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify(parsedPayload.data),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const parsedPayload = payloadSchema.safeParse(
          tokenPayload ? JSON.parse(tokenPayload) : null,
        )
        if (!parsedPayload.success || parsedPayload.data.pathname !== blob.pathname) {
          await removeRejectedBlob(blob.pathname)
          return
        }
        const fileResponse = await fetch(blob.url, { cache: 'no-store' })
        if (!fileResponse.ok) {
          await removeRejectedBlob(blob.pathname)
          return
        }
        const bytes = new Uint8Array(await fileResponse.arrayBuffer())
        const storage = getAssetStorage('vercel-blob')
        await persistStoredAssetImage({
          projectId: parsedPayload.data.projectId,
          assetType: parsedPayload.data.assetType,
          assetId: parsedPayload.data.assetId,
          claimedMimeType: blob.contentType,
          bytes,
          storageProvider: 'vercel-blob',
          storageKey: blob.pathname,
          storageUrl: blob.url,
          originalFilename: parsedPayload.data.originalFilename,
          sourceUrl: parsedPayload.data.sourceUrl || null,
          sourceNote: parsedPayload.data.sourceNote || null,
          cleanupStorage: storage,
        })
      },
    })
    return Response.json(response)
  } catch {
    return Response.json({ error: 'upload_failed' }, { status: 400 })
  }
}
