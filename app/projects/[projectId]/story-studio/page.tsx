import { notFound } from 'next/navigation'
import { AssetsPage } from '@/components/pages/assets-page'
import { getProjectById } from '@/lib/db/queries/projects'
import { listCharacters } from '@/lib/db/queries/characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { listLocations } from '@/lib/db/queries/locations'
import { calculateAssetReadiness } from '@/lib/assets/readiness'
import type { StoryStudioTab } from '@/lib/assets/types'

const STORY_STUDIO_TABS: StoryStudioTab[] = ['characters', 'costumes', 'locations', 'story-bible']

interface StoryStudioPageProps {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{
    tab?: string
    archived?: string
    saved?: string
    error?: string
  }>
}

export default async function StoryStudioPage({ params, searchParams }: StoryStudioPageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams])
  const project = await getProjectById(projectId)
  if (!project) notFound()

  const activeTab = STORY_STUDIO_TABS.includes(query.tab as StoryStudioTab)
    ? query.tab as StoryStudioTab
    : 'characters'
  const archived = query.archived === '1'

  const [activeCharacters, activeCostumes, activeLocations] = await Promise.all([
    listCharacters(projectId),
    listCostumes(projectId),
    listLocations(projectId),
  ])
  const [characters, costumes, locations] = archived
    ? await Promise.all([
        listCharacters(projectId, true),
        listCostumes(projectId, true),
        listLocations(projectId, true),
      ])
    : [activeCharacters, activeCostumes, activeLocations]

  return (
    <AssetsPage
      key={`${activeTab}-${archived ? 'archived' : 'active'}`}
      projectId={projectId}
      activeTab={activeTab}
      archived={archived}
      characters={characters}
      activeCharacters={activeCharacters}
      costumes={costumes}
      locations={locations}
      readiness={calculateAssetReadiness(activeCharacters, activeCostumes, activeLocations)}
      saved={query.saved === '1'}
      error={query.error}
    />
  )
}
