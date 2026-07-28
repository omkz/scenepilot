import { describe, expect, it } from 'vitest'
import {
  buildVideoNegativePrompt,
  buildVideoPrompt,
} from '@/lib/ai/video/build-video-prompt'
import type { SceneDto } from '@/lib/episodes/types'
import type { ShotCharacterDto, ShotDto } from '@/lib/production/types'

const shot = {
  action: 'Raden Wijaya steps onto the wet pier.',
  cameraMovement: 'Dolly In',
  cameraAngle: 'Low Angle',
  lens: '35mm',
  emotionalIntent: 'Restrained authority',
  dialogueExcerpt: 'The river remembers.',
  timeOfDay: 'Dawn',
  lightingNotes: 'Dark low-key dawn light through dense river mist.',
  negativePrompt: 'bright modern objects',
} as ShotDto
const scene = {
  title: 'Arrival at Hujung Galuh',
  purpose: 'Establish the uneasy harbor alliance.',
} as SceneDto
const assignment = {
  characterCode: 'CHAR-001',
  characterName: 'Raden Wijaya',
  pose: 'Standing with one hand near the keris',
  action: 'Looks across the harbor',
  expression: 'Calm and watchful',
  gazeDirection: 'Toward the Yuan ships',
  physicalState: 'Wet from river mist',
} as ShotCharacterDto

describe('video motion prompt', () => {
  it('uses focused motion, performance, environment, and continuity context', () => {
    const prompt = buildVideoPrompt({ shot, scene, assignments: [assignment] })
    expect(prompt).toContain('Raden Wijaya steps onto the wet pier')
    expect(prompt).toContain('Dolly In')
    expect(prompt).toContain('dense river mist')
    expect(prompt).toContain('Raden Wijaya')
    expect(prompt).toContain('Preserve the exact character identity')
    expect(prompt).not.toContain('FORMAT:')
  })

  it('combines the default negative prompt with the Shot override', () => {
    const prompt = buildVideoNegativePrompt(shot.negativePrompt)
    expect(prompt).toContain('identity drift')
    expect(prompt).toContain('bright modern objects')
  })
})
