import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'
import type { EpisodeDto } from '@/lib/episodes/types'
import type { ProjectDto } from '@/lib/projects/types'

export const EPISODE_OUTLINE_SYSTEM_PROMPT = "You are ScenePilot's serialized drama planning assistant. Create concise, production-aware episode plans while preserving approved assets and narrative continuity."

export function buildEpisodeOutlinePrompt({
  project,
  episode,
  previousEpisode,
  nextEpisode,
  characters,
  costumes,
  locations,
}: {
  project: ProjectDto
  episode: EpisodeDto
  previousEpisode: EpisodeDto | null
  nextEpisode: EpisodeDto | null
  characters: CharacterDto[]
  costumes: CostumeDto[]
  locations: LocationDto[]
}) {
  const context = {
    project: {
      name: project.name,
      description: project.description,
      genre: project.genre,
      primaryLanguage: project.primaryLanguage,
      targetEpisodeCount: project.episodeCount,
      targetEpisodeDuration: project.episodeDuration,
      orientation: project.orientation,
      currentSeason: project.currentSeason,
    },
    episode: {
      number: episode.episodeNumber,
      currentTitle: episode.title,
      currentSummary: episode.summary,
      existingOutline: episode.outline,
      cliffhanger: episode.cliffhanger,
      targetDurationSeconds: episode.targetDurationSeconds,
      previousEpisode: previousEpisode ? {
        number: previousEpisode.episodeNumber,
        title: previousEpisode.title,
        summary: previousEpisode.summary,
        cliffhanger: previousEpisode.cliffhanger,
      } : null,
      nextEpisodePlanningContext: nextEpisode ? {
        number: nextEpisode.episodeNumber,
        title: nextEpisode.title,
        summary: nextEpisode.summary,
      } : null,
    },
    approvedCharacters: characters.map(character => ({
      id: character.id,
      assetCode: character.assetCode,
      name: character.name,
      narrativeRole: character.narrativeRole,
      personality: character.personality,
      motivation: character.motivation,
      visualDirection: character.visualDirection,
      appearanceSummary: character.appearance,
      distinguishingFeatures: character.distinguishingFeatures,
    })),
    approvedCostumes: costumes.map(costume => ({
      id: costume.id,
      assetCode: costume.assetCode,
      name: costume.name,
      characterId: costume.characterId,
      assignedCharacter: costume.characterName,
      category: costume.category,
      defaultCondition: costume.condition,
      visualDirection: costume.description,
      isDefault: costume.isDefault,
    })),
    approvedLocations: locations.map(location => ({
      id: location.id,
      assetCode: location.assetCode,
      name: location.name,
      description: location.description,
      locationType: location.locationType,
      architectureStyle: location.architectureStyle,
      defaultTimeOfDay: location.defaultTimeOfDay,
      defaultLighting: location.defaultLighting,
      visualDirection: location.visualIdentityNotes,
    })),
  }

  return [
    'Create one structured episode outline from the following ScenePilot context.',
    JSON.stringify(context, null, 2),
    [
      'STORY CONSTRAINTS:',
      '- Preserve existing character identities and established narrative continuity.',
      '- Use only supplied character and location IDs in scene suggestions.',
      '- Respect the episode target duration and short-drama pacing.',
      '- Create a strong opening hook, escalating conflict, and a clear turning point.',
      '- End with a cliffhanger suitable for serialized short drama.',
      '- Avoid introducing excessive new characters.',
      '- Maintain continuity with the previous episode and do not contradict next-episode planning context.',
      `- Write all audience-facing story content in ${project.primaryLanguage}.`,
      '- Return only structured output matching the required schema.',
    ].join('\n'),
  ].join('\n\n')
}
