import { z } from 'zod'
import {
  EPISODE_DURATIONS,
  PROJECT_GENRES,
  PROJECT_LANGUAGES,
  PROJECT_ORIENTATIONS,
  PROJECT_STATUSES,
} from '@/lib/projects/types'

const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'Description must be 500 characters or fewer')
  .optional()
  .transform(value => value || null)

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be 100 characters or fewer'),
  description: descriptionSchema,
  genre: z.enum(PROJECT_GENRES),
  primaryLanguage: z.enum(PROJECT_LANGUAGES),
  episodeCount: z.coerce
    .number()
    .int('Episode count must be a whole number')
    .min(1, 'Episode count must be at least 1')
    .max(500, 'Episode count cannot exceed 500')
    .default(30),
  episodeDuration: z.enum(EPISODE_DURATIONS).default('1–2 minutes'),
  orientation: z.enum(PROJECT_ORIENTATIONS).default('Vertical 9:16'),
  status: z.enum(PROJECT_STATUSES).default('Draft'),
  currentSeason: z.coerce
    .number()
    .int('Current season must be a whole number')
    .min(1, 'Current season must be at least 1')
    .default(1),
})

export const updateProjectSchema = createProjectSchema

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
