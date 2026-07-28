import { describe, expect, it } from 'vitest'
import {
  selectCharacterConceptReferences,
  selectCostumeConceptReferences,
  selectLocationConceptReferences,
} from '@/lib/ai/image/references'
import type { AssetImageDto, AssetImageRole, AssetType } from '@/lib/assets/types'

function image(
  id: string,
  assetType: AssetType,
  assetId: string,
  imageRole: AssetImageRole,
  position = 1,
): AssetImageDto {
  return {
    id,
    projectId: '00000000-0000-4000-8000-000000000001',
    assetType,
    assetId,
    imageRole,
    sourceType: 'Upload',
    storageProvider: 'local',
    storageKey: id,
    storageUrl: `https://assets.example.com/${id}.png`,
    originalFilename: null,
    mimeType: 'image/png',
    sizeBytes: 100,
    width: 100,
    height: 100,
    sourceUrl: null,
    sourceNote: null,
    generationProvider: null,
    generationModel: null,
    generationPromptVersion: null,
    position,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('asset concept reference selection', () => {
  it('selects only the Character inspiration and then its master', () => {
    const images = [
      image('inspiration', 'character', 'character-a', 'Inspiration'),
      image('master', 'character', 'character-a', 'Master Reference'),
      image('other', 'character', 'character-b', 'Inspiration'),
    ]
    expect(selectCharacterConceptReferences(images, 'character-a').map(item => item.id))
      .toEqual(['inspiration', 'master'])
  })

  it('prioritizes linked Character master for Costume generation', () => {
    const selected = selectCostumeConceptReferences({
      costumeImages: [
        image('costume-inspiration', 'costume', 'costume-a', 'Inspiration'),
        image('wrong-costume', 'costume', 'costume-b', 'Inspiration'),
      ],
      costumeId: 'costume-a',
      characterImages: [
        image('character-master', 'character', 'character-a', 'Master Reference'),
      ],
      characterId: 'character-a',
      projectId: '00000000-0000-4000-8000-000000000001',
    })
    expect(selected.map(item => item.id)).toEqual(['character-master', 'costume-inspiration'])
  })

  it('prioritizes an existing Costume master over Costume inspiration', () => {
    const selected = selectCostumeConceptReferences({
      costumeImages: [
        image('costume-inspiration', 'costume', 'costume-a', 'Inspiration'),
        image('costume-master', 'costume', 'costume-a', 'Master Reference'),
      ],
      costumeId: 'costume-a',
      characterImages: [
        image('character-master', 'character', 'character-a', 'Master Reference'),
      ],
      characterId: 'character-a',
      projectId: '00000000-0000-4000-8000-000000000001',
      limit: 3,
    })
    expect(selected.map(item => item.id))
      .toEqual(['character-master', 'costume-master', 'costume-inspiration'])
  })

  it('never selects images from another Location', () => {
    const selected = selectLocationConceptReferences([
      image('own', 'location', 'location-a', 'Inspiration'),
      image('other', 'location', 'location-b', 'Master Reference'),
      image('character', 'character', 'character-a', 'Inspiration'),
    ], 'location-a')
    expect(selected.map(item => item.id)).toEqual(['own'])
  })
})
