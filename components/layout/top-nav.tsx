'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'
import { SECTION_META, type SidebarSection } from '@/lib/navigation'
import { ACTIVE_PROJECT, GENERATION_JOBS } from '@/lib/mock-data'
import {
  ChevronRight,
  Search,
  Bell,
  Share2,
  Plus,
  Activity,
  Cpu,
  Sparkles,
  Menu,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const TEAM = [
  { initials: 'KL', color: 'bg-blue-700' },
  { initials: 'PR', color: 'bg-emerald-700' },
  { initials: 'SM', color: 'bg-rose-700' },
]

interface TopNavProps {
  activeSection: SidebarSection
  onAIToggle: () => void
  onQueueToggle: () => void
  onMobileMenuToggle: () => void
  aiOpen: boolean
}

export function TopNav({ activeSection, onAIToggle, onQueueToggle, onMobileMenuToggle, aiOpen }: TopNavProps) {
  const [, setSearchOpen] = useState(false)
  const sectionMeta = SECTION_META[activeSection] || SECTION_META.overview!
  const breadcrumbs = sectionMeta.breadcrumbs
  const primaryAction = sectionMeta.action
  const activeJobs = GENERATION_JOBS.filter(j => j.status === 'running').length

  return (
    <header className="h-11 flex items-center gap-3 px-4 border-b border-border bg-background/80 backdrop-blur shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu size={16} />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs flex-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="text-muted-foreground shrink-0" />}
            <span className={cn(
              i === breadcrumbs.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
            )}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs border border-border"
        >
          <Search size={12} />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] bg-background border border-border rounded px-1 ml-1">⌘K</kbd>
        </button>

        {FEATURES.advancedGenerationQueue && (
          <button
            onClick={onQueueToggle}
            className="relative flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Generation Queue"
          >
            <Activity size={14} />
            {activeJobs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
                {activeJobs}
              </span>
            )}
          </button>
        )}

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Bell size={14} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* AI assistant */}
        <button
          onClick={onAIToggle}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
            aiOpen
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          title="Showrunner AI"
        >
          <Sparkles size={14} />
        </button>

        {/* Team avatars */}
        <div className="flex -space-x-1.5 hidden sm:flex">
          {TEAM.map(t => (
            <Avatar key={t.initials} className="w-6 h-6 border border-background">
              <AvatarFallback className={cn('text-[9px] font-bold text-white', t.color)}>
                {t.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Share */}
        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 hidden sm:flex border-border">
          <Share2 size={11} className="mr-1" />
          Share
        </Button>

        {/* Primary action */}
        <Button size="sm" className="h-7 text-xs px-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          <Plus size={11} className="mr-1" />
          {primaryAction}
        </Button>
      </div>
    </header>
  )
}
