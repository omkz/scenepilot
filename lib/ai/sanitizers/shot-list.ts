import type {
  PersistedShotList,
  ShotList,
  ShotListWarning,
} from '@/lib/ai/schemas/shot-list'

export interface ShotListAssetContext {
  characters: Array<{
    id: string
    approvalStatus: string
    archivedAt: string | null
    assignedToScene: boolean
    sceneCostumeId: string | null
  }>
  costumes: Array<{
    id: string
    characterId: string
    approvalStatus: string
    archivedAt: string | null
    isDefault: boolean
  }>
  locations: Array<{
    id: string
    approvalStatus: string
    archivedAt: string | null
  }>
  sceneLocationId: string | null
  sceneScript: string
  targetDurationSeconds: number
  contextFingerprint: string
}

const blockingCodes = new Set<ShotListWarning['code']>([
  'UNKNOWN_CHARACTER_REFERENCE',
  'CHARACTER_NOT_IN_SCENE',
  'CHARACTER_NOT_APPROVED',
  'CHARACTER_ARCHIVED',
  'COSTUME_CHARACTER_MISMATCH',
  'LOCATION_MISMATCH',
  'EMPTY_SHOT_ACTION',
  'DUPLICATE_SHOT_ID',
])

function issue(
  code: ShotListWarning['code'],
  shotTemporaryId: string | null,
  message: string,
  severity?: ShotListWarning['severity'],
): ShotListWarning {
  return {
    code,
    shotTemporaryId,
    severity: severity || (blockingCodes.has(code) ? 'Error' : 'Warning'),
    message,
  }
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

function shotCountRange(target: number) {
  if (target <= 20) return { minimum: 2, maximum: 6 }
  if (target <= 45) return { minimum: 4, maximum: 10 }
  if (target <= 90) return { minimum: 6, maximum: 18 }
  return { minimum: 10, maximum: 30 }
}

export function sanitizeShotList(
  plan: ShotList,
  context: ShotListAssetContext,
): PersistedShotList {
  const warnings: ShotListWarning[] = []
  const characters = new Map(context.characters.map(item => [item.id, item]))
  const costumes = new Map(context.costumes.map(item => [item.id, item]))
  const locations = new Map(context.locations.map(item => [item.id, item]))
  const defaultCostumes = new Map(
    context.costumes
      .filter(item => item.isDefault && !item.archivedAt && item.approvalStatus === 'Approved')
      .map(item => [item.characterId, item.id]),
  )
  const usedTemporaryIds = new Set<string>()

  const shots = plan.shots.map((shot, shotIndex) => {
    let temporaryId = shot.temporaryId
    if (usedTemporaryIds.has(temporaryId)) {
      const base = temporaryId
      let suffix = shotIndex + 1
      while (usedTemporaryIds.has(`${base}-${suffix}`)) suffix += 1
      temporaryId = `${base}-${suffix}`
      warnings.push(issue(
        'DUPLICATE_SHOT_ID',
        temporaryId,
        'A duplicate temporary shot ID was normalized.',
      ))
    }
    usedTemporaryIds.add(temporaryId)

    if (!shot.action.trim()) {
      warnings.push(issue(
        'EMPTY_SHOT_ACTION',
        temporaryId,
        'Every shot needs a clear visual action.',
      ))
    }

    let locationId = shot.locationId
    if (!locationId || !locations.has(locationId)) {
      warnings.push(issue(
        'UNKNOWN_LOCATION_REFERENCE',
        temporaryId,
        'The unknown location was replaced with the approved scene location.',
      ))
      locationId = context.sceneLocationId
    } else if (locationId !== context.sceneLocationId) {
      warnings.push(issue(
        'LOCATION_MISMATCH',
        temporaryId,
        'Shot Lists currently support only the parent scene location.',
      ))
      locationId = context.sceneLocationId
    }
    const location = locationId ? locations.get(locationId) : null
    if (location?.archivedAt) {
      warnings.push(issue('LOCATION_ARCHIVED', temporaryId, 'The scene location is archived.'))
    } else if (location && location.approvalStatus !== 'Approved') {
      warnings.push(issue('LOCATION_NOT_APPROVED', temporaryId, 'The scene location is not approved.'))
    }

    const seenCharacters = new Set<string>()
    const shotCharacters = shot.characters.flatMap(assignment => {
      const character = characters.get(assignment.characterId)
      if (!character) {
        warnings.push(issue(
          'UNKNOWN_CHARACTER_REFERENCE',
          temporaryId,
          'An unknown or cross-project character reference was removed.',
        ))
        return []
      }
      if (!character.assignedToScene) {
        warnings.push(issue(
          'CHARACTER_NOT_IN_SCENE',
          temporaryId,
          'A character not assigned to the parent scene was removed.',
        ))
        return []
      }
      if (character.archivedAt) {
        warnings.push(issue('CHARACTER_ARCHIVED', temporaryId, 'An archived character was removed.'))
        return []
      }
      if (character.approvalStatus !== 'Approved') {
        warnings.push(issue('CHARACTER_NOT_APPROVED', temporaryId, 'An unapproved character was removed.'))
        return []
      }
      if (seenCharacters.has(character.id)) {
        warnings.push(issue(
          'DUPLICATE_CHARACTER_ASSIGNMENT',
          temporaryId,
          'A duplicate character assignment was removed.',
        ))
        return []
      }
      seenCharacters.add(character.id)

      let costumeId = assignment.costumeId
      if (costumeId) {
        const costume = costumes.get(costumeId)
        if (!costume) {
          warnings.push(issue(
            'UNKNOWN_COSTUME_REFERENCE',
            temporaryId,
            'An unknown or cross-project costume reference was removed.',
          ))
          costumeId = null
        } else if (costume.characterId !== character.id) {
          warnings.push(issue(
            'COSTUME_CHARACTER_MISMATCH',
            temporaryId,
            'A costume belonging to another character was removed.',
          ))
          costumeId = null
        } else if (costume.archivedAt) {
          warnings.push(issue('COSTUME_ARCHIVED', temporaryId, 'An archived costume was removed.'))
          costumeId = null
        } else if (costume.approvalStatus !== 'Approved') {
          warnings.push(issue('COSTUME_NOT_APPROVED', temporaryId, 'An unapproved costume was removed.'))
          costumeId = null
        }
      }
      if (!costumeId) {
        const sceneCostume = character.sceneCostumeId
          ? costumes.get(character.sceneCostumeId)
          : null
        costumeId = sceneCostume
          && sceneCostume.characterId === character.id
          && !sceneCostume.archivedAt
          && sceneCostume.approvalStatus === 'Approved'
          ? sceneCostume.id
          : defaultCostumes.get(character.id) || null
      }
      return [{ ...assignment, costumeId }]
    })

    if (shot.dialogueExcerpt) {
      const excerpt = normalizedText(shot.dialogueExcerpt)
      if (excerpt && !normalizedText(context.sceneScript).includes(excerpt)) {
        warnings.push(issue(
          'DIALOGUE_EXCERPT_NOT_FOUND',
          temporaryId,
          'The dialogue excerpt could not be matched to the applied Scene Script.',
        ))
      }
    }

    return {
      ...shot,
      temporaryId,
      locationId,
      characters: shotCharacters,
    }
  })

  const totalEstimatedDurationSeconds = shots.reduce(
    (total, shot) => total + shot.estimatedDurationSeconds,
    0,
  )
  const tolerance = context.targetDurationSeconds * 0.15
  if (totalEstimatedDurationSeconds > context.targetDurationSeconds + tolerance) {
    warnings.push(issue(
      'DURATION_OVER_TARGET',
      null,
      `The Shot List totals ${totalEstimatedDurationSeconds}s, more than 15% above the ${context.targetDurationSeconds}s scene target.`,
    ))
  } else if (totalEstimatedDurationSeconds < context.targetDurationSeconds - tolerance) {
    warnings.push(issue(
      'DURATION_UNDER_TARGET',
      null,
      `The Shot List totals ${totalEstimatedDurationSeconds}s, more than 15% below the ${context.targetDurationSeconds}s scene target.`,
    ))
  }

  const range = shotCountRange(context.targetDurationSeconds)
  if (shots.length > range.maximum) {
    warnings.push(issue(
      'EXCESSIVE_SHOT_COUNT',
      null,
      `This scene has ${shots.length} suggested shots; ${range.maximum} is the pacing guideline.`,
    ))
  } else if (shots.length < range.minimum) {
    warnings.push(issue(
      'INSUFFICIENT_SHOT_COVERAGE',
      null,
      `This scene has ${shots.length} suggested shots; at least ${range.minimum} is recommended.`,
    ))
  }

  const movingShots = shots.filter(shot => shot.cameraMovement !== 'Static').length
  if (shots.length >= 4 && movingShots / shots.length > 0.6) {
    warnings.push(issue(
      'EXCESSIVE_CAMERA_MOVEMENT',
      null,
      'More than 60% of the suggested shots use camera movement.',
    ))
  }

  return {
    ...plan,
    totalEstimatedDurationSeconds,
    shots,
    warnings,
    metadata: {
      contextFingerprint: context.contextFingerprint,
      shotCount: shots.length,
      totalEstimatedDurationSeconds,
      warningCount: warnings.length,
      blockingErrorCount: warnings.filter(item => item.severity === 'Error').length,
    },
  }
}
