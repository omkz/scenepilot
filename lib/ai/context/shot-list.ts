import { createHash } from 'node:crypto'
import type { SceneCharacterDto } from '@/lib/episodes/types'

interface FingerprintScene {
  id: string
  title: string
  purpose: string | null
  summary: string | null
  emotionalTone: string | null
  targetDurationSeconds: number
  timeOfDay: string
  locationId: string | null
  script: string | null
  updatedAt: string
}
type FingerprintAssignment = Pick<
  SceneCharacterDto,
  'characterId' | 'costumeId' | 'emotionalState' | 'physicalState'
>

export function buildShotListContextFingerprint(
  scene: FingerprintScene,
  assignments: FingerprintAssignment[],
) {
  const context = {
    sceneId: scene.id,
    title: scene.title,
    purpose: scene.purpose,
    summary: scene.summary,
    emotionalTone: scene.emotionalTone,
    targetDurationSeconds: scene.targetDurationSeconds,
    timeOfDay: scene.timeOfDay,
    locationId: scene.locationId,
    script: scene.script,
    updatedAt: scene.updatedAt,
    assignments: assignments
      .map(item => ({
        characterId: item.characterId,
        costumeId: item.costumeId,
        emotionalState: item.emotionalState,
        physicalState: item.physicalState,
      }))
      .sort((left, right) => left.characterId.localeCompare(right.characterId)),
  }
  return createHash('sha256').update(JSON.stringify(context)).digest('hex')
}
