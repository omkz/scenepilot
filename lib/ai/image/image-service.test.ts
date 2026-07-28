import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAssetConcepts } from '@/lib/ai/image/image-service'
import type {
  AssetConceptContext,
  ImageGenerationProvider,
} from '@/lib/ai/image/types'
import type { AssetImageDto, CharacterDto } from '@/lib/assets/types'
import type { AssetStorage } from '@/lib/storage/asset-storage'

const projectId = '00000000-0000-4000-8000-000000000001'
const characterId = '00000000-0000-4000-8000-000000000011'
const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 0, 1,
])

const character: CharacterDto = {
  id: characterId,
  projectId,
  assetCode: 'CHAR-001',
  name: 'Mara Vale',
  narrativeRole: 'Protagonist',
  age: 31,
  genderPresentation: 'Woman',
  personality: 'Restrained',
  motivation: 'Protect the council',
  visualDirection: 'A precise identity portrait',
  appearance: null,
  distinguishingFeatures: null,
  approvalStatus: 'Approved',
  facialIdentityLocked: false,
  skinToneLocked: false,
  eyeColorLocked: false,
  hairstyleLocked: false,
  bodyProportionsLocked: false,
  distinguishingFeaturesLocked: false,
  accessoriesLocked: false,
  costumeCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
}

function context(archived = false): AssetConceptContext {
  return {
    assetType: 'character',
    character: { ...character, archivedAt: archived ? '2026-01-02T00:00:00.000Z' : null },
    assetImages: [],
  }
}

function provider(count = 4): ImageGenerationProvider {
  return {
    id: 'qwen',
    model: 'qwen-image-2.0-pro',
    generateAssetConcepts: vi.fn(async () => ({
      images: Array.from({ length: count }, () => ({
        bytes: png,
        mimeType: 'image/png',
      })),
      provider: 'qwen',
      model: 'qwen-image-2.0-pro',
      durationMs: 12,
    })),
  }
}

function storage(): AssetStorage {
  return {
    upload: vi.fn(async input => ({
      provider: 'local',
      key: input.storageKey,
      url: `/api/local-assets/${encodeURIComponent(input.storageKey)}`,
    })),
    remove: vi.fn(async () => undefined),
  }
}

function dto(index: number): AssetImageDto {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    projectId,
    assetType: 'character',
    assetId: characterId,
    imageRole: 'Generated Concept',
    sourceType: 'AI Generated',
    storageProvider: 'local',
    storageKey: `image-${index}.png`,
    storageUrl: `/image-${index}.png`,
    originalFilename: null,
    mimeType: 'image/png',
    sizeBytes: png.byteLength,
    width: 1,
    height: 1,
    sourceUrl: null,
    sourceNote: null,
    generationProvider: 'qwen',
    generationModel: 'qwen-image-2.0-pro',
    generationPromptVersion: 'asset-concept-v1',
    position: index,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('asset concept generation service', () => {
  beforeEach(() => {
    process.env.DASHSCOPE_API_KEY = 'unit-test-key'
    process.env.IMAGE_AI_CANDIDATE_COUNT = '4'
  })

  afterEach(() => {
    delete process.env.DASHSCOPE_API_KEY
    delete process.env.IMAGE_AI_CANDIDATE_COUNT
  })

  it('generates and persists four Generated Concept records by default', async () => {
    const persist = vi.fn(async () => ({
      ok: true as const,
      value: [dto(1), dto(2), dto(3), dto(4)],
    }))
    const result = await generateAssetConcepts({
      projectId,
      assetType: 'character',
      assetId: characterId,
    }, {
      provider: provider(),
      storage: storage(),
      loadContext: async () => context(),
      persist,
      download: async image => image.bytes || png,
    })
    expect(result).toHaveLength(4)
    expect(result.every(image => image.imageRole === 'Generated Concept')).toBe(true)
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'qwen',
      model: 'qwen-image-2.0-pro',
      images: expect.any(Array),
    }))
  })

  it('rejects invalid candidate counts and archived assets', async () => {
    await expect(generateAssetConcepts({
      projectId,
      assetType: 'character',
      assetId: characterId,
      candidateCount: 0,
    }, {
      provider: provider(),
      storage: storage(),
      loadContext: async () => context(),
    })).rejects.toMatchObject({ reason: 'invalid_candidate_count' })

    await expect(generateAssetConcepts({
      projectId,
      assetType: 'character',
      assetId: characterId,
    }, {
      provider: provider(),
      storage: storage(),
      loadContext: async () => context(true),
    })).rejects.toMatchObject({ reason: 'asset_archived' })
  })

  it('schedules cleanup when persistence fails after upload', async () => {
    const scheduleCleanup = vi.fn(async (_provider: string, _key: string) => (
      '00000000-0000-4000-8000-000000000099'
    ))
    const processCleanup = vi.fn(async () => ({ completed: 4, pending: 0 }))
    await expect(generateAssetConcepts({
      projectId,
      assetType: 'character',
      assetId: characterId,
    }, {
      provider: provider(),
      storage: storage(),
      loadContext: async () => context(),
      persist: async () => ({ ok: false, reason: 'upload_failed' }),
      scheduleCleanup,
      processCleanup,
      download: async image => image.bytes || png,
    })).rejects.toMatchObject({ reason: 'persistence_failed' })
    expect(scheduleCleanup).toHaveBeenCalledTimes(4)
    expect(processCleanup).toHaveBeenCalledOnce()
  })
})
