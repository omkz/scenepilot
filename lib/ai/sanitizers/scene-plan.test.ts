import { describe, expect, it } from 'vitest'
import { sanitizeScenePlan, type ScenePlanAssetContext } from '@/lib/ai/sanitizers/scene-plan'
import type { ScenePlan } from '@/lib/ai/schemas/scene-plan'

const characterA = '10000000-0000-4000-8000-000000000001'
const characterB = '10000000-0000-4000-8000-000000000002'
const costumeA = '20000000-0000-4000-8000-000000000001'
const costumeB = '20000000-0000-4000-8000-000000000002'
const locationA = '30000000-0000-4000-8000-000000000001'

const assets: ScenePlanAssetContext = {
  characters: [{ id: characterA }, { id: characterB }],
  costumes: [
    { id: costumeA, characterId: characterA, isDefault: true },
    { id: costumeB, characterId: characterB, isDefault: false },
  ],
  locations: [{ id: locationA }],
}

function plan(overrides: Partial<ScenePlan['scenes'][number]> = {}): ScenePlan {
  return {
    episodeTitle: 'Episode Test',
    planningSummary: 'A valid planning summary for sanitizer testing.',
    totalEstimatedDurationSeconds: 100,
    scenes: [{
      temporaryId: 'scene-1',
      title: 'Opening Scene',
      purpose: 'Establish the central conflict for this short episode.',
      summary: 'The lead discovers evidence and chooses to investigate it.',
      emotionalTone: 'Suspicious',
      timeOfDay: 'Evening',
      estimatedDurationSeconds: 100,
      suggestedLocationId: locationA,
      characterAssignments: [{
        characterId: characterA,
        costumeId: costumeA,
        roleInScene: 'Primary',
        emotionalState: 'Suspicious',
        physicalState: 'Uninjured',
      }],
      continuityNotes: [],
      productionNotes: [],
      ...overrides,
    }],
  }
}

function codes(output: ReturnType<typeof sanitizeScenePlan>) {
  return output.warnings.map(item => item.code)
}

describe('sanitizeScenePlan', () => {
  it('removes unknown characters and duplicate assignments', () => {
    const output = sanitizeScenePlan(plan({
      characterAssignments: [
        { characterId: 'unknown', costumeId: null, roleInScene: null, emotionalState: null, physicalState: null },
        { characterId: characterA, costumeId: costumeA, roleInScene: null, emotionalState: null, physicalState: null },
        { characterId: characterA, costumeId: costumeA, roleInScene: null, emotionalState: null, physicalState: null },
      ],
    }), assets, 100)

    expect(output.scenes[0].characterAssignments).toHaveLength(1)
    expect(codes(output)).toContain('UNKNOWN_CHARACTER_REFERENCE')
    expect(codes(output)).toContain('DUPLICATE_CHARACTER_ASSIGNMENT')
  })

  it('removes unknown costumes and applies an approved default', () => {
    const output = sanitizeScenePlan(plan({
      characterAssignments: [{
        characterId: characterA,
        costumeId: 'unknown',
        roleInScene: null,
        emotionalState: null,
        physicalState: null,
      }],
    }), assets, 100)

    expect(output.scenes[0].characterAssignments[0].costumeId).toBe(costumeA)
    expect(codes(output)).toContain('UNKNOWN_COSTUME_REFERENCE')
    expect(codes(output)).toContain('DEFAULT_COSTUME_APPLIED')
  })

  it('removes a mismatched costume and applies the character default', () => {
    const output = sanitizeScenePlan(plan({
      characterAssignments: [{
        characterId: characterA,
        costumeId: costumeB,
        roleInScene: null,
        emotionalState: null,
        physicalState: null,
      }],
    }), assets, 100)

    expect(output.scenes[0].characterAssignments[0].costumeId).toBe(costumeA)
    expect(codes(output)).toContain('COSTUME_CHARACTER_MISMATCH')
    expect(codes(output)).toContain('DEFAULT_COSTUME_APPLIED')
  })

  it('sets an unknown location to null', () => {
    const output = sanitizeScenePlan(plan({ suggestedLocationId: 'unknown' }), assets, 100)

    expect(output.scenes[0].suggestedLocationId).toBeNull()
    expect(codes(output)).toContain('UNKNOWN_LOCATION_REFERENCE')
    expect(codes(output)).toContain('MISSING_LOCATION')
  })

  it('creates deterministic over-target and under-target warnings', () => {
    const over = sanitizeScenePlan(plan({ estimatedDurationSeconds: 111 }), assets, 100)
    const under = sanitizeScenePlan(plan({ estimatedDurationSeconds: 89 }), assets, 100)

    expect(codes(over)).toContain('DURATION_OVER_TARGET')
    expect(codes(under)).toContain('DURATION_UNDER_TARGET')
    expect(over.totalEstimatedDurationSeconds).toBe(111)
    expect(under.totalEstimatedDurationSeconds).toBe(89)
  })
})
