export const PROJECT_GENRES = [
  'Romance',
  'Fantasy',
  'Political Drama',
  'Thriller',
  'Mystery',
  'Action',
  'Historical',
  'Science Fiction',
  'Other',
] as const

export const PROJECT_LANGUAGES = [
  'English',
  'Indonesian',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Mandarin',
  'Other',
] as const

export const EPISODE_DURATIONS = [
  '30–60 seconds',
  '1–2 minutes',
  '2–5 minutes',
] as const

export const PROJECT_ORIENTATIONS = [
  'Vertical 9:16',
  'Landscape 16:9',
  'Square 1:1',
] as const

export const PROJECT_STATUSES = [
  'Draft',
  'Active',
  'Paused',
  'Completed',
  'Archived',
] as const

export type ProjectStatus = typeof PROJECT_STATUSES[number]

export interface ProjectDto {
  id: string
  name: string
  slug: string
  description: string | null
  genre: typeof PROJECT_GENRES[number]
  primaryLanguage: typeof PROJECT_LANGUAGES[number]
  episodeCount: number
  episodeDuration: typeof EPISODE_DURATIONS[number]
  orientation: typeof PROJECT_ORIENTATIONS[number]
  status: ProjectStatus
  currentSeason: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}
