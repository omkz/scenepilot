import 'server-only'

export const AI_TASK_CONFIG = {
  episodeOutline: {
    provider: process.env.AI_DEFAULT_PROVIDER || 'qwen',
    model: process.env.AI_DEFAULT_MODEL || 'qwen-plus',
    temperature: 0.7,
    maxOutputTokens: 4000,
    promptVersion: 'episode-outline-v1',
  },
  scenePlan: {
    provider: process.env.AI_DEFAULT_PROVIDER || 'qwen',
    model: process.env.AI_DEFAULT_MODEL || 'qwen-plus',
    temperature: 0.65,
    maxOutputTokens: 6000,
    promptVersion: 'scene-plan-v1',
  },
} as const

export function getAIProviderConfigurationStatus(providerId: string) {
  if (providerId === 'qwen') {
    const missing = [
      !process.env.QWEN_API_KEY && 'QWEN_API_KEY',
      !process.env.QWEN_BASE_URL && 'QWEN_BASE_URL',
    ].filter(Boolean) as string[]
    return { configured: missing.length === 0, missing }
  }
  return { configured: false, missing: [`Unsupported provider: ${providerId}`] }
}
