import 'server-only'

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AssetStorage } from '@/lib/storage/asset-storage'

const LOCAL_ASSET_KEY_PATTERN = /^asset-images\/[0-9a-f-]{36}\/(character|costume|location)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i
const LOCAL_STORYBOARD_KEY_PATTERN = /^storyboard-images\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i
const LOCAL_PRODUCTION_KEY_PATTERN = /^production-media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4)$/i

export function getLocalAssetStorageRoot() {
  const configuredRoot = process.env.ASSET_LOCAL_STORAGE_ROOT
  if (configuredRoot) return path.resolve(/* turbopackIgnore: true */ configuredRoot)
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    '.data',
    'uploads',
    'asset-images',
  )
}

export function validateLocalAssetStorageKey(key: string) {
  const expectedSegments = key.startsWith('asset-images/') ? 5 : 6
  if (
    (
      !LOCAL_ASSET_KEY_PATTERN.test(key)
      && !LOCAL_STORYBOARD_KEY_PATTERN.test(key)
      && !LOCAL_PRODUCTION_KEY_PATTERN.test(key)
    )
    || key.includes('\\')
    || key.includes('\0')
  ) return false
  const segments = key.split('/')
  return segments.length === expectedSegments && segments.every(segment => (
    segment !== '.' && segment !== '..' && !segment.includes('%')
  ))
}

export function resolveLocalAssetPath(key: string, root = getLocalAssetStorageRoot()) {
  if (!validateLocalAssetStorageKey(key)) throw new Error('INVALID_LOCAL_ASSET_KEY')
  const storyboard = key.startsWith('storyboard-images/')
  const production = key.startsWith('production-media/')
  const collection = production ? 'production-media' : storyboard ? 'storyboard-images' : 'asset-images'
  const targetRoot = collection !== 'asset-images'
    ? path.basename(root) === 'asset-images'
      ? path.join(path.dirname(root), collection)
      : path.join(root, collection)
    : root
  const prefix = `${collection}/`
  const relativeKey = key.slice(prefix.length)
  const resolved = path.resolve(targetRoot, relativeKey)
  const relative = path.relative(targetRoot, resolved)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('INVALID_LOCAL_ASSET_KEY')
  }
  return resolved
}

export function localAssetUrl(key: string) {
  if (!validateLocalAssetStorageKey(key)) throw new Error('INVALID_LOCAL_ASSET_KEY')
  return `/api/local-assets/${key.split('/').map(encodeURIComponent).join('/')}`
}

export function localMediaUrl(key: string) {
  if (!LOCAL_PRODUCTION_KEY_PATTERN.test(key) || !validateLocalAssetStorageKey(key)) {
    throw new Error('INVALID_LOCAL_ASSET_KEY')
  }
  return `/api/local-media/${key.split('/').map(encodeURIComponent).join('/')}`
}

export function createLocalAssetStorage(root = getLocalAssetStorageRoot()): AssetStorage {
  return {
    async upload(input) {
      const destination = resolveLocalAssetPath(input.storageKey, root)
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, input.bytes, { flag: 'wx' })
      return {
        provider: 'local',
        key: input.storageKey,
        url: input.storageKey.startsWith('production-media/')
          ? localMediaUrl(input.storageKey)
          : localAssetUrl(input.storageKey),
      }
    },
    async remove(key) {
      const destination = resolveLocalAssetPath(key, root)
      await rm(destination, { force: true })
    },
  }
}

export async function readLocalAsset(key: string) {
  return readFile(resolveLocalAssetPath(key))
}

export function localAssetContentType(key: string) {
  if (key.toLowerCase().endsWith('.jpg')) return 'image/jpeg'
  if (key.toLowerCase().endsWith('.png')) return 'image/png'
  if (key.toLowerCase().endsWith('.webp')) return 'image/webp'
  if (key.toLowerCase().endsWith('.mp4')) return 'video/mp4'
  return null
}
