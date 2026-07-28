import { describe, expect, it } from 'vitest'
import {
  buildCharacterConceptPrompt,
  buildCostumeConceptPrompt,
  buildLocationConceptPrompt,
} from '@/lib/ai/image/prompts'
import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'

const common = {
  projectId: '00000000-0000-4000-8000-000000000001',
  approvalStatus: 'Approved' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
}

const character: CharacterDto = {
  ...common,
  id: '00000000-0000-4000-8000-000000000011',
  assetCode: 'CHAR-001',
  name: 'Mara Vale',
  narrativeRole: 'Protagonist',
  age: 31,
  genderPresentation: 'Woman',
  personality: 'Restrained and analytical',
  motivation: 'Protect the council',
  visualDirection: 'A calm Javanese prince with political danger',
  appearance: 'Dark hair and measured posture',
  distinguishingFeatures: 'A fine scar above the brow',
  facialIdentityLocked: false,
  skinToneLocked: false,
  eyeColorLocked: false,
  hairstyleLocked: false,
  bodyProportionsLocked: false,
  distinguishingFeaturesLocked: false,
  accessoriesLocked: false,
  costumeCount: 1,
}

const costume: CostumeDto = {
  ...common,
  id: '00000000-0000-4000-8000-000000000021',
  assetCode: 'COSTUME-001',
  characterId: character.id,
  characterName: character.name,
  name: 'Council Uniform',
  description: 'Indigo woven court uniform with restrained gold trim',
  category: 'Formal',
  condition: 'Clean',
  isDefault: true,
}

const location: LocationDto = {
  ...common,
  id: '00000000-0000-4000-8000-000000000031',
  assetCode: 'LOCATION-001',
  name: 'River Camp',
  description: 'An uneasy temporary alliance camp',
  locationType: 'Exterior',
  architectureStyle: 'Late thirteenth-century East Java',
  defaultTimeOfDay: 'Dawn',
  defaultLighting: 'Natural',
  visualIdentityNotes: 'Misty river, command tents, bamboo shelters',
  architectureLocked: false,
  layoutLocked: false,
  lightingLocked: false,
}

describe('asset concept prompts', () => {
  it('includes Character story and visual direction without provider wording', () => {
    const prompt = buildCharacterConceptPrompt(character)
    expect(prompt).toContain(character.personality)
    expect(prompt).toContain(character.motivation)
    expect(prompt).toContain(character.visualDirection)
    expect(prompt.toLowerCase()).not.toContain('qwen')
  })

  it('includes the linked Character identity in a Costume prompt', () => {
    const prompt = buildCostumeConceptPrompt(costume, character)
    expect(prompt).toContain(character.name)
    expect(prompt).toContain(character.assetCode)
    expect(prompt).toContain(costume.description)
  })

  it('includes Location description and visual direction', () => {
    const prompt = buildLocationConceptPrompt(location)
    expect(prompt).toContain(location.description)
    expect(prompt).toContain(location.visualIdentityNotes)
    expect(prompt.toLowerCase()).not.toContain('qwen')
  })
})
