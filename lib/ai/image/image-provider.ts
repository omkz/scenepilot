import 'server-only'

import type { ImageAIStatusDto } from '@/lib/assets/types'
import { ImageAIError } from '@/lib/ai/image/errors'
import { createQwenImageProvider } from '@/lib/ai/image/qwen-image-provider'
import type { ImageGenerationProvider } from '@/lib/ai/image/types'

const DEFAULT_MODEL = 'qwen-image-2.0-pro'
const DEFAULT_CANDIDATES = 4
const MAX_CANDIDATES = 6
const DEFAULT_REQUEST_TIMEOUT_MS = 300_000
const MIN_REQUEST_TIMEOUT_MS = 30_000
const MAX_REQUEST_TIMEOUT_MS = 600_000

export interface ImageAIConfig {
  provider: 'qwen'
  model: string
  candidateCount: number
  requestTimeoutMs: number
  apiKey: string
  baseUrl: string
}

function parseRequestTimeout(value: string | undefined) {
  if (!value?.trim()) return DEFAULT_REQUEST_TIMEOUT_MS
  const timeoutMs = Number(value)
  if (
    !Number.isInteger(timeoutMs)
    || timeoutMs < MIN_REQUEST_TIMEOUT_MS
    || timeoutMs > MAX_REQUEST_TIMEOUT_MS
  ) {
    return DEFAULT_REQUEST_TIMEOUT_MS
  }
  return timeoutMs
}

export function readImageAIConfig(
  environment: NodeJS.ProcessEnv = process.env,
  requireCredentials = true,
): ImageAIConfig {
  const provider = environment.IMAGE_AI_PROVIDER || 'qwen'
  const model = environment.IMAGE_AI_MODEL || DEFAULT_MODEL
  const candidateCount = Number(environment.IMAGE_AI_CANDIDATE_COUNT || DEFAULT_CANDIDATES)
  const requestTimeoutMs = parseRequestTimeout(environment.IMAGE_AI_REQUEST_TIMEOUT_MS)
  if (provider !== 'qwen') {
    throw new ImageAIError('provider_not_configured', `Unsupported image provider: ${provider}`)
  }
  if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > MAX_CANDIDATES) {
    throw new ImageAIError('invalid_candidate_count', 'Image candidate count must be between 1 and 6.')
  }
  const apiKey = environment.DASHSCOPE_API_KEY?.trim()
    || environment.QWEN_API_KEY?.trim()
    || ''
  if (requireCredentials && !apiKey) {
    throw new ImageAIError(
      'provider_not_configured',
      'DASHSCOPE_API_KEY or QWEN_API_KEY is required.',
    )
  }
  const baseUrl = environment.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v1'
  let normalizedBaseUrl = ''
  try {
    const parsedBaseUrl = new URL(baseUrl)
    if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.username || parsedBaseUrl.password) {
      throw new Error('unsafe base URL')
    }
    normalizedBaseUrl = parsedBaseUrl.toString().replace(/\/+$/, '')
  } catch {
    throw new ImageAIError('provider_not_configured', 'DASHSCOPE_BASE_URL must be a valid HTTPS URL.')
  }
  return {
    provider,
    model,
    candidateCount,
    requestTimeoutMs,
    apiKey,
    baseUrl: normalizedBaseUrl,
  }
}

export function getImageAIStatus(): ImageAIStatusDto {
  try {
    const config = readImageAIConfig(process.env, false)
    return {
      configured: Boolean(config.apiKey),
      provider: config.provider,
      model: config.model,
      candidateCount: config.candidateCount,
    }
  } catch {
    return {
      configured: false,
      provider: 'qwen',
      model: process.env.IMAGE_AI_MODEL || DEFAULT_MODEL,
      candidateCount: DEFAULT_CANDIDATES,
    }
  }
}

export function getImageGenerationProvider(config = readImageAIConfig()): ImageGenerationProvider {
  if (config.provider !== 'qwen') {
    throw new ImageAIError('provider_not_configured', 'The configured image provider is unsupported.')
  }
  return createQwenImageProvider(config, {
    timeoutMs: config.requestTimeoutMs,
  })
}
