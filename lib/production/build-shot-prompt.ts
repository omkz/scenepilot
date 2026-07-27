import type { ProjectDto } from '@/lib/projects/types'
import type { SceneDto } from '@/lib/episodes/types'
import type { ShotCharacterDto, ShotDto } from '@/lib/production/types'
import type { CharacterDto, LocationDto } from '@/lib/assets/types'

export function buildShotPrompt({
  project,
  scene,
  shot,
  characters,
  characterAssets,
  location,
}: {
  project: ProjectDto
  scene: SceneDto
  shot: ShotDto
  characters: ShotCharacterDto[]
  characterAssets: CharacterDto[]
  location: LocationDto | null
}) {
  const cast = characters.length
    ? characters.map(item => {
      const asset = characterAssets.find(character => character.id === item.characterId)
      const locks = asset ? [
        asset.facialIdentityLocked && 'facial identity',
        asset.skinToneLocked && 'skin tone',
        asset.eyeColorLocked && 'eye color',
        asset.hairstyleLocked && 'hairstyle',
        asset.bodyProportionsLocked && 'body proportions',
        asset.distinguishingFeaturesLocked && 'distinguishing features',
        asset.accessoriesLocked && 'accessories',
      ].filter(Boolean) : []
      return [
      `${item.characterCode} — ${item.characterName}.`,
      item.costumeCode ? `${item.costumeCode} — ${item.costumeName}.` : 'No costume reference assigned.',
      item.pose ? `Pose: ${item.pose}.` : null,
      item.expression ? `Expression: ${item.expression}.` : null,
      item.physicalState ? `Physical state: ${item.physicalState}.` : null,
      locks.length ? `Locked: ${locks.join(', ')}.` : null,
      ].filter(Boolean).join('\n')
    }).join('\n\n')
    : 'No characters assigned.'
  return [
    `FORMAT:\n${project.orientation}, serialized short drama.`,
    `SHOT:\n${shot.shotType}, ${shot.cameraAngle}, ${shot.cameraMovement}, ${shot.lens}.\n${shot.description || shot.action || shot.title}`,
    `LOCATION:\n${shot.locationCode || 'No location code'} — ${shot.locationName || 'Unassigned'}.\n${location?.visualIdentityNotes || location?.architectureStyle || 'Preserve the approved location identity.'}\nLocked: ${[location?.architectureLocked && 'architecture', location?.layoutLocked && 'layout', location?.lightingLocked && 'lighting'].filter(Boolean).join(', ') || 'none'}.\nTime: ${shot.timeOfDay}.${shot.lightingNotes ? `\nLighting: ${shot.lightingNotes}` : ''}`,
    `CHARACTERS:\n${cast}`,
    `ACTION:\n${shot.action || scene.purpose || scene.summary || 'Follow the planned scene action.'}`,
    `STORY CONTEXT:\n${scene.title}. ${scene.purpose || scene.summary || ''}`.trim(),
    'CONTINUITY:\nPreserve approved facial identity, hairstyle, body proportions, costume design, character physical state, and location layout.',
  ].join('\n\n')
}
