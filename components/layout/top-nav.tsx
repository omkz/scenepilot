'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ProjectDto } from '@/lib/projects/types'
import { getWorkspaceRoute, SECTION_META } from '@/lib/navigation'
import {
  ChevronRight,
  Search,
  Bell,
  Share2,
  Sparkles,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const TEAM = [
  { initials: 'KL', color: 'bg-blue-700' },
  { initials: 'PR', color: 'bg-emerald-700' },
  { initials: 'SM', color: 'bg-rose-700' },
]

interface TopNavProps {
  project: ProjectDto
  onAIToggle: () => void
  onMobileMenuToggle: () => void
  aiOpen: boolean
}

export function TopNav({ project, onAIToggle, onMobileMenuToggle, aiOpen }: TopNavProps) {
  const pathname = usePathname()
  const route = getWorkspaceRoute(pathname)
  const breadcrumbs = [project.name, SECTION_META[route].label]

  return (
    <header className="h-11 flex items-center gap-3 px-4 border-b border-border bg-background/80 backdrop-blur shrink-0">
      <button onClick={onMobileMenuToggle} className="md:hidden text-muted-foreground hover:text-foreground">
        <Menu size={16} />
      </button>

      <nav className="flex items-center gap-1 text-xs flex-1 min-w-0">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb} className="flex items-center gap-1 min-w-0">
            {index > 0 && <ChevronRight size={11} className="text-muted-foreground shrink-0" />}
            <span className={cn(
              'truncate',
              index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>{crumb}</span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-1.5 shrink-0">
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs border border-border">
          <Search size={12} />
          <span className="hidden sm:inline">Search…</span>
        </button>
        <button className="relative flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent">
          <Bell size={14} />
        </button>
        <button
          onClick={onAIToggle}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-md',
            aiOpen ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          title="Showrunner AI"
        >
          <Sparkles size={14} />
        </button>
        <div className="flex -space-x-1.5 hidden sm:flex">
          {TEAM.map(member => (
            <Avatar key={member.initials} className="w-6 h-6 border border-background">
              <AvatarFallback className={cn('text-[9px] font-bold text-white', member.color)}>{member.initials}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 hidden sm:flex border-border">
          <Share2 size={11} className="mr-1" /> Share
        </Button>
      </div>
    </header>
  )
}
