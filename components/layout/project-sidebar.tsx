'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ProjectDto } from '@/lib/projects/types'
import {
  ChevronLeft,
  LayoutDashboard,
  BookOpen,
  Tv2,
  Clapperboard,
  Upload,
  Settings2,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { NAVIGATION, type NavigationItem } from '@/lib/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_ICONS: Record<NavigationItem['icon'], React.ReactNode> = {
  overview: <LayoutDashboard size={15} />,
  story: <BookOpen size={15} />,
  episodes: <Tv2 size={15} />,
  production: <Clapperboard size={15} />,
  settings: <Settings2 size={15} />,
  export: <Upload size={15} />,
}

interface ProjectSidebarProps {
  project: ProjectDto
  projects: ProjectDto[]
  collapsed: boolean
  onToggleCollapse: () => void
}

export function ProjectSidebar({ project, projects, collapsed, onToggleCollapse }: ProjectSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn(
      'flex flex-col h-full bg-sidebar border-r border-border transition-all duration-200 shrink-0',
      collapsed ? 'w-12' : 'w-56'
    )}>
      {!collapsed && (
        <div className="p-3 border-b border-border">
          <Link href="/projects" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 group">
            <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            All Projects
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors text-left outline-none">
              <div className="w-7 h-7 rounded shrink-0 bg-gradient-to-br from-red-900 to-amber-800" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{project.name}</div>
                <div className="text-[10px] text-muted-foreground">Season {project.currentSeason} · {project.status}</div>
              </div>
              <ChevronsUpDown size={12} className="text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 bg-popover border-border">
              {projects.map(item => (
                <DropdownMenuItem key={item.id} className="p-0">
                  <Link href={`/projects/${item.id}/overview`} className="w-full flex items-center gap-2 px-2 py-1.5">
                    <div className="w-4 h-4 rounded shrink-0 bg-gradient-to-br from-red-900 to-amber-800" />
                    <span className="text-xs truncate">{item.name}</span>
                    {item.id === project.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {collapsed && (
        <div className="p-2 border-b border-border">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-red-900 to-amber-800 mx-auto" />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAVIGATION.map(item => {
          const href = `/projects/${project.id}/${item.route}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={item.id}
              href={href}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                collapsed ? 'justify-center' : '',
                isActive ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-amber-400' : ''}>{NAV_ICONS[item.icon]}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
    </aside>
  )
}
