import 'server-only'

import { getScene } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { getShot, listShots } from '@/lib/db/queries/shots'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'

export type ShotIssueSeverity = 'Info' | 'Warning' | 'Error'
export interface ShotIssue {
  id: string
  ruleCode: string
  severity: ShotIssueSeverity
  title: string
  description: string
  shotId: string
  sceneId: string
  characterId: string | null
  costumeId: string | null
  locationId: string | null
  suggestedAction: string | null
}

const makeIssue = (
  ruleCode: string,
  severity: ShotIssueSeverity,
  title: string,
  description: string,
  shotId: string,
  sceneId: string,
  references: Partial<Pick<ShotIssue, 'characterId' | 'costumeId' | 'locationId' | 'suggestedAction'>> = {},
): ShotIssue => ({
  id: [ruleCode, shotId, references.characterId, references.costumeId, references.locationId].filter(Boolean).join(':'),
  ruleCode,
  severity,
  title,
  description,
  shotId,
  sceneId,
  characterId: references.characterId || null,
  costumeId: references.costumeId || null,
  locationId: references.locationId || null,
  suggestedAction: references.suggestedAction || null,
})

export async function checkShot(projectId: string, episodeId: string, shotId: string) {
  const shot = await getShot(projectId, episodeId, shotId)
  if (!shot) return []
  const [scene, sceneAssignments, shotAssignments, sceneShots] = await Promise.all([
    getScene(projectId, episodeId, shot.sceneId),
    listSceneCharacters(projectId, episodeId, shot.sceneId),
    listShotCharacters(projectId, episodeId, shotId),
    listShots(projectId, episodeId, shot.sceneId),
  ])
  if (!scene) return []
  const issues: ShotIssue[] = []
  const add = (rule: string, severity: ShotIssueSeverity, title: string, description: string, references?: Parameters<typeof makeIssue>[6]) =>
    issues.push(makeIssue(rule, severity, title, description, shot.id, scene.id, references))

  if (!shot.description?.trim() && !shot.action?.trim()) add('SHOT_NO_DESCRIPTION', 'Warning', 'Shot needs description or action', 'Describe the visual beat or action.', { suggestedAction: 'Edit Shot' })
  if (!shot.locationId) add('SHOT_NO_LOCATION', 'Error', 'Shot has no location', 'Assign a project location.', { suggestedAction: 'Inherit Scene Location' })
  else if (shot.locationArchivedAt) add('ARCHIVED_ASSET_USED_IN_SHOT', 'Error', 'Archived location used', `${shot.locationName} is archived.`, { locationId: shot.locationId, suggestedAction: 'Choose Location' })
  else if (shot.locationStatus !== 'Approved') add('SHOT_LOCATION_NOT_APPROVED', 'Warning', 'Shot location is not approved', `${shot.locationName} is ${shot.locationStatus}.`, { locationId: shot.locationId, suggestedAction: 'Approve Location' })
  if (shot.locationId && scene.locationId && shot.locationId !== scene.locationId) add('SHOT_LOCATION_DIFFERS_FROM_SCENE', 'Info', 'Shot location differs from scene', 'Confirm this location override is intentional.', { locationId: shot.locationId, suggestedAction: 'Use Scene Location' })
  if (sceneAssignments.length > 0 && shotAssignments.length === 0) add('SHOT_NO_CHARACTERS', 'Warning', 'Shot has no characters', 'The parent scene contains characters.', { suggestedAction: 'Add Scene Characters' })

  for (const assignment of shotAssignments) {
    const parent = sceneAssignments.find(item => item.characterId === assignment.characterId)
    if (!parent) add('SHOT_CHARACTER_NOT_IN_SCENE', 'Error', 'Character is not in parent scene', `${assignment.characterName} is not assigned to the scene.`, { characterId: assignment.characterId, suggestedAction: 'Remove Character' })
    if (assignment.characterArchivedAt) add('ARCHIVED_ASSET_USED_IN_SHOT', 'Error', 'Archived character used', `${assignment.characterName} is archived.`, { characterId: assignment.characterId, suggestedAction: 'Remove Character' })
    else if (assignment.characterStatus !== 'Approved') add('SHOT_CHARACTER_NOT_APPROVED', 'Warning', 'Shot character is not approved', `${assignment.characterName} is ${assignment.characterStatus}.`, { characterId: assignment.characterId, suggestedAction: 'Approve Character' })
    if (!assignment.costumeId) add('SHOT_CHARACTER_NO_COSTUME', 'Warning', 'Shot character has no costume', `${assignment.characterName} needs a costume.`, { characterId: assignment.characterId, suggestedAction: 'Choose Costume' })
    else {
      if (assignment.costumeCharacterId !== assignment.characterId) add('SHOT_COSTUME_CHARACTER_MISMATCH', 'Error', 'Costume belongs to another character', `${assignment.costumeName} does not belong to ${assignment.characterName}.`, { characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Choose Costume' })
      if (assignment.costumeArchivedAt) add('ARCHIVED_ASSET_USED_IN_SHOT', 'Error', 'Archived costume used', `${assignment.costumeName} is archived.`, { characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Choose Costume' })
      else if (assignment.costumeStatus !== 'Approved') add('SHOT_COSTUME_NOT_APPROVED', 'Warning', 'Shot costume is not approved', `${assignment.costumeName} is ${assignment.costumeStatus}.`, { characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Approve Costume' })
      if (parent?.costumeId && parent.costumeId !== assignment.costumeId) add('SHOT_COSTUME_DIFFERS_FROM_SCENE', 'Info', 'Shot costume differs from scene', 'Confirm this wardrobe change is intentional.', { characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Use Scene Costume' })
    }
  }
  if (shot.targetDurationSeconds > 20) add('SHOT_DURATION_TOO_LONG', 'Warning', 'Shot duration is unusually long', 'Consider dividing this shot into shorter coverage.', { suggestedAction: 'Adjust Duration' })
  const totalDuration = sceneShots.reduce((sum, item) => sum + item.targetDurationSeconds, 0)
  if (shot.position === 1 && totalDuration > scene.targetDurationSeconds * 1.1) add('SHOTS_EXCEED_SCENE_DURATION', 'Error', 'Shots exceed scene duration', `Shots total ${totalDuration}s against ${scene.targetDurationSeconds}s.`, { suggestedAction: 'Adjust Durations' })
  else if (shot.position === 1 && totalDuration < scene.targetDurationSeconds * 0.7) add('SHOTS_UNDERFILL_SCENE_DURATION', 'Info', 'Shots underfill scene duration', `Shots total ${totalDuration}s against ${scene.targetDurationSeconds}s.`, { suggestedAction: 'Add Coverage' })
  if (shot.compositionLocked && (!shot.composition?.trim() || !shot.shotType || !shot.cameraAngle)) add('COMPOSITION_LOCKED_BUT_INCOMPLETE', 'Warning', 'Locked composition is incomplete', 'Complete camera and composition fields before locking.', { suggestedAction: 'Unlock Composition' })
  return issues.sort((a, b) => a.id.localeCompare(b.id))
}
