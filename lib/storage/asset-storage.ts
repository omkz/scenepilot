import 'server-only'

import { randomUUID } from 'node:crypto'
import type { AssetType } from '@/lib/assets/types'
import { createLocalAssetStorage } from '@/lib/storage/local-asset-storage'
import { createVercelBlobAssetStorage } from '@/lib/storage/vercel-blob-asset-storage'

export const ASSET_STORAGE_DRIVERS = ['local', 'vercel-blob'] as const
export type AssetStorageDriver = typeof ASSET_STORAGE_DRIVERS[number]
export type AssetStorageUploadMode = 'server' | 'client'

export interface AssetStorageStatus {
  configured: boolean
  driver: AssetStorageDriver
  uploadMode: AssetStorageUploadMode
}

export interface AssetStorage {
  upload(input: {
    storageKey: string
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

export class AssetStorageConfigurationError extends Error {
  readonly code = 'ASSET_STORAGE_CONFIGURATION_ERROR'
}

export function resolveAssetStorageDriver(
  environment = process.env.NODE_ENV,
  configuredDriver = process.env.ASSET_STORAGE_DRIVER,
): AssetStorageDriver {
  const fallback = environment === 'production' ? 'vercel-blob' : 'local'
  const driver = configuredDriver || fallback
  if (driver !== 'local' && driver !== 'vercel-blob') {
    throw new AssetStorageConfigurationError(`Unsupported asset storage driver: ${driver}`)
  }
  return driver
}

export function getAssetStorageStatus(): AssetStorageStatus {
  try {
    const driver = resolveAssetStorageDriver()
    return {
      configured: driver === 'local' || Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      driver,
      uploadMode: driver === 'local' ? 'server' : 'client',
    }
  } catch (error) {
    console.error('asset_storage_configuration_error', {
      code: (error as { code?: string }).code || 'ASSET_STORAGE_CONFIGURATION_ERROR',
    })
    return {
      configured: false,
      driver: process.env.NODE_ENV === 'production' ? 'vercel-blob' : 'local',
      uploadMode: process.env.NODE_ENV === 'production' ? 'client' : 'server',
    }
  }
}

export function getAssetStorage(driver = resolveAssetStorageDriver()): AssetStorage {
  if (driver === 'local') return createLocalAssetStorage()
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new AssetStorageConfigurationError('Vercel Blob storage requires BLOB_READ_WRITE_TOKEN')
  }
  return createVercelBlobAssetStorage(process.env.BLOB_READ_WRITE_TOKEN)
}

export function getAssetStorageForProvider(provider: string): AssetStorage {
  if (provider === 'local') return createLocalAssetStorage()
  if (provider === 'vercel-blob') return getAssetStorage('vercel-blob')
  throw new AssetStorageConfigurationError(`Unsupported persisted storage provider: ${provider}`)
}

export function createAssetStorageKey(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  originalFilename: string,
) {
  const extension = originalFilename.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1]
  if (!extension) throw new AssetStorageConfigurationError('Unsupported asset image extension')
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension
  return `asset-images/${projectId}/${assetType}/${assetId}/${randomUUID()}.${normalizedExtension}`
}
