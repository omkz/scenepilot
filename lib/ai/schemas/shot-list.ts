import { z } from 'zod'
import {
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  LENSES,
  SCREEN_POSITIONS,
  SHOT_TIMES,
  SHOT_TYPES,
} from '@/lib/production/types'

const nullableText = (maximum: number) => z.string().max(maximum).nullable()

export const shotListCharacterSchema = z.strictObject({
  characterId: z.string(),
  costumeId: z.string().nullable(),
  screenPosition: z.enum(SCREEN_POSITIONS).nullable(),
  pose: nullableText(500),
  expression: nullableText(500),
  action: nullableText(1500),
  gazeDirection: nullableText(300),
  physicalState: nullableText(500),
})

export const shotSuggestionSchema = z.strictObject({
  temporaryId: z.string().min(1).max(100),
  title: z.string().min(2).max(150),
  description: z.string().min(10).max(2000),
  shotType: z.enum(SHOT_TYPES),
  cameraAngle: z.enum(CAMERA_ANGLES),
  cameraMovement: z.enum(CAMERA_MOVEMENTS),
  lens: z.enum(LENSES),
  composition: z.string().min(5).max(2000),
  action: z.string().min(1).max(2000),
  dialogueExcerpt: nullableText(1500),
  emotionalIntent: nullableText(500),
  estimatedDurationSeconds: z.number().int().min(1).max(120),
  locationId: z.string().nullable(),
  timeOfDay: z.enum(SHOT_TIMES),
  lightingNotes: nullableText(1500),
  generationPrompt: nullableText(5000),
  negativePrompt: nullableText(3000),
  compositionLocked: z.boolean().default(false),
  characters: z.array(shotListCharacterSchema).max(20),
})

export const shotListSchema = z.strictObject({
  sceneTitle: z.string().min(2).max(150),
  visualStrategy: z.string().min(10).max(2000),
  pacingNotes: z.string().min(10).max(1500),
  totalEstimatedDurationSeconds: z.number().int().min(1).max(600),
  shots: z.array(shotSuggestionSchema).min(1).max(60),
})

export const shotListWarningCodes = [
  'UNKNOWN_CHARACTER_REFERENCE',
  'CHARACTER_NOT_IN_SCENE',
  'CHARACTER_NOT_APPROVED',
  'CHARACTER_ARCHIVED',
  'UNKNOWN_COSTUME_REFERENCE',
  'COSTUME_CHARACTER_MISMATCH',
  'COSTUME_NOT_APPROVED',
  'COSTUME_ARCHIVED',
  'UNKNOWN_LOCATION_REFERENCE',
  'LOCATION_MISMATCH',
  'LOCATION_NOT_APPROVED',
  'LOCATION_ARCHIVED',
  'DUPLICATE_CHARACTER_ASSIGNMENT',
  'DUPLICATE_SHOT_ID',
  'EMPTY_SHOT_ACTION',
  'DURATION_OVER_TARGET',
  'DURATION_UNDER_TARGET',
  'EXCESSIVE_SHOT_COUNT',
  'INSUFFICIENT_SHOT_COVERAGE',
  'EXCESSIVE_CAMERA_MOVEMENT',
  'DIALOGUE_EXCERPT_NOT_FOUND',
  'SCENE_CONTEXT_CHANGED',
] as const

export const shotListWarningSchema = z.strictObject({
  code: z.enum(shotListWarningCodes),
  shotTemporaryId: z.string().nullable(),
  severity: z.enum(['Info', 'Warning', 'Error']),
  message: z.string().min(1).max(500),
})

export const shotListMetadataSchema = z.strictObject({
  contextFingerprint: z.string().min(1),
  shotCount: z.number().int().min(0),
  totalEstimatedDurationSeconds: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  blockingErrorCount: z.number().int().min(0),
})

export const persistedShotListSchema = shotListSchema.extend({
  warnings: z.array(shotListWarningSchema),
  metadata: shotListMetadataSchema,
})

export type ShotList = z.infer<typeof shotListSchema>
export type ShotSuggestion = z.infer<typeof shotSuggestionSchema>
export type ShotListCharacter = z.infer<typeof shotListCharacterSchema>
export type ShotListWarning = z.infer<typeof shotListWarningSchema>
export type PersistedShotList = z.infer<typeof persistedShotListSchema>

export function toShotListDraft(value: unknown): ShotList | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const parsed = shotListSchema.safeParse({
    sceneTitle: record.sceneTitle,
    visualStrategy: record.visualStrategy,
    pacingNotes: record.pacingNotes,
    totalEstimatedDurationSeconds: record.totalEstimatedDurationSeconds,
    shots: record.shots,
  })
  return parsed.success ? parsed.data : null
}
