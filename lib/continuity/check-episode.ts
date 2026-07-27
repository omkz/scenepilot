import 'server-only'

import { getEpisode } from '@/lib/db/queries/episodes'
import { listScenes } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import type { ContinuityIssue, ContinuitySeverity } from '@/lib/continuity/types'

function issue(
  ruleCode: string,
  severity: ContinuitySeverity,
  title: string,
  description: string,
  episodeId: string,
  references: Partial<Pick<ContinuityIssue, 'sceneId' | 'characterId' | 'costumeId' | 'locationId' | 'suggestedAction'>> = {},
): ContinuityIssue {
  const parts = [ruleCode, episodeId, references.sceneId, references.characterId, references.costumeId, references.locationId]
  return {
    id: parts.filter(Boolean).join(':'),
    ruleCode,
    severity,
    title,
    description,
    episodeId,
    sceneId: references.sceneId || null,
    characterId: references.characterId || null,
    costumeId: references.costumeId || null,
    locationId: references.locationId || null,
    suggestedAction: references.suggestedAction || null,
  }
}

export async function checkEpisodeContinuity(projectId: string, episodeId: string) {
  const [episode, scenes, assignments, costumes] = await Promise.all([
    getEpisode(projectId, episodeId),
    listScenes(projectId, episodeId),
    listSceneCharacters(projectId, episodeId),
    listCostumes(projectId),
  ])
  if (!episode) return []

  const issues: ContinuityIssue[] = []
  if (scenes.length === 0) {
    issues.push(issue('EPISODE_NO_SCENES', 'Error', 'Episode has no scenes', 'Add at least one scene before production.', episodeId, { suggestedAction: 'Add Scene' }))
  }

  for (const scene of scenes) {
    const sceneAssignments = assignments.filter(item => item.sceneId === scene.id)
    if (!scene.locationId) {
      issues.push(issue('SCENE_NO_LOCATION', 'Warning', 'Scene has no location', `${scene.title} needs a primary location.`, episodeId, { sceneId: scene.id, suggestedAction: 'Assign Location' }))
    } else if (scene.locationArchivedAt) {
      issues.push(issue('ARCHIVED_ASSET_USED', 'Error', 'Archived location is in use', `${scene.locationName} is archived but assigned to ${scene.title}.`, episodeId, { sceneId: scene.id, locationId: scene.locationId, suggestedAction: 'Choose Location' }))
    } else if (scene.locationStatus !== 'Approved') {
      issues.push(issue('LOCATION_NOT_APPROVED', 'Warning', 'Location is not approved', `${scene.locationName} is ${scene.locationStatus}.`, episodeId, { sceneId: scene.id, locationId: scene.locationId, suggestedAction: 'Approve Location' }))
    }

    if (sceneAssignments.length === 0) {
      issues.push(issue('SCENE_NO_CHARACTERS', 'Warning', 'Scene has no characters', `${scene.title} needs at least one character.`, episodeId, { sceneId: scene.id, suggestedAction: 'Add Character' }))
    }

    for (const assignment of sceneAssignments) {
      if (assignment.characterArchivedAt) {
        issues.push(issue('ARCHIVED_ASSET_USED', 'Error', 'Archived character is in use', `${assignment.characterName} is archived but assigned to ${scene.title}.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, suggestedAction: 'Remove Character' }))
      } else if (assignment.characterStatus !== 'Approved') {
        issues.push(issue('CHARACTER_NOT_APPROVED', 'Warning', 'Character is not approved', `${assignment.characterName} is ${assignment.characterStatus}.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, suggestedAction: 'Approve Character' }))
      }

      if (!assignment.costumeId) {
        const approvedDefault = costumes.find(costume =>
          costume.characterId === assignment.characterId && costume.isDefault && costume.approvalStatus === 'Approved'
        )
        issues.push(issue('CHARACTER_NO_COSTUME', 'Warning', 'Character has no costume', `${assignment.characterName} needs a scene costume.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, suggestedAction: 'Choose Costume' }))
        if (approvedDefault) {
          issues.push(issue('DEFAULT_COSTUME_AVAILABLE', 'Info', 'Approved default costume available', `Apply ${approvedDefault.name} to ${assignment.characterName}.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, costumeId: approvedDefault.id, suggestedAction: 'Apply Default Costume' }))
        }
      } else {
        if (assignment.costumeCharacterId !== assignment.characterId) {
          issues.push(issue('COSTUME_CHARACTER_MISMATCH', 'Error', 'Costume belongs to another character', `${assignment.costumeName} does not belong to ${assignment.characterName}.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Choose Costume' }))
        }
        if (assignment.costumeArchivedAt) {
          issues.push(issue('ARCHIVED_ASSET_USED', 'Error', 'Archived costume is in use', `${assignment.costumeName} is archived but assigned to ${scene.title}.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Choose Costume' }))
        } else if (assignment.costumeStatus !== 'Approved') {
          issues.push(issue('COSTUME_NOT_APPROVED', 'Warning', 'Costume is not approved', `${assignment.costumeName} is ${assignment.costumeStatus}.`, episodeId, { sceneId: scene.id, characterId: assignment.characterId, costumeId: assignment.costumeId, suggestedAction: 'Approve Costume' }))
        }
      }
    }
  }

  const totalDuration = scenes.reduce((total, scene) => total + scene.targetDurationSeconds, 0)
  if (totalDuration > episode.targetDurationSeconds * 1.1) {
    issues.push(issue('SCENE_DURATION_EXCEEDS_EPISODE', 'Error', 'Scene duration exceeds episode target', `Scenes total ${totalDuration}s against a ${episode.targetDurationSeconds}s target.`, episodeId, { suggestedAction: 'Adjust Durations' }))
  } else if (scenes.length > 0 && totalDuration < episode.targetDurationSeconds * 0.7) {
    issues.push(issue('EPISODE_DURATION_UNDERFILLED', 'Info', 'Episode duration is underfilled', `Scenes total ${totalDuration}s against a ${episode.targetDurationSeconds}s target.`, episodeId, { suggestedAction: 'Adjust Durations' }))
  }

  return issues.sort((a, b) => a.id.localeCompare(b.id))
}
