import type {
  PersistedScenePlan,
  ScenePlan,
  ScenePlanWarning,
} from '@/lib/ai/schemas/scene-plan'

export interface ScenePlanAssetContext {
  characters: Array<{ id: string }>
  costumes: Array<{
    id: string
    characterId: string
    isDefault: boolean
  }>
  locations: Array<{ id: string }>
}

function warning(
  code: ScenePlanWarning['code'],
  sceneTemporaryId: string | null,
  message: string,
): ScenePlanWarning {
  return { code, sceneTemporaryId, message }
}

export function sanitizeScenePlan(
  plan: ScenePlan,
  assets: ScenePlanAssetContext,
  targetDurationSeconds: number,
): PersistedScenePlan {
  const characterIds = new Set(assets.characters.map(item => item.id))
  const costumes = new Map(assets.costumes.map(item => [item.id, item]))
  const defaultCostumes = new Map(
    assets.costumes.filter(item => item.isDefault).map(item => [item.characterId, item.id]),
  )
  const locationIds = new Set(assets.locations.map(item => item.id))
  const warnings: ScenePlanWarning[] = []

  const scenes = plan.scenes.map(scene => {
    let suggestedLocationId = scene.suggestedLocationId
    if (suggestedLocationId && !locationIds.has(suggestedLocationId)) {
      warnings.push(warning(
        'UNKNOWN_LOCATION_REFERENCE',
        scene.temporaryId,
        'An unknown or unavailable location reference was removed.',
      ))
      suggestedLocationId = null
    }
    if (!suggestedLocationId) {
      warnings.push(warning(
        'MISSING_LOCATION',
        scene.temporaryId,
        'This scene does not have an approved location.',
      ))
    }

    const seenCharacters = new Set<string>()
    const characterAssignments = scene.characterAssignments.flatMap(assignment => {
      if (!characterIds.has(assignment.characterId)) {
        warnings.push(warning(
          'UNKNOWN_CHARACTER_REFERENCE',
          scene.temporaryId,
          'An unknown or unavailable character reference was removed.',
        ))
        return []
      }
      if (seenCharacters.has(assignment.characterId)) {
        warnings.push(warning(
          'DUPLICATE_CHARACTER_ASSIGNMENT',
          scene.temporaryId,
          'A duplicate character assignment was removed.',
        ))
        return []
      }
      seenCharacters.add(assignment.characterId)

      let costumeId = assignment.costumeId
      if (costumeId) {
        const costume = costumes.get(costumeId)
        if (!costume) {
          warnings.push(warning(
            'UNKNOWN_COSTUME_REFERENCE',
            scene.temporaryId,
            'An unknown or unavailable costume reference was removed.',
          ))
          costumeId = null
        } else if (costume.characterId !== assignment.characterId) {
          warnings.push(warning(
            'COSTUME_CHARACTER_MISMATCH',
            scene.temporaryId,
            'A costume assigned to a different character was removed.',
          ))
          costumeId = null
        }
      }
      if (!costumeId) {
        const defaultCostumeId = defaultCostumes.get(assignment.characterId)
        if (defaultCostumeId) {
          costumeId = defaultCostumeId
          warnings.push(warning(
            'DEFAULT_COSTUME_APPLIED',
            scene.temporaryId,
            'The character’s approved default costume was applied.',
          ))
        } else {
          warnings.push(warning(
            'MISSING_COSTUME',
            scene.temporaryId,
            'This character does not have an approved costume assignment.',
          ))
        }
      }
      return [{ ...assignment, costumeId }]
    })

    return {
      ...scene,
      suggestedLocationId,
      characterAssignments,
    }
  })

  const totalEstimatedDurationSeconds = scenes.reduce(
    (total, scene) => total + scene.estimatedDurationSeconds,
    0,
  )
  if (totalEstimatedDurationSeconds > targetDurationSeconds * 1.1) {
    warnings.push(warning(
      'DURATION_OVER_TARGET',
      null,
      `The scene plan totals ${totalEstimatedDurationSeconds}s, more than 10% above the ${targetDurationSeconds}s episode target.`,
    ))
  } else if (totalEstimatedDurationSeconds < targetDurationSeconds * 0.9) {
    warnings.push(warning(
      'DURATION_UNDER_TARGET',
      null,
      `The scene plan totals ${totalEstimatedDurationSeconds}s, more than 10% below the ${targetDurationSeconds}s episode target.`,
    ))
  }

  return {
    ...plan,
    totalEstimatedDurationSeconds,
    scenes,
    warnings,
  }
}
