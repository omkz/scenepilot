import { notFound } from 'next/navigation'
import { AI_TASK_CONFIG, getAIProviderConfigurationStatus } from '@/lib/ai/config'
import { getImageAIStatus } from '@/lib/ai/image/image-provider'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import { getSceneAIGeneration, listSceneGenerations } from '@/lib/db/queries/ai-generations'
import { getEpisode } from '@/lib/db/queries/episodes'
import { listScenes } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { listLocations } from '@/lib/db/queries/locations'
import { listShots } from '@/lib/db/queries/shots'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'
import { listStoryboardJobs } from '@/lib/db/queries/storyboard-jobs'
import { getEpisodeStoryboardReadiness } from '@/lib/production/readiness'
import { StoryboardWorkspace } from '@/components/production/storyboard-workspace'

export default async function ProductionEpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; episodeId: string }>
  searchParams: Promise<{
    scene?: string
    shotGeneration?: string
    selectedShot?: string
    notice?: string
    error?: string
  }>
}) {
  const [{ projectId, episodeId }, query] = await Promise.all([params, searchParams])
  const episode = await getEpisode(projectId, episodeId)
  if (!episode || !['Ready for Production', 'In Production', 'Completed', 'Published'].includes(episode.productionStatus)) notFound()
  const [scenes, readiness, sceneCharacters, costumes, locations, shotAssignments, jobs, archivedShots] = await Promise.all([
    listScenes(projectId, episodeId),
    getEpisodeStoryboardReadiness(projectId, episodeId),
    listSceneCharacters(projectId, episodeId),
    listCostumes(projectId),
    listLocations(projectId),
    listShotCharacters(projectId, episodeId),
    listStoryboardJobs(projectId, episodeId),
    listShots(projectId, episodeId, undefined, true),
  ])
  if (scenes.length === 0) notFound()
  const selectedScene = query.scene ? scenes.find(scene => scene.id === query.scene) : scenes[0]
  if (!selectedScene) notFound()
  const selectedSceneCharacters = sceneCharacters.filter(item => item.sceneId === selectedScene.id)
  const [shotListHistory, selectedShotGeneration] = await Promise.all([
    listSceneGenerations(projectId, episodeId, selectedScene.id, AI_TASK_TYPES.sceneShotList),
    query.shotGeneration
      ? getSceneAIGeneration(
          projectId,
          episodeId,
          selectedScene.id,
          query.shotGeneration,
          AI_TASK_TYPES.sceneShotList,
        )
      : Promise.resolve(null),
  ])
  const issues = readiness.scenes.flatMap(item => item.issues)
  return <StoryboardWorkspace
    projectId={projectId}
    episode={episode}
    scenes={scenes}
    selectedScene={selectedScene}
    readiness={readiness}
    sceneCharacters={selectedSceneCharacters}
    costumes={costumes}
    locations={locations}
    shotAssignments={shotAssignments}
    issues={issues}
    jobs={jobs}
    archivedShots={archivedShots}
    shotListHistory={shotListHistory}
    selectedShotGeneration={selectedShotGeneration}
    aiConfigured={getAIProviderConfigurationStatus(AI_TASK_CONFIG.shotList.provider).configured}
    imageAIStatus={getImageAIStatus()}
    selectedShotId={query.selectedShot}
    notice={query.notice}
    error={query.error}
  />
}
