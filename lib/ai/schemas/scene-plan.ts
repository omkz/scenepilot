import { z } from 'zod'
import { SCENE_TIMES } from '@/lib/episodes/types'

export const scenePlanCharacterAssignmentSchema = z.strictObject({
  characterId: z.string(),
  costumeId: z.string().nullable(),
  roleInScene: z.string().max(100).nullable(),
  emotionalState: z.string().max(500).nullable(),
  physicalState: z.string().max(500).nullable(),
})

export const scenePlanSceneSchema = z.strictObject({
  temporaryId: z.string().min(1).max(100),
  title: z.string().min(2).max(150),
  purpose: z.string().min(10).max(1000),
  summary: z.string().min(10).max(2000),
  emotionalTone: z.string().min(2).max(200),
  timeOfDay: z.enum(SCENE_TIMES),
  estimatedDurationSeconds: z.number().int().min(1).max(300),
  suggestedLocationId: z.string().nullable(),
  characterAssignments: z.array(scenePlanCharacterAssignmentSchema).max(20),
  continuityNotes: z.array(z.string().max(500)).max(20),
  productionNotes: z.array(z.string().max(500)).max(20),
})

export const scenePlanSchema = z.strictObject({
  episodeTitle: z.string().min(2).max(150),
  planningSummary: z.string().min(10).max(2000),
  totalEstimatedDurationSeconds: z.number().int().min(1).max(600),
  scenes: z.array(scenePlanSceneSchema).min(1).max(20),
})

export const scenePlanWarningCodes = [
  'UNKNOWN_CHARACTER_REFERENCE',
  'UNKNOWN_COSTUME_REFERENCE',
  'COSTUME_CHARACTER_MISMATCH',
  'DEFAULT_COSTUME_APPLIED',
  'MISSING_COSTUME',
  'UNKNOWN_LOCATION_REFERENCE',
  'MISSING_LOCATION',
  'DURATION_OVER_TARGET',
  'DURATION_UNDER_TARGET',
  'DUPLICATE_CHARACTER_ASSIGNMENT',
] as const

export const scenePlanWarningSchema = z.strictObject({
  code: z.enum(scenePlanWarningCodes),
  sceneTemporaryId: z.string().nullable(),
  message: z.string().min(1).max(500),
})

export const persistedScenePlanSchema = scenePlanSchema.extend({
  warnings: z.array(scenePlanWarningSchema),
})

export type ScenePlan = z.infer<typeof scenePlanSchema>
export type ScenePlanScene = z.infer<typeof scenePlanSceneSchema>
export type ScenePlanWarning = z.infer<typeof scenePlanWarningSchema>
export type PersistedScenePlan = z.infer<typeof persistedScenePlanSchema>
