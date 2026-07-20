'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ACTIVE_PROJECT, PROJECTS } from '@/lib/mock-data'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  BookOpen,
  Tv2,
  Clapperboard,
  Upload,
  Settings2,
  Users,
  MapPin,
  Scroll,
  Calendar,
  Film,
  Video,
  Mic,
  Scissors,
  FileCheck,
  Share2,
  Languages,
  History,
  Sliders,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type SidebarSection = 'overview' | 'assets' | 'story-bible' | 'season-plan' | 'all-episodes' | 'drafts' | 'in-production' | 'published' | 'storyboards' | 'video' | 'voice' | 'editor' | 'final-episodes' | 'social-versions' | 'subtitles' | 'export-history' | 'project-settings'

interface NavGroup {
  id: string
  label: string
  icon: React.ReactNode
  children?: { id: SidebarSection; label: string; icon?: React.ReactNode }[]
  single?: SidebarSection
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard size={15} />,
    single: 'overview',
  },
  {
    id: 'story-studio',
    label: 'Story Studio',
    icon: <BookOpen size={15} />,
    children: [
      { id: 'assets', label: 'Assets', icon: <Users size={14} /> },
      { id: 'story-bible', label: 'Story Bible', icon: <Scroll size={14} /> },
      { id: 'season-plan', label: 'Season Plan', icon: <Calendar size={14} /> },
    ],
  },
  {
    id: 'episodes',
    label: 'Episodes',
    icon: <Tv2 size={15} />,
    children: [
      { id: 'all-episodes', label: 'All Episodes' },
      { id: 'drafts', label: 'Drafts' },
      { id: 'in-production', label: 'In Production' },
      { id: 'published', label: 'Published' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: <Clapperboard size={15} />,
    children: [
      { id: 'storyboards', label: 'Storyboards', icon: <Film size={14} /> },
      { id: 'video', label: 'Video', icon: <Video size={14} /> },
      { id: 'voice', label: 'Voice', icon: <Mic size={14} /> },
      { id: 'editor', label: 'Editor', icon: <Scissors size={14} /> },
    ],
  },
  {
    id: 'export',
    label: 'Export',
    icon: <Upload size={15} />,
    children: [
      { id: 'final-episodes', label: 'Final Episodes', icon: <FileCheck size={14} /> },
      { id: 'social-versions', label: 'Social Versions', icon: <Share2 size={14} /> },
      { id: 'subtitles', label: 'Subtitles', icon: <Languages size={14} /> },
      { id: 'export-history', label: 'Export History', icon: <History size={14} /> },
    ],
  },
  {
    id: 'project-settings',
    label: 'Project Settings',
    icon: <Settings2 size={15} />,
    single: 'project-settings',
  },
]

// Map sidebar sections to their parent group for auto-expand
const SECTION_TO_GROUP: Record<string, string> = {
  overview: 'overview',
  assets: 'story-studio',
  'story-bible': 'story-studio',
  'season-plan': 'story-studio',
  'all-episodes': 'episodes',
  drafts: 'episodes',
  'in-production': 'episodes',
  published: 'episodes',
  storyboards: 'production',
  video: 'production',
  voice: 'production',
  editor: 'production',
  'final-episodes': 'export',
  'social-versions': 'export',
  subtitles: 'export',
  'export-history': 'export',
  'project-settings': 'project-settings',
}

interface ProjectSidebarProps {
  activeSection: SidebarSection
  onNavigate: (section: SidebarSection) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function ProjectSidebar({ activeSection, onNavigate, collapsed, onToggleCollapse }: ProjectSidebarProps) {
  const activeGroup = SECTION_TO_GROUP[activeSection] || 'overview'
  const [expandedGroup, setExpandedGroup] = useState<string>(activeGroup)

  const handleGroupClick = (group: NavGroup) => {
    if (group.single) {
      onNavigate(group.single)
      setExpandedGroup(group.id)
    } else {
      setExpandedGroup(prev => prev === group.id ? '' : group.id)
      if (group.children && group.children.length > 0) {
        // navigate to first child if not in this group
        if (SECTION_TO_GROUP[activeSection] !== group.id) {
          onNavigate(group.children[0].id)
        }
      }
    }
  }

  return (
    <aside className={cn(
      'flex flex-col h-full bg-sidebar border-r border-border transition-all duration-200 shrink-0',
      collapsed ? 'w-12' : 'w-56'
    )}>
      {/* Project header */}
      {!collapsed && (
        <div className="p-3 border-b border-border">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 group"
          >
            <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            All Projects
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors group">
                <div className={cn('w-7 h-7 rounded shrink-0 bg-gradient-to-br', ACTIVE_PROJECT.coverColor)} />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{ACTIVE_PROJECT.name}</div>
                  <div className="text-[10px] text-muted-foreground">Season {ACTIVE_PROJECT.currentSeason} · Active</div>
                </div>
                <ChevronsUpDown size={12} className="text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover border-border">
              {PROJECTS.map(p => (
                <DropdownMenuItem key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <div className={cn('w-4 h-4 rounded shrink-0 bg-gradient-to-br', p.coverColor)} />
                  <span className="text-xs truncate">{p.name}</span>
                  {p.id === ACTIVE_PROJECT.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_GROUPS.map(group => {
          const isExpanded = expandedGroup === group.id
          const isGroupActive = SECTION_TO_GROUP[activeSection] === group.id

          return (
            <div key={group.id}>
              <button
                onClick={() => handleGroupClick(group)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  collapsed ? 'justify-center' : 'justify-between',
                  isGroupActive
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
                title={collapsed ? group.label : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className={isGroupActive ? 'text-amber-400' : ''}>{group.icon}</span>
                  {!collapsed && <span className="font-medium">{group.label}</span>}
                </span>
                {!collapsed && !group.single && (
                  <ChevronDown
                    size={12}
                    className={cn('transition-transform text-muted-foreground', isExpanded && 'rotate-180')}
                  />
                )}
              </button>

              {!collapsed && !group.single && isExpanded && group.children && (
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
                      {child.icon && (
                        <span className={activeSection === child.id ? 'text-amber-400' : ''}>{child.icon}</span>
                      )}
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
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
