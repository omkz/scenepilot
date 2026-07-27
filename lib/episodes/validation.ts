import { z } from 'zod'
import { EPISODE_STATUSES, PRODUCTION_STATUSES, SCENE_STATUSES, SCENE_TIMES } from '@/lib/episodes/types'

const optionalText = (maximum: number, message: string) => z.string().trim().max(maximum, message).optional().transform(value => value || null)

export const episodeInputSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150, 'Title must be 150 characters or fewer'),
  summary: optionalText(2000, 'Summary must be 2,000 characters or fewer'),
  outline: optionalText(10000, 'Outline must be 10,000 characters or fewer'),
  script: optionalText(50000, 'Script must be 50,000 characters or fewer'),
  cliffhanger: optionalText(2000, 'Cliffhanger must be 2,000 characters or fewer'),
  targetDurationSeconds: z.coerce.number().int().min(15, 'Duration must be at least 15 seconds').max(600, 'Duration cannot exceed 600 seconds'),
  status: z.enum(EPISODE_STATUSES).default('Draft'),
  productionStatus: z.enum(PRODUCTION_STATUSES).default('Not Started'),
})

export const sceneInputSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150, 'Title must be 150 characters or fewer'),
  purpose: optionalText(1000, 'Purpose must be 1,000 characters or fewer'),
  summary: optionalText(2000, 'Summary must be 2,000 characters or fewer'),
  script: optionalText(20000, 'Script must be 20,000 characters or fewer'),
  emotionalTone: optionalText(200, 'Emotional tone must be 200 characters or fewer'),
  timeOfDay: z.enum(SCENE_TIMES).default('Unspecified'),
  targetDurationSeconds: z.coerce.number().int().min(1, 'Duration must be at least 1 second').max(300, 'Duration cannot exceed 300 seconds'),
  locationId: z.preprocess(value => value === '' || value === null ? null : value, z.uuid().nullable()),
  status: z.enum(SCENE_STATUSES).default('Draft'),
})

export const sceneCharacterInputSchema = z.object({
  characterId: z.uuid('Select a valid character'),
  costumeId: z.preprocess(value => value === '' || value === null ? null : value, z.uuid().nullable()),
  roleInScene: optionalText(100, 'Role must be 100 characters or fewer'),
  emotionalState: optionalText(500, 'Emotional state must be 500 characters or fewer'),
  physicalState: optionalText(500, 'Physical state must be 500 characters or fewer'),
})

export type EpisodeInput = z.infer<typeof episodeInputSchema>
export type SceneInput = z.infer<typeof sceneInputSchema>
export type SceneCharacterInput = z.infer<typeof sceneCharacterInputSchema>
