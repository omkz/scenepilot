export const AI_ERROR_CODES = [
  'AI_CONFIGURATION_ERROR',
  'AI_PROVIDER_ERROR',
  'AI_RATE_LIMIT',
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'AI_CONTEXT_ERROR',
  'AI_UNKNOWN_ERROR',
] as const

export type AIErrorCode = typeof AI_ERROR_CODES[number]

const messages: Record<AIErrorCode, string> = {
  AI_CONFIGURATION_ERROR: 'AI provider configuration is incomplete.',
  AI_PROVIDER_ERROR: 'The provider temporarily rejected the request.',
  AI_RATE_LIMIT: 'The AI provider rate limit was reached. Try again later.',
  AI_TIMEOUT: 'The AI provider request timed out.',
  AI_INVALID_OUTPUT: 'The generated outline did not match the required structure.',
  AI_CONTEXT_ERROR: 'The episode context is incomplete or unavailable.',
  AI_UNKNOWN_ERROR: 'The outline could not be generated.',
}

export class ScenePilotAIError extends Error {
  readonly code: AIErrorCode
  readonly userMessage: string

  constructor(code: AIErrorCode, message?: string, options?: ErrorOptions) {
    super(message || messages[code], options)
    this.name = 'ScenePilotAIError'
    this.code = code
    this.userMessage = messages[code]
  }
}

export function normalizeAIError(error: unknown) {
  if (error instanceof ScenePilotAIError) return error
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ScenePilotAIError('AI_TIMEOUT', error.message, { cause: error })
  }
  const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : null
  if (statusCode === 429) return new ScenePilotAIError('AI_RATE_LIMIT', 'Provider rate limit response.', { cause: error })
  if (statusCode && statusCode >= 400) return new ScenePilotAIError('AI_PROVIDER_ERROR', `Provider returned HTTP ${statusCode}.`, { cause: error })
  return new ScenePilotAIError('AI_UNKNOWN_ERROR', error instanceof Error ? error.message : 'Unknown AI error.', { cause: error })
}
