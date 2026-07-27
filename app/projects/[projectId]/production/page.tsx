import { getProductionOverview } from '@/lib/production/project-overview'
import { ProductionEpisodesPage } from '@/components/pages/production-episodes-page'

export default async function ProjectProductionPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams])
  const overview = await getProductionOverview(projectId)
  const tab = query.tab === 'generated-scenes' ? 'generated-scenes' : 'storyboards'
  return <ProductionEpisodesPage projectId={projectId} items={overview.items} tab={tab} approvedEpisodes={overview.approvedEpisodes} approvedScenes={overview.approvedScenes} approvedShots={overview.approvedShots} placeholders={overview.placeholders} />
}
