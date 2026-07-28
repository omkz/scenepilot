import { mkdtemp, readFile, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createLocalAssetStorage,
  localAssetUrl,
  resolveLocalAssetPath,
  validateLocalAssetStorageKey,
} from '@/lib/storage/local-asset-storage'

const projectId = '00000000-0000-4000-8000-000000000001'
const assetId = '00000000-0000-4000-8000-000000000002'
const imageId = '00000000-0000-4000-8000-000000000003'
const key = `asset-images/${projectId}/character/${assetId}/${imageId}.png`
const temporaryRoots: string[] = []

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('local asset storage', () => {
  it('writes, serves through an application URL, and removes a scoped image', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'scenepilot-assets-'))
    temporaryRoots.push(root)
    const storage = createLocalAssetStorage(root)
    const bytes = Uint8Array.from([1, 2, 3])
    const stored = await storage.upload({
      storageKey: key,
      filename: 'portrait.png',
      mimeType: 'image/png',
      bytes,
    })
    expect(stored).toEqual({
      provider: 'local',
      key,
      url: localAssetUrl(key),
    })
    expect(new Uint8Array(await readFile(resolveLocalAssetPath(key, root)))).toEqual(bytes)
    await storage.remove(key)
    await expect(stat(resolveLocalAssetPath(key, root))).rejects.toThrow()
  })

  it.each([
    '../asset-images/file.png',
    'asset-images/../../file.png',
    `asset-images/${projectId}/character/${assetId}/../${imageId}.png`,
    `asset-images/${projectId}/character/${assetId}/%2e%2e.png`,
    `/asset-images/${projectId}/character/${assetId}/${imageId}.png`,
  ])('rejects traversal or malformed key %s', value => {
    expect(validateLocalAssetStorageKey(value)).toBe(false)
    expect(() => resolveLocalAssetPath(value, '/tmp/scenepilot-test-root')).toThrow('INVALID_LOCAL_ASSET_KEY')
  })

  it('treats an already-missing local object as successfully removed', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'scenepilot-assets-'))
    temporaryRoots.push(root)
    await expect(createLocalAssetStorage(root).remove(key)).resolves.toBeUndefined()
  })
})
