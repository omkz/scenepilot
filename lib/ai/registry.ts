import 'server-only'

import type { ScenePilotAIProvider } from '@/lib/ai/types'
import { ScenePilotAIError } from '@/lib/ai/errors'
import { qwenProvider } from '@/lib/ai/providers/qwen'

const providers: Record<string, ScenePilotAIProvider> = {
  qwen: qwenProvider,
}

export function getAIProvider(providerId: string) {
  const provider = providers[providerId]
  if (!provider) {
    throw new ScenePilotAIError('AI_CONFIGURATION_ERROR', `Unknown AI provider: ${providerId}`)
  }
  return provider
}
