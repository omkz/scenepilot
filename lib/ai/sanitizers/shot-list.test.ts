import { describe, expect, it } from 'vitest'
import type { ShotList } from '@/lib/ai/schemas/shot-list'
import { sanitizeShotList, type ShotListAssetContext } from '@/lib/ai/sanitizers/shot-list'

const characterA = 'character-a'
const characterB = 'character-b'
const costumeA = 'costume-a'
const sceneCostume = 'scene-costume'
const defaultCostume = 'default-costume'
const locationA = 'location-a'

const baseContext: ShotListAssetContext = {
  characters: [
    {
      id: characterA,
      approvalStatus: 'Approved',
      archivedAt: null,
      assignedToScene: true,
      sceneCostumeId: sceneCostume,
    },
    {
      id: characterB,
      approvalStatus: 'Approved',
      archivedAt: null,
      assignedToScene: false,
      sceneCostumeId: null,
    },
  ],
  costumes: [
    {
      id: costumeA,
      characterId: characterA,
      approvalStatus: 'Approved',
      archivedAt: null,
      isDefault: false,
    },
    {
      id: sceneCostume,
      characterId: characterA,
      approvalStatus: 'Approved',
      archivedAt: null,
      isDefault: false,
    },
    {
      id: defaultCostume,
      characterId: characterA,
      approvalStatus: 'Approved',
      archivedAt: null,
      isDefault: true,
    },
  ],
  locations: [{ id: locationA, approvalStatus: 'Approved', archivedAt: null }],
  sceneLocationId: locationA,
  sceneScript: 'Mara opens the ledger. "It was here all along."',
  targetDurationSeconds: 20,
  contextFingerprint: 'fingerprint',
}

function plan(overrides: Partial<ShotList['shots'][number]> = {}): ShotList {
  return {
    sceneTitle: 'The hidden ledger',
    visualStrategy: 'Build tension through increasingly tight coverage.',
    pacingNotes: 'Begin deliberately, then accelerate into the reveal.',
    totalEstimatedDurationSeconds: 999,
    shots: [{
      temporaryId: 'shot-1',
      title: 'Reveal the ledger',
      description: 'Mara enters frame and discovers the hidden ledger.',
      shotType: 'Medium',
      cameraAngle: 'Eye Level',
      cameraMovement: 'Static',
      lens: '50mm',
      composition: 'Mara is framed beside the open cabinet.',
      action: 'Mara opens the ledger.',
      dialogueExcerpt: 'It was here all along.',
      emotionalIntent: 'Suspicion becomes certainty.',
      estimatedDurationSeconds: 10,
      locationId: locationA,
      timeOfDay: 'Continuous',
      lightingNotes: 'Soft practical light.',
      generationPrompt: null,
      negativePrompt: null,
      compositionLocked: false,
      characters: [{
        characterId: characterA,
        costumeId: costumeA,
        screenPosition: 'Center',
        pose: 'Leaning forward',
        expression: 'Suspicious',
        action: 'Opens the ledger',
        gazeDirection: 'Down',
        physicalState: 'Uninjured',
      }],
      ...overrides,
    }],
  }
}

describe('sanitizeShotList', () => {
  it('preserves a valid assigned character', () => {
    expect(sanitizeShotList(plan(), baseContext).shots[0].characters[0].characterId).toBe(characterA)
  })

  it('removes a character not assigned to the scene with a blocking warning', () => {
    const output = sanitizeShotList(plan({
      characters: [{ ...plan().shots[0].characters[0], characterId: characterB }],
    }), baseContext)
    expect(output.shots[0].characters).toHaveLength(0)
    expect(output.warnings).toContainEqual(expect.objectContaining({
      code: 'CHARACTER_NOT_IN_SCENE',
      severity: 'Error',
    }))
  })

  it('removes an unknown character reference as a blocking error', () => {
    const output = sanitizeShotList(plan({
      characters: [{ ...plan().shots[0].characters[0], characterId: 'cross-project-character' }],
    }), baseContext)
    expect(output.shots[0].characters).toHaveLength(0)
    expect(output.metadata.blockingErrorCount).toBe(1)
    expect(output.warnings).toContainEqual(expect.objectContaining({
      code: 'UNKNOWN_CHARACTER_REFERENCE',
      severity: 'Error',
    }))
  })

  it('removes a mismatched costume and records a blocking warning', () => {
    const context = {
      ...baseContext,
      costumes: [...baseContext.costumes, {
        id: 'costume-b',
        characterId: characterB,
        approvalStatus: 'Approved',
        archivedAt: null,
        isDefault: false,
      }],
    }
    const output = sanitizeShotList(plan({
      characters: [{ ...plan().shots[0].characters[0], costumeId: 'costume-b' }],
    }), context)
    expect(output.shots[0].characters[0].costumeId).toBe(sceneCostume)
    expect(output.warnings).toContainEqual(expect.objectContaining({
      code: 'COSTUME_CHARACTER_MISMATCH',
      severity: 'Error',
    }))
  })

  it('applies the approved scene costume before the default costume', () => {
    const output = sanitizeShotList(plan({
      characters: [{ ...plan().shots[0].characters[0], costumeId: null }],
    }), baseContext)
    expect(output.shots[0].characters[0].costumeId).toBe(sceneCostume)
  })

  it('falls back to the approved default costume', () => {
    const context = {
      ...baseContext,
      characters: [{ ...baseContext.characters[0], sceneCostumeId: null }],
    }
    const output = sanitizeShotList(plan({
      characters: [{ ...plan().shots[0].characters[0], costumeId: null }],
    }), context)
    expect(output.shots[0].characters[0].costumeId).toBe(defaultCostume)
  })

  it('replaces unknown and alternate locations with the scene location', () => {
    const unknown = sanitizeShotList(plan({ locationId: 'unknown' }), baseContext)
    expect(unknown.shots[0].locationId).toBe(locationA)
    expect(unknown.warnings.some(item => item.code === 'UNKNOWN_LOCATION_REFERENCE')).toBe(true)

    const context = {
      ...baseContext,
      locations: [...baseContext.locations, { id: 'location-b', approvalStatus: 'Approved', archivedAt: null }],
    }
    const alternate = sanitizeShotList(plan({ locationId: 'location-b' }), context)
    expect(alternate.shots[0].locationId).toBe(locationA)
    expect(alternate.warnings).toContainEqual(expect.objectContaining({
      code: 'LOCATION_MISMATCH',
      severity: 'Error',
    }))
  })

  it('removes duplicate character assignments', () => {
    const assignment = plan().shots[0].characters[0]
    const output = sanitizeShotList(plan({ characters: [assignment, assignment] }), baseContext)
    expect(output.shots[0].characters).toHaveLength(1)
    expect(output.warnings.some(item => item.code === 'DUPLICATE_CHARACTER_ASSIGNMENT')).toBe(true)
  })

  it('normalizes duplicate temporary shot IDs deterministically', () => {
    const first = plan().shots[0]
    const output = sanitizeShotList({
      ...plan(),
      shots: [first, { ...first }],
    }, baseContext)
    expect(output.shots.map(item => item.temporaryId)).toEqual(['shot-1', 'shot-1-2'])
    expect(output.metadata.blockingErrorCount).toBeGreaterThan(0)
  })

  it('recalculates duration and reports over and under target plans', () => {
    const over = sanitizeShotList(plan({ estimatedDurationSeconds: 24 }), baseContext)
    expect(over.totalEstimatedDurationSeconds).toBe(24)
    expect(over.warnings.some(item => item.code === 'DURATION_OVER_TARGET')).toBe(true)

    const under = sanitizeShotList(plan({ estimatedDurationSeconds: 5 }), baseContext)
    expect(under.warnings.some(item => item.code === 'DURATION_UNDER_TARGET')).toBe(true)
  })

  it('validates dialogue excerpts against normalized Scene Script text', () => {
    const valid = sanitizeShotList(plan({ dialogueExcerpt: 'IT WAS   HERE ALL ALONG.' }), baseContext)
    expect(valid.warnings.some(item => item.code === 'DIALOGUE_EXCERPT_NOT_FOUND')).toBe(false)
    const invalid = sanitizeShotList(plan({ dialogueExcerpt: 'This line never happens.' }), baseContext)
    expect(invalid.warnings.some(item => item.code === 'DIALOGUE_EXCERPT_NOT_FOUND')).toBe(true)
  })

  it('warns when camera movement is excessive', () => {
    const moving = { ...plan().shots[0], cameraMovement: 'Pan' as const }
    const output = sanitizeShotList({
      ...plan(),
      shots: [0, 1, 2, 3].map(index => ({ ...moving, temporaryId: `shot-${index}` })),
    }, { ...baseContext, targetDurationSeconds: 45 })
    expect(output.warnings.some(item => item.code === 'EXCESSIVE_CAMERA_MOVEMENT')).toBe(true)
  })
})
