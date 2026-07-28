import 'server-only'

import type { AssetImageDto } from '@/lib/assets/types'
import { validateAssetImage } from '@/lib/assets/image-validation'
import { readLocalAsset } from '@/lib/storage/local-asset-storage'

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const MAX_QWEN_REFERENCES = 3

interface ReferenceResolverDependencies {
  readLocal?: (storageKey: string) => Promise<Uint8Array>
  log?: (message: string, metadata: {
    storageProvider: string
    imageId: string
    errorCode: string
  }) => void
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function logResolutionFailure(
  image: AssetImageDto,
  errorCode: string,
  log: NonNullable<ReferenceResolverDependencies['log']>,
) {
  log('image_generation_reference_skipped', {
    storageProvider: image.storageProvider,
    imageId: image.id,
    errorCode,
  })
}

export async function resolveImageGenerationReferences(
  references: AssetImageDto[],
  dependencies: ReferenceResolverDependencies = {},
): Promise<string[]> {
  const readLocal = dependencies.readLocal || (async storageKey => (
    new Uint8Array(await readLocalAsset(storageKey))
  ))
  const log = dependencies.log || console.warn
  const resolved: string[] = []

  for (const image of references.slice(0, MAX_QWEN_REFERENCES)) {
    if (image.storageProvider === 'local') {
      if (!SUPPORTED_MIME_TYPES.has(image.mimeType)) {
        logResolutionFailure(image, 'unsupported_mime_type', log)
        continue
      }
      try {
        const bytes = await readLocal(image.storageKey)
        const validation = validateAssetImage({
          bytes,
          claimedMimeType: image.mimeType,
          filename: image.originalFilename,
          sizeBytes: image.sizeBytes,
        })
        if (!validation.valid) {
          logResolutionFailure(image, 'invalid_local_image', log)
          continue
        }
        resolved.push(`data:${validation.mimeType};base64,${Buffer.from(bytes).toString('base64')}`)
      } catch (error) {
        logResolutionFailure(
          image,
          (error as { message?: string }).message === 'INVALID_LOCAL_ASSET_KEY'
            ? 'invalid_local_storage_key'
            : 'local_read_failed',
          log,
        )
      }
      continue
    }

    if (image.storageProvider === 'vercel-blob') {
      const url = safeHttpsUrl(image.storageUrl)
      if (url) resolved.push(url)
      else logResolutionFailure(image, 'invalid_blob_url', log)
      continue
    }

    logResolutionFailure(image, 'unknown_storage_provider', log)
  }

  return resolved
}
