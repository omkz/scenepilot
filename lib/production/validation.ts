import { z } from 'zod'
import {
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  LENSES,
  SCREEN_POSITIONS,
  SHOT_APPROVAL_STATUSES,
  SHOT_STATUSES,
  SHOT_TIMES,
  SHOT_TYPES,
} from '@/lib/production/types'

const optionalText = (maximum: number) => z.preprocess(value => value === '' ? null : value, z.string().max(maximum).nullable().optional())
const optionalUuid = z.preprocess(value => value === '' ? null : value, z.uuid().nullable().optional())

export const shotInputSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: optionalText(3000),
  shotType: z.enum(SHOT_TYPES),
  cameraAngle: z.enum(CAMERA_ANGLES),
  cameraMovement: z.enum(CAMERA_MOVEMENTS),
  lens: z.enum(LENSES),
  composition: optionalText(2000),
  action: optionalText(3000),
  dialogueExcerpt: optionalText(2000),
  emotionalIntent: optionalText(500),
  targetDurationSeconds: z.coerce.number().int().min(1).max(60),
  locationId: optionalUuid,
  timeOfDay: z.enum(SHOT_TIMES).default('Continuous'),
  lightingNotes: optionalText(1000),
  generationPrompt: optionalText(10000),
  negativePrompt: optionalText(5000),
  status: z.enum(SHOT_STATUSES).default('Draft'),
  approvalStatus: z.enum(SHOT_APPROVAL_STATUSES).default('Draft'),
  compositionLocked: z.preprocess(value => value === true || value === 'on' || value === 'true', z.boolean()).default(false),
})

export const shotCharacterInputSchema = z.object({
  characterId: z.uuid(),
  costumeId: optionalUuid,
  screenPosition: z.preprocess(value => value === '' ? null : value, z.enum(SCREEN_POSITIONS).nullable().optional()),
  pose: optionalText(500),
  expression: optionalText(500),
  action: optionalText(1000),
  gazeDirection: optionalText(300),
  physicalState: optionalText(500),
})

export type ShotInput = z.infer<typeof shotInputSchema>
export type ShotCharacterInput = z.infer<typeof shotCharacterInputSchema>
