import 'server-only'

import { VideoAIError } from '@/lib/ai/video/errors'
import { validateAssetImage } from '@/lib/assets/image-validation'
import { readLocalAsset } from '@/lib/storage/local-asset-storage'

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
const MAX_KEYFRAME_BYTES = 20 * 1024 * 1024
const VIDEO_DOWNLOAD_TIMEOUT_MS = 180_000

interface StoredKeyframe {
  storageProvider: string
  storageKey: string
  storageUrl: string
  mimeType: string
  sizeBytes?: number | null
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function allowedAlibabaUrl(value: string) {
  const url = safeHttpsUrl(value)
  if (!url) return null
  return url.hostname === 'aliyuncs.com' || url.hostname.endsWith('.aliyuncs.com')
    ? url
    : null
}

export async function resolveVideoFirstFrame(keyframe: StoredKeyframe) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(keyframe.mimeType)
    || (keyframe.sizeBytes !== null
      && keyframe.sizeBytes !== undefined
      && (keyframe.sizeBytes < 1 || keyframe.sizeBytes > MAX_KEYFRAME_BYTES))
  ) {
    throw new VideoAIError('keyframe_failed', 'The persisted keyframe metadata is invalid.')
  }
  if (keyframe.storageProvider === 'local') {
    const bytes = new Uint8Array(await readLocalAsset(keyframe.storageKey))
    const validation = validateAssetImage({
      bytes,
      claimedMimeType: keyframe.mimeType,
      maximumBytes: MAX_KEYFRAME_BYTES,
    })
    if (!validation.valid) {
      throw new VideoAIError('keyframe_failed', 'The persisted keyframe is invalid.')
    }
    return `data:${validation.mimeType};base64,${Buffer.from(bytes).toString('base64')}`
  }
  if (keyframe.storageProvider === 'vercel-blob') {
    const url = safeHttpsUrl(keyframe.storageUrl)
    if (url) return url.toString()
  }
  throw new VideoAIError('keyframe_failed', 'The persisted keyframe is unavailable.')
}

function isMp4(bytes: Uint8Array) {
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
}

export async function downloadGeneratedVideo(
  initialUrl: string,
  fetcher: typeof fetch = fetch,
) {
  let url = allowedAlibabaUrl(initialUrl)
  if (!url) throw new VideoAIError('unsafe_video_url', 'The provider returned an unsafe video URL.')

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetcher(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new VideoAIError('video_download_failed', 'The video redirect was invalid.')
      url = allowedAlibabaUrl(new URL(location, url).toString())
      if (!url) throw new VideoAIError('unsafe_video_url', 'The video redirect was unsafe.')
      continue
    }
    if (!response.ok) {
      throw new VideoAIError('video_download_failed', 'The provider video could not be downloaded.')
    }
    const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (mimeType !== 'video/mp4') {
      throw new VideoAIError('invalid_video', 'The provider result was not an MP4 video.')
    }
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_VIDEO_BYTES) {
      throw new VideoAIError('invalid_video', 'The generated video is too large.')
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > MAX_VIDEO_BYTES || !isMp4(bytes)) {
      throw new VideoAIError('invalid_video', 'The provider returned an invalid MP4 video.')
    }
    return bytes
  }
  throw new VideoAIError('video_download_failed', 'The provider returned too many redirects.')
}
