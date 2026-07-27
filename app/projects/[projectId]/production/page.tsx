import { getProjectEpisodeOverview } from '@/lib/episodes/project-overview'
import { ProductionEpisodesPage } from '@/components/pages/production-episodes-page'

export default async function ProjectProductionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const overview = await getProjectEpisodeOverview(projectId)
  return <ProductionEpisodesPage projectId={projectId} items={overview.items} />
}
