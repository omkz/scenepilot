import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'
import type { EpisodeDto, SceneCharacterDto, SceneDto } from '@/lib/episodes/types'
import type { ProjectDto } from '@/lib/projects/types'

export const SCENE_PLAN_SYSTEM_PROMPT = "You are ScenePilot's serialized drama scene-planning assistant. Convert an approved episode outline into concise, production-aware scenes while preserving approved assets, timing, pacing, and narrative continuity."

function sceneCountGuidance(targetDurationSeconds: number) {
  if (targetDurationSeconds <= 60) return '1–3 scenes'
  if (targetDurationSeconds <= 120) return '2–5 scenes'
  return '3–10 scenes'
}

export function buildScenePlanPrompt({
  project,
  episode,
  previousEpisode,
  nextEpisode,
  existingScenes,
  existingAssignments,
  characters,
  costumes,
  locations,
}: {
  project: ProjectDto
  episode: EpisodeDto
  previousEpisode: EpisodeDto | null
  nextEpisode: EpisodeDto | null
  existingScenes: SceneDto[]
  existingAssignments: SceneCharacterDto[]
  characters: CharacterDto[]
  costumes: CostumeDto[]
  locations: LocationDto[]
}) {
  const context = {
    planningMode: existingScenes.length
      ? 'suggesting an alternative scene plan'
      : 'creating the first scene plan',
    project: {
      name: project.name,
      description: project.description,
      genre: project.genre,
      primaryLanguage: project.primaryLanguage,
      orientation: project.orientation,
      currentSeason: project.currentSeason,
      targetEpisodeFormat: project.episodeDuration,
    },
    episode: {
      number: episode.episodeNumber,
      title: episode.title,
      summary: episode.summary,
      appliedOutline: episode.outline,
      cliffhanger: episode.cliffhanger,
      targetDurationSeconds: episode.targetDurationSeconds,
      storyStatus: episode.status,
      previousEpisode: previousEpisode ? {
        title: previousEpisode.title,
        summary: previousEpisode.summary,
        cliffhanger: previousEpisode.cliffhanger,
      } : null,
      nextEpisode: nextEpisode ? {
        title: nextEpisode.title,
        summary: nextEpisode.summary,
      } : null,
    },
    sceneCountGuidance: sceneCountGuidance(episode.targetDurationSeconds),
    existingActiveScenes: existingScenes.map(scene => ({
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      purpose: scene.purpose,
      summary: scene.summary,
      location: scene.locationCode,
      characterIds: existingAssignments
        .filter(item => item.sceneId === scene.id)
        .map(item => item.characterId),
      durationSeconds: scene.targetDurationSeconds,
    })),
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
    'Create one structured scene plan from the following ScenePilot context.',
    JSON.stringify(context, null, 2),
    [
      'SCENE PLAN CONSTRAINTS:',
      '- Use only the supplied character, costume, and location IDs. Never invent UUIDs.',
      `- Write all audience-facing story content in ${project.primaryLanguage}.`,
      '- Respect the applied episode outline and preserve continuity with adjacent episodes.',
      '- Keep total duration near the episode target and give every scene a clear dramatic purpose.',
      '- Create visual and emotional progression while avoiding unnecessary location changes.',
      '- Avoid introducing excessive characters.',
      '- Assign costumes only to their owning character and reuse approved defaults where appropriate.',
      '- End the final scene with the intended episode cliffhanger.',
      '- Existing scenes are context only and will not be overwritten automatically.',
      '- Return structured output only matching the required schema.',
    ].join('\n'),
  ].join('\n\n')
}
