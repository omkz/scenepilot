import 'server-only'

import { VideoAIError } from '@/lib/ai/video/errors'
import type { VideoGenerationProvider } from '@/lib/ai/video/types'
import { createWanVideoProvider } from '@/lib/ai/video/wan-video-provider'

const DEFAULT_MODEL = 'wan2.7-i2v-2026-04-25'
const DEFAULT_RESOLUTION = '720P'
const DEFAULT_DURATION = 5
const DEFAULT_POLL_SECONDS = 15
const DEFAULT_TIMEOUT_MINUTES = 10

export interface VideoAIConfig {
  provider: 'wan'
  model: string
  resolution: '720P' | '1080P'
  defaultDurationSeconds: number
  pollIntervalSeconds: number
  taskTimeoutMinutes: number
  apiKey: string
  baseUrl: string
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback
}

function normalizeBaseUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe')
    const pathname = url.pathname.replace(/\/+$/, '')
    url.pathname = pathname.endsWith('/api/v1') ? pathname : `${pathname}/api/v1`
    return url.toString().replace(/\/+$/, '')
  } catch {
    throw new VideoAIError(
      'provider_not_configured',
      'DASHSCOPE_BASE_URL must be a valid HTTPS Model Studio endpoint.',
    )
  }
}

export function readVideoAIConfig(
  environment: NodeJS.ProcessEnv = process.env,
  requireCredentials = true,
): VideoAIConfig {
  const provider = environment.VIDEO_AI_PROVIDER || 'wan'
  if (provider !== 'wan') {
    throw new VideoAIError('provider_not_configured', `Unsupported video provider: ${provider}`)
  }
  const resolution = environment.VIDEO_AI_RESOLUTION || DEFAULT_RESOLUTION
  if (resolution !== '720P' && resolution !== '1080P') {
    throw new VideoAIError('provider_not_configured', 'VIDEO_AI_RESOLUTION must be 720P or 1080P.')
  }
  const apiKey = environment.DASHSCOPE_API_KEY?.trim() || ''
  if (requireCredentials && !apiKey) {
    throw new VideoAIError('provider_not_configured', 'DASHSCOPE_API_KEY is required.')
  }
  const baseUrl = normalizeBaseUrl(
    environment.DASHSCOPE_BASE_URL
      || 'https://dashscope-intl.aliyuncs.com/api/v1',
  )
  return {
    provider,
    model: environment.VIDEO_AI_MODEL || DEFAULT_MODEL,
    resolution,
    defaultDurationSeconds: boundedInteger(
      environment.VIDEO_AI_DEFAULT_DURATION,
      DEFAULT_DURATION,
      2,
      10,
    ),
    pollIntervalSeconds: boundedInteger(
      environment.VIDEO_AI_POLL_INTERVAL_SECONDS,
      DEFAULT_POLL_SECONDS,
      5,
      60,
    ),
    taskTimeoutMinutes: boundedInteger(
      environment.VIDEO_AI_TASK_TIMEOUT_MINUTES,
      DEFAULT_TIMEOUT_MINUTES,
      1,
      60,
    ),
    apiKey,
    baseUrl,
  }
}

export function getVideoAIStatus() {
  try {
    const config = readVideoAIConfig(process.env, false)
    return {
      configured: Boolean(config.apiKey),
      provider: config.provider,
      model: config.model,
      resolution: config.resolution,
      pollIntervalSeconds: config.pollIntervalSeconds,
    } as const
  } catch {
    return {
      configured: false,
      provider: 'wan' as const,
      model: process.env.VIDEO_AI_MODEL || DEFAULT_MODEL,
      resolution: DEFAULT_RESOLUTION as '720P',
      pollIntervalSeconds: DEFAULT_POLL_SECONDS,
    }
  }
}

export function getVideoGenerationProvider(
  config = readVideoAIConfig(),
): VideoGenerationProvider {
  return createWanVideoProvider(config)
}
