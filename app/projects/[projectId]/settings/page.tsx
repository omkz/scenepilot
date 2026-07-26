import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/db/queries/projects'
import { SettingsPage } from '@/components/pages/settings-page'

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ saved?: string }>
}

export default async function ProjectSettingsPage({ params, searchParams }: ProjectSettingsPageProps) {
  const { projectId } = await params
  const { saved } = await searchParams
  const project = await getProjectById(projectId)
  if (!project) notFound()
  return <SettingsPage project={project} saved={saved === '1'} />
}
