import { z } from 'zod'

export const episodeOutlineSchema = z.strictObject({
  title: z.string().min(2).max(150),
  summary: z.string().min(20).max(2000),
  openingHook: z.string().min(10).max(1000),
  mainObjective: z.string().min(10).max(1000),
  conflict: z.string().min(10).max(1500),
  turningPoint: z.string().min(10).max(1500),
  endingBeat: z.string().min(10).max(1000),
  cliffhanger: z.string().min(10).max(1000),
  emotionalArc: z.string().min(10).max(1500),
  estimatedDurationSeconds: z.number().int().min(15).max(600),
  sceneSuggestions: z.array(z.strictObject({
    title: z.string().min(2).max(150),
    purpose: z.string().min(10).max(1000),
    summary: z.string().min(10).max(2000),
    emotionalTone: z.string().max(200),
    estimatedDurationSeconds: z.number().int().min(1).max(300),
    suggestedCharacterIds: z.array(z.string()).default([]),
    suggestedLocationId: z.string().nullable(),
  })).min(1).max(20),
})

export const assetReferenceWarningSchema = z.object({
  sceneIndex: z.number().int().min(0),
  field: z.enum(['suggestedCharacterIds', 'suggestedLocationId']),
  removedValue: z.string(),
  message: z.string(),
})

export const persistedEpisodeOutlineSchema = episodeOutlineSchema.extend({
  assetWarnings: z.array(assetReferenceWarningSchema),
})

export type EpisodeOutline = z.infer<typeof episodeOutlineSchema>
export type PersistedEpisodeOutline = z.infer<typeof persistedEpisodeOutlineSchema>
