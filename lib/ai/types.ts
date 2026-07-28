import type { z } from 'zod'

export interface ScenePilotAIUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface ScenePilotAIResult<T> {
  output: T
  rawText?: string
  usage?: ScenePilotAIUsage
  provider: string
  model: string
  durationMs: number
}

export interface ScenePilotAIProvider {
  id: string
  generateStructured<T>(input: {
    model: string
    systemPrompt: string
    prompt: string
    schema: z.ZodType<T>
    temperature?: number
    maxOutputTokens?: number
  }): Promise<ScenePilotAIResult<T>>
}

export const AI_GENERATION_STATUSES = ['Queued', 'Running', 'Completed', 'Failed', 'Applied', 'Cancelled'] as const
export type AIGenerationStatus = typeof AI_GENERATION_STATUSES[number]

export interface AIGenerationDto {
  id: string
  projectId: string
  episodeId: string | null
  sceneId: string | null
  taskType: string
  provider: string
  model: string
  promptVersion: string
  status: AIGenerationStatus
  inputSnapshot: unknown
  output: unknown
  rawOutput: string | null
  errorCode: string | null
  errorMessage: string | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  durationMs: number | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  appliedAt: string | null
  applyMetadata: unknown
}
