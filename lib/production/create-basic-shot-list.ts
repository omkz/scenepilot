import type { SceneDto } from '@/lib/episodes/types'
import type { ShotInput } from '@/lib/production/validation'

export function createBasicShotTemplates(scene: SceneDto, characterCount: number): ShotInput[] {
  const durations = characterCount > 1 ? [4, 6, 4] : [5, 6, 4]
  const available = Math.max(3, Math.min(scene.targetDurationSeconds, durations.reduce((sum, item) => sum + item, 0)))
  const scale = available / durations.reduce((sum, item) => sum + item, 0)
  const duration = (value: number) => Math.max(1, Math.round(value * scale))
  const shared = {
    description: null,
    composition: null,
    dialogueExcerpt: null,
    emotionalIntent: scene.emotionalTone,
    locationId: scene.locationId,
    timeOfDay: scene.timeOfDay,
    lightingNotes: null,
    generationPrompt: null,
    negativePrompt: null,
    status: 'Draft' as const,
    approvalStatus: 'Draft' as const,
    compositionLocked: false,
  }
  return [
    {
      ...shared,
      title: 'Establish the scene',
      description: `Establish ${scene.locationName || 'the scene location'} and the spatial relationship of the cast.`,
      shotType: 'Establishing',
      cameraAngle: 'Eye Level',
      cameraMovement: 'Static',
      lens: '24mm',
      action: scene.purpose || scene.summary || 'Establish the scene objective.',
      targetDurationSeconds: duration(durations[0]),
    },
    {
      ...shared,
      title: characterCount > 1 ? 'Cover the exchange' : 'Follow the action',
      description: characterCount > 1 ? 'Cover the primary character exchange.' : 'Follow the primary character action.',
      shotType: characterCount > 1 ? 'Two Shot' : 'Medium',
      cameraAngle: 'Eye Level',
      cameraMovement: 'Push In',
      lens: '50mm',
      action: scene.summary || scene.purpose || 'Advance the main scene beat.',
      targetDurationSeconds: duration(durations[1]),
    },
    {
      ...shared,
      title: scene.script?.trim() ? 'Capture the reaction' : 'Reveal the detail',
      description: scene.script?.trim() ? 'Isolate the emotional reaction that closes the beat.' : 'Reveal a meaningful visual detail.',
      shotType: scene.script?.trim() ? 'Close-Up' : 'Insert',
      cameraAngle: 'Eye Level',
      cameraMovement: 'Static',
      lens: '85mm',
      action: 'Land the final visual beat of the scene.',
      targetDurationSeconds: duration(durations[2]),
    },
  ]
}
