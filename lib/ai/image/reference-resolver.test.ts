import { describe, expect, it, vi } from 'vitest'
import { resolveImageGenerationReferences } from '@/lib/ai/image/reference-resolver'
import type { AssetImageDto } from '@/lib/assets/types'

const projectId = '00000000-0000-4000-8000-000000000001'
const assetId = '00000000-0000-4000-8000-000000000011'
const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 0, 1,
])

function image(
  index: number,
  storageProvider: string,
  overrides: Partial<AssetImageDto> = {},
): AssetImageDto {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
  return {
    id,
    projectId,
    assetType: 'character',
    assetId,
    imageRole: 'Inspiration',
    sourceType: 'Upload',
    storageProvider,
    storageKey: `asset-images/${projectId}/character/${assetId}/${id}.png`,
    storageUrl: `/api/local-assets/${id}.png`,
    originalFilename: 'reference.png',
    mimeType: 'image/png',
    sizeBytes: png.byteLength,
    width: 1,
    height: 1,
    sourceUrl: null,
    sourceNote: null,
    generationProvider: null,
    generationModel: null,
    generationPromptVersion: null,
    position: index,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('image generation reference resolver', () => {
  it('converts local stored images to validated Base64 data URLs', async () => {
    const references = await resolveImageGenerationReferences([
      image(1, 'local'),
    ], {
      readLocal: async () => png,
      log: vi.fn(),
    })
    expect(references).toEqual([
      `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
    ])
  })

  it('uses safe Vercel Blob HTTPS URLs directly', async () => {
    const references = await resolveImageGenerationReferences([
      image(1, 'vercel-blob', {
        storageUrl: 'https://assets.public.blob.vercel-storage.com/reference.png',
      }),
    ], { log: vi.fn() })
    expect(references).toEqual([
      'https://assets.public.blob.vercel-storage.com/reference.png',
    ])
  })

  it('skips unsafe Blob URLs and unknown storage providers with safe logs', async () => {
    const log = vi.fn()
    const references = await resolveImageGenerationReferences([
      image(1, 'vercel-blob', {
        storageUrl: 'https://user:password@example.com/reference.png',
      }),
      image(2, 'unknown'),
    ], { log })
    expect(references).toEqual([])
    expect(log).toHaveBeenCalledWith('image_generation_reference_skipped', {
      storageProvider: 'vercel-blob',
      imageId: image(1, 'vercel-blob').id,
      errorCode: 'invalid_blob_url',
    })
    expect(log).toHaveBeenCalledWith('image_generation_reference_skipped', {
      storageProvider: 'unknown',
      imageId: image(2, 'unknown').id,
      errorCode: 'unknown_storage_provider',
    })
  })

  it('applies the three-reference limit before reading local files', async () => {
    const readLocal = vi.fn(async () => png)
    const references = await resolveImageGenerationReferences([
      image(1, 'local'),
      image(2, 'local'),
      image(3, 'local'),
      image(4, 'local'),
    ], {
      readLocal,
      log: vi.fn(),
    })
    expect(references).toHaveLength(3)
    expect(readLocal).toHaveBeenCalledTimes(3)
  })

  it('continues when one local reference cannot be resolved', async () => {
    const log = vi.fn()
    const references = await resolveImageGenerationReferences([
      image(1, 'local'),
      image(2, 'vercel-blob', {
        storageUrl: 'https://assets.public.blob.vercel-storage.com/reference.png',
      }),
    ], {
      readLocal: async () => {
        throw new Error('INVALID_LOCAL_ASSET_KEY')
      },
      log,
    })
    expect(references).toEqual([
      'https://assets.public.blob.vercel-storage.com/reference.png',
    ])
    expect(log).toHaveBeenCalledWith('image_generation_reference_skipped', {
      storageProvider: 'local',
      imageId: image(1, 'local').id,
      errorCode: 'invalid_local_storage_key',
    })
  })
})
