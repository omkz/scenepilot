import 'server-only'

import { randomUUID } from 'node:crypto'
import { del, put } from '@vercel/blob'
import type { AssetType } from '@/lib/assets/types'

export interface AssetStorage {
  upload(input: {
    filename: string
    mimeType: string
    bytes: Uint8Array
  }): Promise<{
    provider: string
    key: string
    url: string
  }>
  remove(key: string): Promise<void>
}

export function getAssetStorageStatus() {
  return {
    configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    provider: 'vercel-blob',
  }
}

export function createAssetStorageKey(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  originalFilename: string,
) {
  const extension = originalFilename.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1] || 'bin'
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension
  return `asset-images/${projectId}/${assetType}/${assetId}/${randomUUID()}.${normalizedExtension}`
}

export const vercelBlobAssetStorage: AssetStorage = {
  async upload(input) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('ASSET_STORAGE_UNAVAILABLE')
    const blob = await put(input.filename, Buffer.from(input.bytes), {
      access: 'public',
      addRandomSuffix: false,
      contentType: input.mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return {
      provider: 'vercel-blob',
      key: blob.pathname,
      url: blob.url,
    }
  },
  async remove(key) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('ASSET_STORAGE_UNAVAILABLE')
    await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN })
  },
}
