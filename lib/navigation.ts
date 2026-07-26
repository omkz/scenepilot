import { FEATURES, type FeatureKey } from '@/lib/features'

export type SidebarSection =
  | 'overview'
  | 'story-studio'
  | 'assets'
  | 'story-bible'
  | 'season-plan'
  | 'all-episodes'
  | 'drafts'
  | 'in-production'
  | 'published'
  | 'storyboards'
  | 'generated-scenes'
  | 'video'
  | 'voice'
  | 'editor'
  | 'final-episodes'
  | 'social-versions'
  | 'subtitles'
  | 'export-history'
  | 'project-settings'

export interface NavigationItem {
  id: SidebarSection
  label: string
  icon: 'overview' | 'story' | 'episodes' | 'production' | 'storyboard' | 'scenes' | 'settings' | 'export'
}

export interface NavigationGroup {
  id: string
  label: string
  icon: NavigationItem['icon']
  destination?: SidebarSection
  children?: NavigationItem[]
  feature?: FeatureKey
}

const NAVIGATION_CONFIG: NavigationGroup[] = [
  { id: 'overview', label: 'Overview', icon: 'overview', destination: 'overview' },
  { id: 'story-studio', label: 'Story Studio', icon: 'story', destination: 'story-studio' },
  { id: 'episodes', label: 'Episodes', icon: 'episodes', destination: 'all-episodes' },
  {
    id: 'production',
    label: 'Production',
    icon: 'production',
    children: [
      { id: 'storyboards', label: 'Storyboards', icon: 'storyboard' },
      { id: 'generated-scenes', label: 'Generated Scenes', icon: 'scenes' },
    ],
  },
  {
    id: 'export',
    label: 'Export',
    icon: 'export',
    destination: 'final-episodes',
    feature: 'export',
  },
  { id: 'project-settings', label: 'Project Settings', icon: 'settings', destination: 'project-settings' },
]

export const NAVIGATION = NAVIGATION_CONFIG.filter(group => !group.feature || FEATURES[group.feature])

export const SECTION_TO_GROUP: Record<SidebarSection, string> = {
  overview: 'overview',
  'story-studio': 'story-studio',
  assets: 'story-studio',
  'story-bible': 'story-studio',
  'season-plan': 'story-studio',
  'all-episodes': 'episodes',
  drafts: 'episodes',
  'in-production': 'episodes',
  published: 'episodes',
  storyboards: 'production',
  'generated-scenes': 'production',
  video: 'production',
  voice: 'production',
  editor: 'production',
  'final-episodes': 'export',
  'social-versions': 'export',
  subtitles: 'export',
  'export-history': 'export',
  'project-settings': 'project-settings',
}

export const SECTION_META: Partial<Record<SidebarSection, { breadcrumbs: string[]; action: string }>> = {
  overview: { breadcrumbs: ['Crimson Signal', 'Overview'], action: 'Create Episode' },
  'story-studio': { breadcrumbs: ['Crimson Signal', 'Story Studio'], action: 'Add Character' },
  'all-episodes': { breadcrumbs: ['Crimson Signal', 'Episodes', 'All Episodes'], action: 'Create Episode' },
  storyboards: { breadcrumbs: ['Crimson Signal', 'Production', 'Storyboards'], action: 'Generate Storyboard' },
  'generated-scenes': { breadcrumbs: ['Crimson Signal', 'Production', 'Generated Scenes'], action: 'Generate Scene' },
  'project-settings': { breadcrumbs: ['Crimson Signal', 'Project Settings'], action: 'Save Settings' },
}
