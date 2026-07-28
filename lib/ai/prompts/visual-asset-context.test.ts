import { describe, expect, it } from 'vitest'
import { buildEpisodeOutlinePrompt } from '@/lib/ai/prompts/episode-outline'
import { buildScenePlanPrompt } from '@/lib/ai/prompts/scene-plan'
import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'
import type { EpisodeDto } from '@/lib/episodes/types'
import type { ProjectDto } from '@/lib/projects/types'

const timestamp = '2026-01-01T00:00:00.000Z'
const project: ProjectDto = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Majapahit',
  slug: 'majapahit',
  description: 'A serialized historical drama.',
  genre: 'Historical',
  primaryLanguage: 'Indonesian',
  episodeCount: 30,
  episodeDuration: '1–2 minutes',
  orientation: 'Vertical 9:16',
  status: 'Active',
  currentSeason: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: null,
}
const episode: EpisodeDto = {
  id: '00000000-0000-4000-8000-000000000002',
  projectId: project.id,
  episodeNumber: 1,
  title: 'The Alliance',
  summary: 'Two armies form an uneasy alliance.',
  outline: 'Opening hook, conflict, turning point, and cliffhanger.',
  script: null,
  cliffhanger: 'The envoy reveals a hidden seal.',
  targetDurationSeconds: 120,
  status: 'Approved',
  productionStatus: 'Not Started',
  storyboardStatus: 'Not Started',
  storyboardApprovedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: null,
}
const character: CharacterDto = {
  id: '00000000-0000-4000-8000-000000000003',
  projectId: project.id,
  assetCode: 'CHAR-001',
  name: 'Raden Wijaya',
  narrativeRole: 'Protagonist',
  age: 30,
  genderPresentation: 'Masculine',
  personality: 'Restrained and observant.',
  motivation: 'Protect his people.',
  visualDirection: 'A calm Javanese prince with restrained authority.',
  appearance: 'Lean build and composed posture.',
  distinguishingFeatures: 'A small scar above the brow.',
  approvalStatus: 'Approved',
  facialIdentityLocked: false,
  skinToneLocked: false,
  eyeColorLocked: false,
  hairstyleLocked: false,
  bodyProportionsLocked: false,
  distinguishingFeaturesLocked: false,
  accessoriesLocked: false,
  costumeCount: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: null,
}
const costume: CostumeDto = {
  id: '00000000-0000-4000-8000-000000000004',
  projectId: project.id,
  characterId: character.id,
  characterName: character.name,
  assetCode: 'COSTUME-001',
  name: 'Diplomatic Costume',
  description: 'Indigo court layers with restrained gold trim.',
  category: 'Formal',
  condition: 'Clean',
  isDefault: true,
  approvalStatus: 'Approved',
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: null,
}
const location: LocationDto = {
  id: '00000000-0000-4000-8000-000000000005',
  projectId: project.id,
  assetCode: 'LOCATION-001',
  name: 'Riverside Alliance Camp',
  description: 'A temporary alliance camp.',
  locationType: 'Exterior',
  architectureStyle: 'Bamboo shelters and command tents.',
  defaultTimeOfDay: 'Dawn',
  defaultLighting: 'Natural',
  visualIdentityNotes: 'Mist, oil lamps, wooden ships, and wet ground.',
  architectureLocked: false,
  layoutLocked: false,
  lightingLocked: false,
  approvalStatus: 'Approved',
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: null,
}

describe('text AI visual asset context', () => {
  it.each([
    ['Episode Outline', buildEpisodeOutlinePrompt({
      project,
      episode,
      previousEpisode: null,
      nextEpisode: null,
      characters: [character],
      costumes: [costume],
      locations: [location],
    })],
    ['Scene Plan', buildScenePlanPrompt({
      project,
      episode,
      previousEpisode: null,
      nextEpisode: null,
      existingScenes: [],
      existingAssignments: [],
      characters: [character],
      costumes: [costume],
      locations: [location],
    })],
  ])('%s preserves simplified visual context without image storage metadata', (_name, prompt) => {
    expect(prompt).toContain(character.visualDirection)
    expect(prompt).toContain('"appearanceSummary"')
    expect(prompt).toContain(costume.description)
    expect(prompt).toContain('"defaultCondition"')
    expect(prompt).toContain(location.visualIdentityNotes)
    expect(prompt).not.toContain('storageKey')
    expect(prompt).not.toContain('storageUrl')
    expect(prompt).not.toContain('BLOB_READ_WRITE_TOKEN')
  })
})
