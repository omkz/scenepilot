import 'server-only'

import type { z } from 'zod'
import { getAIProvider } from '@/lib/ai/registry'

export function generateStructured<T>(input: {
  provider: string
  model: string
  systemPrompt: string
  prompt: string
  schema: z.ZodType<T>
  temperature?: number
  maxOutputTokens?: number
}) {
  const provider = getAIProvider(input.provider)
  return provider.generateStructured({
    model: input.model,
    systemPrompt: input.systemPrompt,
    prompt: input.prompt,
    schema: input.schema,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
  })
}
