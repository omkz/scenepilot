import { describe, expect, it } from 'vitest'
import {
  characterInputSchema,
  costumeInputSchema,
  locationInputSchema,
} from '@/lib/assets/validation'

describe('simplified visual asset inputs', () => {
  it('accepts a character without advanced metadata or visual locks', () => {
    const result = characterInputSchema.parse({
      name: 'Raden Wijaya',
      narrativeRole: 'Protagonist',
      age: '30',
      genderPresentation: 'Masculine',
      personality: 'Restrained and observant.',
      motivation: 'Protect his people.',
      visualDirection: 'A calm Javanese prince with restrained authority.',
    })
    expect(result.visualDirection).toContain('Javanese prince')
    expect(result.appearance).toBeNull()
    expect(result.facialIdentityLocked).toBeUndefined()
  })

  it('keeps costume visual direction in the compatible description field', () => {
    const result = costumeInputSchema.parse({
      characterId: '00000000-0000-4000-8000-000000000001',
      name: 'Diplomatic Costume',
      description: 'Indigo court layers with restrained gold trim.',
      category: 'Formal',
      condition: 'Clean',
      isDefault: 'on',
    })
    expect(result.description).toContain('Indigo')
    expect(result.condition).toBe('Clean')
    expect(result.isDefault).toBe(true)
  })

  it('accepts a location without advanced environment values', () => {
    const result = locationInputSchema.parse({
      name: 'Riverside Alliance Camp',
      locationType: 'Exterior',
      description: 'A temporary alliance camp.',
      visualIdentityNotes: 'Mist, oil lamps, wooden ships, and wet ground.',
      defaultTimeOfDay: '',
      defaultLighting: '',
    })
    expect(result.visualIdentityNotes).toContain('wooden ships')
    expect(result.defaultTimeOfDay).toBe('Variable')
    expect(result.defaultLighting).toBe('Natural')
    expect(result.layoutLocked).toBeUndefined()
  })
})
