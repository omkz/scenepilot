import 'server-only'

import { del, put } from '@vercel/blob'
import type { AssetStorage } from '@/lib/storage/asset-storage'

export function createVercelBlobAssetStorage(token: string): AssetStorage {
  return {
    async upload(input) {
      const blob = await put(input.storageKey, Buffer.from(input.bytes), {
        access: 'public',
        addRandomSuffix: false,
        contentType: input.mimeType,
        token,
      })
      return {
        provider: 'vercel-blob',
        key: blob.pathname,
        url: blob.url,
      }
    },
    async remove(key) {
      await del(key, { token })
    },
  }
}
