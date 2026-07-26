import type { CharacterDto, CostumeDto, LocationDto, StoryStudioTab } from '@/lib/assets/types'

export interface AssetReadiness {
  characters: { total: number; approved: number }
  costumes: { total: number; approved: number }
  locations: { total: number; approved: number }
  nextAction: {
    title: string
    detail: string
    tab: StoryStudioTab
  }
}

export function calculateAssetReadiness(
  characters: CharacterDto[],
  costumes: CostumeDto[],
  locations: LocationDto[],
): AssetReadiness {
  const approvedCharacters = characters.filter(item => item.approvalStatus === 'Approved')
  const approvedCostumes = costumes.filter(item => item.approvalStatus === 'Approved')
  const approvedLocations = locations.filter(item => item.approvalStatus === 'Approved')

  let nextAction: AssetReadiness['nextAction']

  if (characters.length === 0) {
    nextAction = {
      title: 'Create the first character',
      detail: 'Build the recurring cast before defining wardrobes and production locations.',
      tab: 'characters',
    }
  } else if (approvedCharacters.length === 0) {
    nextAction = {
      title: 'Approve a character',
      detail: 'Move a finished character reference through review and approval.',
      tab: 'characters',
    }
  } else if (!approvedCharacters.some(character =>
    costumes.some(costume => costume.characterId === character.id && costume.isDefault)
  )) {
    nextAction = {
      title: 'Create a default costume',
      detail: 'Assign a stable default wardrobe to an approved character.',
      tab: 'costumes',
    }
  } else if (approvedLocations.length === 0) {
    nextAction = {
      title: locations.length === 0 ? 'Create the primary location' : 'Approve a location',
      detail: 'Define and approve the reusable visual identity of the story world.',
      tab: 'locations',
    }
  } else {
    nextAction = {
      title: 'Continue to Story Bible',
      detail: 'Core reusable assets are ready for the project story foundation.',
      tab: 'story-bible',
    }
  }

  return {
    characters: { total: characters.length, approved: approvedCharacters.length },
    costumes: { total: costumes.length, approved: approvedCostumes.length },
    locations: { total: locations.length, approved: approvedLocations.length },
    nextAction,
  }
}
