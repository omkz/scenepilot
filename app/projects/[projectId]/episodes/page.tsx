import { listEpisodes } from '@/lib/db/queries/episodes'
import { listScenes } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { checkEpisodeContinuity } from '@/lib/continuity/check-episode'
import { EpisodesPage } from '@/components/pages/episodes-page'

export default async function ProjectEpisodesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ archived?: string }>
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams])
  const archived = query.archived === '1'
  const episodes = await listEpisodes(projectId, archived)
  const items = await Promise.all(episodes.map(async episode => {
    const [scenes, assignments, issues] = await Promise.all([
      listScenes(projectId, episode.id),
      listSceneCharacters(projectId, episode.id),
      checkEpisodeContinuity(projectId, episode.id),
    ])
    return {
      episode,
      sceneCount: scenes.length,
      characterCount: new Set(assignments.map(item => item.characterId)).size,
      warningCount: issues.filter(item => item.severity !== 'Info').length,
    }
  }))
  return <EpisodesPage projectId={projectId} items={items} archived={archived} />
}
