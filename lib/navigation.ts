import { FEATURES, type FeatureKey } from '@/lib/features'

export type SidebarSection =
  | 'overview'
  | 'story-studio'
  | 'all-episodes'
  | 'storyboards'
  | 'project-settings'
  | 'final-episodes'

export type WorkspaceRoute = 'overview' | 'story-studio' | 'episodes' | 'production' | 'settings'

export interface NavigationItem {
  id: SidebarSection
  label: string
  route: WorkspaceRoute
  icon: 'overview' | 'story' | 'episodes' | 'production' | 'settings' | 'export'
  feature?: FeatureKey
}

const NAVIGATION_CONFIG: NavigationItem[] = [
  { id: 'overview', label: 'Overview', route: 'overview', icon: 'overview' },
  { id: 'story-studio', label: 'Story Studio', route: 'story-studio', icon: 'story' },
  { id: 'all-episodes', label: 'Episodes', route: 'episodes', icon: 'episodes' },
  { id: 'storyboards', label: 'Production', route: 'production', icon: 'production' },
  { id: 'final-episodes', label: 'Export', route: 'overview', icon: 'export', feature: 'export' },
  { id: 'project-settings', label: 'Project Settings', route: 'settings', icon: 'settings' },
]

export const NAVIGATION = NAVIGATION_CONFIG.filter(item => !item.feature || FEATURES[item.feature])

export const SECTION_META: Record<WorkspaceRoute, { label: string }> = {
  overview: { label: 'Overview' },
  'story-studio': { label: 'Story Studio' },
  episodes: { label: 'Episodes' },
  production: { label: 'Production' },
  settings: { label: 'Project Settings' },
}

export function getWorkspaceRoute(pathname: string): WorkspaceRoute {
  const segments = pathname.split('/').filter(Boolean)
  const projectsIndex = segments.indexOf('projects')
  const workspaceSegment = projectsIndex >= 0 ? segments[projectsIndex + 2] : undefined
  if (workspaceSegment && workspaceSegment in SECTION_META) {
    return workspaceSegment as WorkspaceRoute
  }
  return 'overview'
}

export function sectionHref(projectId: string, section: SidebarSection) {
  const item = NAVIGATION_CONFIG.find(candidate => candidate.id === section)
  return `/projects/${projectId}/${item?.route || 'overview'}`
}
