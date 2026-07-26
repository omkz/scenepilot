import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/db/queries/projects'
import { OverviewPage } from '@/components/pages/overview-page'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getProjectById(projectId)
  if (!project) notFound()
  return <OverviewPage project={project} />
}
