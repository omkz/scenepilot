import { describe, expect, it } from 'vitest'
import {
  AssetStorageConfigurationError,
  resolveAssetStorageDriver,
} from '@/lib/storage/asset-storage'

describe('asset storage driver selection', () => {
  it('defaults development to local and production to Vercel Blob', () => {
    expect(resolveAssetStorageDriver('development', undefined)).toBe('local')
    expect(resolveAssetStorageDriver('test', undefined)).toBe('local')
    expect(resolveAssetStorageDriver('production', undefined)).toBe('vercel-blob')
  })

  it('allows an explicit valid override', () => {
    expect(resolveAssetStorageDriver('production', 'local')).toBe('local')
    expect(resolveAssetStorageDriver('development', 'vercel-blob')).toBe('vercel-blob')
  })

  it('rejects an invalid driver clearly', () => {
    expect(() => resolveAssetStorageDriver('development', 'filesystem'))
      .toThrow(AssetStorageConfigurationError)
  })
})
