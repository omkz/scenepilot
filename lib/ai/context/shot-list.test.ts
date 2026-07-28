import { describe, expect, it } from 'vitest'
import { buildShotListContextFingerprint } from '@/lib/ai/context/shot-list'

const scene = {
  id: 'scene-1',
  title: 'The reveal',
  purpose: 'Reveal the truth.',
  summary: 'Mara opens the ledger.',
  emotionalTone: 'Suspicious',
  targetDurationSeconds: 20,
  timeOfDay: 'Night',
  locationId: 'location-1',
  script: 'Mara opens the ledger.',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

const assignments = [{
  characterId: 'character-1',
  costumeId: 'costume-1',
  emotionalState: 'Suspicious',
  physicalState: 'Uninjured',
}]

describe('buildShotListContextFingerprint', () => {
  it('is deterministic regardless of assignment input order', () => {
    const second = { ...assignments[0], characterId: 'character-2' }
    expect(buildShotListContextFingerprint(scene, [assignments[0], second]))
      .toBe(buildShotListContextFingerprint(scene, [second, assignments[0]]))
  })

  it('changes when script, location, or assignments change', () => {
    const original = buildShotListContextFingerprint(scene, assignments)
    expect(buildShotListContextFingerprint({ ...scene, script: 'Changed.' }, assignments)).not.toBe(original)
    expect(buildShotListContextFingerprint({ ...scene, locationId: 'location-2' }, assignments)).not.toBe(original)
    expect(buildShotListContextFingerprint(scene, [{ ...assignments[0], costumeId: 'costume-2' }])).not.toBe(original)
  })
})
