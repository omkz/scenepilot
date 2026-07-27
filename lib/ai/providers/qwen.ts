import 'server-only'

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateObject, NoObjectGeneratedError } from 'ai'
import type { z } from 'zod'
import { ScenePilotAIError, normalizeAIError } from '@/lib/ai/errors'
import type { ScenePilotAIProvider } from '@/lib/ai/types'

export const qwenProvider: ScenePilotAIProvider = {
  id: 'qwen',
  async generateStructured<T>(input: {
    model: string
    systemPrompt: string
    prompt: string
    schema: z.ZodType<T>
    temperature?: number
    maxOutputTokens?: number
  }) {
    const apiKey = process.env.QWEN_API_KEY
    const baseURL = process.env.QWEN_BASE_URL
    if (!apiKey || !baseURL) {
      throw new ScenePilotAIError('AI_CONFIGURATION_ERROR', 'QWEN_API_KEY and QWEN_BASE_URL are required.')
    }
    const provider = createOpenAICompatible({
      name: 'qwen',
      apiKey,
      baseURL,
      supportsStructuredOutputs: true,
    })
    const startedAt = performance.now()
    try {
      const result = await generateObject({
        model: provider(input.model),
        system: input.systemPrompt,
        prompt: input.prompt,
        schema: input.schema,
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
        abortSignal: AbortSignal.timeout(60_000),
      })
      return {
        output: result.object as T,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        },
        provider: 'qwen',
        model: input.model,
        durationMs: Math.round(performance.now() - startedAt),
      }
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new ScenePilotAIError('AI_INVALID_OUTPUT', error.message, { cause: error })
      }
      const normalizedError = normalizeAIError(error)
      if (normalizedError.code === 'AI_UNKNOWN_ERROR') {
        throw new ScenePilotAIError('AI_PROVIDER_ERROR', normalizedError.message, {
          cause: error,
        })
      }
      throw normalizedError
    }
  },
}
