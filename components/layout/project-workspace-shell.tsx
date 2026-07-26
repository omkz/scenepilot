'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectDto } from '@/lib/projects/types'
import { sectionHref, type SidebarSection } from '@/lib/navigation'
import { ProjectSidebar } from '@/components/layout/project-sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { AIPanel } from '@/components/layout/ai-panel'

interface ProjectWorkspaceShellProps {
  project: ProjectDto
  projects: ProjectDto[]
  children: React.ReactNode
}

export function ProjectWorkspaceShell({ project, projects, children }: ProjectWorkspaceShellProps) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const handleNavigate = (section: SidebarSection) => {
    router.push(sectionHref(project.id, section))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ProjectSidebar
        project={project}
        projects={projects}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(current => !current)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopNav
          project={project}
          onAIToggle={() => setAiOpen(current => !current)}
          onMobileMenuToggle={() => setSidebarCollapsed(current => !current)}
          aiOpen={aiOpen}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">{children}</div>
          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            onNavigate={handleNavigate}
            projectName={project.name}
          />
        </div>
      </div>
    </div>
  )
}
