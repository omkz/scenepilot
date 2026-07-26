'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ACTIVE_PROJECT, PROJECTS } from '@/lib/mock-data'
import {
  ChevronLeft,
  ChevronDown,
  LayoutDashboard,
  BookOpen,
  Tv2,
  Clapperboard,
  Film,
  Video,
  Upload,
  Settings2,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import {
  NAVIGATION,
  SECTION_TO_GROUP,
  type NavigationItem,
  type SidebarSection,
} from '@/lib/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type { SidebarSection } from '@/lib/navigation'

const NAV_ICONS: Record<NavigationItem['icon'], React.ReactNode> = {
  overview: <LayoutDashboard size={15} />,
  story: <BookOpen size={15} />,
  episodes: <Tv2 size={15} />,
  production: <Clapperboard size={15} />,
  storyboard: <Film size={14} />,
  scenes: <Video size={14} />,
  settings: <Settings2 size={15} />,
  export: <Upload size={15} />,
}

interface ProjectSidebarProps {
  activeSection: SidebarSection
  onNavigate: (section: SidebarSection) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function ProjectSidebar({ activeSection, onNavigate, collapsed, onToggleCollapse }: ProjectSidebarProps) {
  const activeGroup = SECTION_TO_GROUP[activeSection]
  const [expandedGroup, setExpandedGroup] = useState(activeGroup === 'production' ? activeGroup : '')

  const handleGroupClick = (group: typeof NAVIGATION[number]) => {
    if (group.destination) {
      onNavigate(group.destination)
      setExpandedGroup('')
      return
    }

    setExpandedGroup(current => current === group.id ? '' : group.id)
    if (SECTION_TO_GROUP[activeSection] !== group.id && group.children?.[0]) {
      onNavigate(group.children[0].id)
    }
  }

  return (
    <aside className={cn(
      'flex flex-col h-full bg-sidebar border-r border-border transition-all duration-200 shrink-0',
      collapsed ? 'w-12' : 'w-56'
    )}>
      {!collapsed && (
        <div className="p-3 border-b border-border">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 group">
            <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            All Projects
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors text-left outline-none">
              <div className={cn('w-7 h-7 rounded shrink-0 bg-gradient-to-br', ACTIVE_PROJECT.coverColor)} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{ACTIVE_PROJECT.name}</div>
                <div className="text-[10px] text-muted-foreground">Season {ACTIVE_PROJECT.currentSeason} · Active</div>
              </div>
              <ChevronsUpDown size={12} className="text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover border-border">
              {PROJECTS.map(project => (
                <DropdownMenuItem key={project.id} className="flex items-center gap-2 cursor-pointer">
                  <div className={cn('w-4 h-4 rounded shrink-0 bg-gradient-to-br', project.coverColor)} />
                  <span className="text-xs truncate">{project.name}</span>
                  {project.id === ACTIVE_PROJECT.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {collapsed && (
        <div className="p-2 border-b border-border">
          <div className={cn('w-8 h-8 rounded bg-gradient-to-br mx-auto', ACTIVE_PROJECT.coverColor)} />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAVIGATION.map(group => {
          const isExpanded = expandedGroup === group.id
          const isActive = activeGroup === group.id

          return (
            <div key={group.id}>
              <button
                onClick={() => handleGroupClick(group)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  collapsed ? 'justify-center' : 'justify-between',
                  isActive ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
                title={collapsed ? group.label : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className={isActive ? 'text-amber-400' : ''}>{NAV_ICONS[group.icon]}</span>
                  {!collapsed && <span className="font-medium">{group.label}</span>}
                </span>
                {!collapsed && group.children && (
                  <ChevronDown
                    size={12}
                    className={cn('transition-transform text-muted-foreground', isExpanded && 'rotate-180')}
                  />
                )}
              </button>

              {!collapsed && isExpanded && group.children && (
                <div className="mt-0.5 ml-2 pl-3 border-l border-border space-y-0.5">
                  {group.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onNavigate(child.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        activeSection === child.id
                          ? 'text-foreground bg-accent font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                    >
                      <span className={activeSection === child.id ? 'text-amber-400' : ''}>{NAV_ICONS[child.icon]}</span>
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
