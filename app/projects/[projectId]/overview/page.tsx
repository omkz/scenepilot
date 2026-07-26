import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/db/queries/projects'
import { listCharacters } from '@/lib/db/queries/characters'
import { listCostumes } from '@/lib/db/queries/costumes'
import { listLocations } from '@/lib/db/queries/locations'
import { calculateAssetReadiness } from '@/lib/assets/readiness'
import { OverviewPage } from '@/components/pages/overview-page'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [project, characters, costumes, locations] = await Promise.all([
    getProjectById(projectId),
    listCharacters(projectId),
    listCostumes(projectId),
    listLocations(projectId),
  ])
  if (!project) notFound()
  return (
    <OverviewPage
      project={project}
      assetReadiness={calculateAssetReadiness(characters, costumes, locations)}
    />
  )
}
