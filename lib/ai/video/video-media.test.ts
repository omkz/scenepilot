import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  downloadGeneratedVideo,
  resolveVideoFirstFrame,
} from '@/lib/ai/video/video-media'
import { createLocalAssetStorage } from '@/lib/storage/local-asset-storage'

const roots: string[] = []
const projectId = '00000000-0000-4000-8000-000000000001'
const episodeId = '00000000-0000-4000-8000-000000000002'
const sceneId = '00000000-0000-4000-8000-000000000003'
const shotId = '00000000-0000-4000-8000-000000000004'
const imageId = '00000000-0000-4000-8000-000000000005'

afterEach(async () => {
  delete process.env.ASSET_LOCAL_STORAGE_ROOT
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function png() {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  bytes.set([0, 0, 0, 1], 16)
  bytes.set([0, 0, 0, 1], 20)
  return bytes
}

describe('video media validation', () => {
  it('resolves a local keyframe as a validated data URL', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'scenepilot-video-'))
    roots.push(root)
    process.env.ASSET_LOCAL_STORAGE_ROOT = root
    const key = `production-media/${projectId}/${episodeId}/${sceneId}/${shotId}/${imageId}.png`
    await createLocalAssetStorage(root).upload({
      storageKey: key,
      filename: 'keyframe.png',
      mimeType: 'image/png',
      bytes: png(),
    })
    await expect(resolveVideoFirstFrame({
      storageProvider: 'local',
      storageKey: key,
      storageUrl: `/api/local-media/${key}`,
      mimeType: 'image/png',
    })).resolves.toMatch(/^data:image\/png;base64,/)
  })

  it('downloads only a valid MP4 from an allowed provider URL', async () => {
    const bytes = new Uint8Array(16)
    bytes.set([0x00, 0x00, 0x00, 0x10, 0x66, 0x74, 0x79, 0x70])
    const fetcher = vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': 'video/mp4' },
    }))
    await expect(downloadGeneratedVideo(
      'https://result.aliyuncs.com/video.mp4',
      fetcher,
    )).resolves.toEqual(bytes)
  })

  it('rejects HTML or JSON bodies masquerading as video', async () => {
    await expect(downloadGeneratedVideo(
      'https://result.aliyuncs.com/video.mp4',
      async () => new Response('<html>error</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    )).rejects.toMatchObject({ reason: 'invalid_video' })
  })
})
