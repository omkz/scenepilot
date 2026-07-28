import { z } from 'zod'
import {
  ASSET_STATUSES,
  COSTUME_CATEGORIES,
  COSTUME_CONDITIONS,
  LOCATION_LIGHTING,
  LOCATION_TIMES,
  LOCATION_TYPES,
  NARRATIVE_ROLES,
} from '@/lib/assets/types'

const optionalText = (maximum: number, message: string) => z
  .string()
  .trim()
  .max(maximum, message)
  .optional()
  .transform(value => value || null)

const checkbox = z.preprocess(value => value === 'on' || value === 'true' || value === true, z.boolean())
const optionalCheckbox = z.preprocess(
  value => value === undefined ? undefined : value === 'on' || value === 'true' || value === true,
  z.boolean().optional(),
)

export const characterInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or fewer'),
  narrativeRole: z.enum(NARRATIVE_ROLES),
  age: z.preprocess(
    value => value === '' || value === null || value === undefined ? undefined : value,
    z.coerce.number().int('Age must be a whole number').min(0, 'Age cannot be negative').max(200, 'Age cannot exceed 200').optional(),
  ),
  genderPresentation: optionalText(100, 'Gender presentation must be 100 characters or fewer'),
  personality: optionalText(1000, 'Personality must be 1,000 characters or fewer'),
  motivation: optionalText(1000, 'Motivation must be 1,000 characters or fewer'),
  visualDirection: optionalText(2000, 'Visual direction must be 2,000 characters or fewer'),
  appearance: optionalText(2000, 'Appearance must be 2,000 characters or fewer'),
  distinguishingFeatures: optionalText(1000, 'Distinguishing features must be 1,000 characters or fewer'),
  facialIdentityLocked: optionalCheckbox,
  skinToneLocked: optionalCheckbox,
  eyeColorLocked: optionalCheckbox,
  hairstyleLocked: optionalCheckbox,
  bodyProportionsLocked: optionalCheckbox,
  distinguishingFeaturesLocked: optionalCheckbox,
  accessoriesLocked: optionalCheckbox,
})

export const costumeInputSchema = z.object({
  characterId: z.uuid('Select a valid project character'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or fewer'),
  description: optionalText(2000, 'Visual direction must be 2,000 characters or fewer'),
  category: z.enum(COSTUME_CATEGORIES).default('Default'),
  condition: z.enum(COSTUME_CONDITIONS).default('Clean'),
  isDefault: checkbox,
})
export const costumeUpdateInputSchema = costumeInputSchema.omit({ characterId: true })

export const locationInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name must be 120 characters or fewer'),
  description: optionalText(2000, 'Description must be 2,000 characters or fewer'),
  locationType: z.enum(LOCATION_TYPES),
  architectureStyle: optionalText(500, 'Architecture style must be 500 characters or fewer'),
  defaultTimeOfDay: z.preprocess(
    value => value || 'Variable',
    z.enum(LOCATION_TIMES),
  ),
  defaultLighting: z.preprocess(
    value => value || 'Natural',
    z.enum(LOCATION_LIGHTING),
  ),
  visualIdentityNotes: optionalText(2000, 'Visual identity notes must be 2,000 characters or fewer'),
  architectureLocked: optionalCheckbox,
  layoutLocked: optionalCheckbox,
  lightingLocked: optionalCheckbox,
})

export const assetStatusSchema = z.enum(ASSET_STATUSES)

export type CharacterInput = z.infer<typeof characterInputSchema>
export type CostumeInput = z.infer<typeof costumeInputSchema>
export type CostumeUpdateInput = z.infer<typeof costumeUpdateInputSchema>
export type LocationInput = z.infer<typeof locationInputSchema>
