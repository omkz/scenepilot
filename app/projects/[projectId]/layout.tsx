import { notFound } from 'next/navigation'
import { getProjectById, listProjects } from '@/lib/db/queries/projects'
import { ProjectWorkspaceShell } from '@/components/layout/project-workspace-shell'

export const dynamic = 'force-dynamic'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params
  const [project, projects] = await Promise.all([
    getProjectById(projectId),
    listProjects(),
  ])

  if (!project) notFound()

  return (
    <ProjectWorkspaceShell project={project} projects={projects}>
      {children}
    </ProjectWorkspaceShell>
  )
}
