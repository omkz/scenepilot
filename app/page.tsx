'use client'

import { useState } from 'react'
import { ProjectSidebar } from '@/components/layout/project-sidebar'
import { FEATURES } from '@/lib/features'
import type { SidebarSection } from '@/lib/navigation'
import { TopNav } from '@/components/layout/top-nav'
import { AIPanel } from '@/components/layout/ai-panel'
import { QueuePanel } from '@/components/layout/queue-panel'
import { OverviewPage } from '@/components/pages/overview-page'
import { AssetsPage } from '@/components/pages/assets-page'
import { StoryBiblePage } from '@/components/pages/story-bible-page'
import { SeasonPlanPage } from '@/components/pages/season-plan-page'
import { EpisodesPage } from '@/components/pages/episodes-page'
import { ProductionPage } from '@/components/pages/production-page'
import { ExportPage } from '@/components/pages/export-page'
import { SettingsPage } from '@/components/pages/settings-page'

function PageContent({
  section,
  onNavigate,
}: {
  section: SidebarSection
  onNavigate: (s: SidebarSection) => void
}) {
  if (section === 'overview') return <OverviewPage onNavigate={onNavigate} />
  if (section === 'story-studio') return <AssetsPage />
  if (section === 'all-episodes') return <EpisodesPage />
  if (section === 'storyboards' || section === 'generated-scenes') {
    return <ProductionPage view={section} onNavigate={onNavigate} />
  }
  if (section === 'assets') return <AssetsPage />
  if (section === 'story-bible') return <StoryBiblePage />
  if (section === 'season-plan' && FEATURES.advancedSeasonPlanning) return <SeasonPlanPage />
  if (
    (section === 'voice' && FEATURES.voiceGeneration) ||
    (section === 'editor' && FEATURES.videoEditor) ||
    (section === 'video' && FEATURES.advancedVideo)
  ) {
    return <ProductionPage view={section} onNavigate={onNavigate} />
  }
  if (FEATURES.export && (
    section === 'final-episodes' ||
    section === 'social-versions' ||
    section === 'subtitles' ||
    section === 'export-history'
  )) {
    return <ExportPage view={section} />
  }
  if (section === 'project-settings') return <SettingsPage />

  const label = (section as string).replace(/-/g, ' ')
  return (
    <div className="flex flex-1 items-center justify-center text-center px-4">
      <div>
        <div className="text-sm font-semibold text-foreground mb-1 capitalize">{label}</div>
        <p className="text-xs text-muted-foreground">This section is coming soon.</p>
      </div>
    </div>
  )
}

export default function ScenePilot() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)

  const handleNavigate = (section: SidebarSection) => {
    setActiveSection(section)
    setQueueOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <ProjectSidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* Top nav */}
        <TopNav
          activeSection={activeSection}
          onAIToggle={() => setAiOpen((p) => !p)}
          onQueueToggle={() => setQueueOpen((p) => !p)}
          onMobileMenuToggle={() => setSidebarCollapsed((p) => !p)}
          aiOpen={aiOpen}
        />

        {/* Queue panel dropdown */}
        {FEATURES.advancedGenerationQueue && queueOpen && (
          <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
        )}

        {/* Page + AI panel row */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <PageContent section={activeSection} onNavigate={handleNavigate} />
          </div>

          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </div>
  )
}
