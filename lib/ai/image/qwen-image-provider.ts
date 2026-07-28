import 'server-only'

import { ImageAIError } from '@/lib/ai/image/errors'
import type { ImageAIConfig } from '@/lib/ai/image/image-provider'
import type {
  AssetConceptType,
  ImageGenerationProvider,
  ImageGenerationResult,
} from '@/lib/ai/image/types'
import type { ProjectDto } from '@/lib/projects/types'

type Fetcher = typeof fetch

interface QwenProviderOptions {
  fetcher?: Fetcher
  sleep?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  timeoutMs?: number
}

const negativePrompt = 'Low quality, distorted anatomy, malformed hands, duplicate people, inconsistent identity, text, logo, signature, watermark, cropped important details.'

function imageSize(assetType: AssetConceptType) {
  if (assetType === 'character' || assetType === 'costume') return '1104*1472'
  return '1472*1104'
}

function storyboardImageSize(orientation: ProjectDto['orientation']) {
  if (orientation === 'Vertical 9:16') return '1104*1472'
  if (orientation === 'Landscape 16:9') return '1472*1104'
  return '1328*1328'
}

function combinedNegativePrompt(value?: string | null) {
  return value?.trim() ? `${negativePrompt} ${value.trim()}` : negativePrompt
}

function safeProviderValue(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 500) : null
}

function logQwenGenerationFailure(input: {
  reason: ImageAIError['reason']
  providerErrorCode?: unknown
  providerErrorMessage?: unknown
  httpStatus?: number | null
  requestId?: unknown
  assetType?: AssetConceptType | 'storyboard'
  model?: string
  candidateCount?: number
  referenceImageCount?: number
  timeoutMs?: number
}) {
  console.error('qwen_image_generation_failed', {
    reason: input.reason,
    providerErrorCode: safeProviderValue(input.providerErrorCode),
    providerErrorMessage: safeProviderValue(input.providerErrorMessage),
    httpStatus: input.httpStatus ?? null,
    requestId: safeProviderValue(input.requestId),
    assetType: input.assetType ?? null,
    model: input.model ?? null,
    candidateCount: input.candidateCount ?? null,
    referenceImageCount: input.referenceImageCount ?? null,
    timeoutMs: input.timeoutMs ?? null,
  })
}

async function jsonResponse(response: Response) {
  const data = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    const output = data?.output as Record<string, unknown> | undefined
    const code = data?.code || output?.code || 'PROVIDER_ERROR'
    logQwenGenerationFailure({
      reason: 'generation_failed',
      providerErrorCode: code,
      providerErrorMessage: data?.message || output?.message,
      httpStatus: response.status,
      requestId: data?.request_id || data?.requestId,
    })
    throw new ImageAIError('generation_failed', `Qwen image request failed (${code}).`)
  }
  return data || {}
}

function syncImageUrls(data: Record<string, unknown>) {
  const output = data.output as {
    choices?: Array<{ message?: { content?: Array<{ image?: string }> } }>
  } | undefined
  return output?.choices
    ?.flatMap(choice => choice.message?.content || [])
    .map(item => item.image)
    .filter((url): url is string => Boolean(url)) || []
}

function asyncState(data: Record<string, unknown>) {
  const output = data.output as {
    task_id?: string
    task_status?: string
    code?: string
    message?: string
    results?: Array<{ url?: string }>
  } | undefined
  return {
    taskId: output?.task_id,
    status: output?.task_status,
    code: output?.code,
    message: output?.message,
    requestId: data.request_id || data.requestId,
    urls: output?.results?.map(item => item.url).filter((url): url is string => Boolean(url)) || [],
  }
}

export function createQwenImageProvider(
  config: ImageAIConfig,
  options: QwenProviderOptions = {},
): ImageGenerationProvider {
  const fetcher = options.fetcher || fetch
  const sleep = options.sleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
  const pollIntervalMs = options.pollIntervalMs ?? 5_000
  const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs ?? 300_000
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  }

  interface QwenGenerationInput {
    logType: AssetConceptType | 'storyboard'
    prompt: string
    referenceImageUrls: string[]
    candidateCount: number
    size: string
    negativePrompt: string
    promptExtend: boolean
  }

  async function synchronous(input: QwenGenerationInput) {
    const content = [
      ...input.referenceImageUrls.slice(0, 3).map(image => ({ image })),
      { text: input.prompt },
    ]
    const response = await fetcher(
      `${config.baseUrl}/services/aigc/multimodal-generation/generation`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          input: { messages: [{ role: 'user', content }] },
          parameters: {
            n: input.candidateCount,
            size: input.size,
            negative_prompt: input.negativePrompt,
            prompt_extend: input.promptExtend,
            watermark: false,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    )
    return syncImageUrls(await jsonResponse(response))
  }

  async function oneAsynchronous(input: QwenGenerationInput) {
    const created = await jsonResponse(await fetcher(
      `${config.baseUrl}/services/aigc/text2image/image-synthesis`,
      {
        method: 'POST',
        headers: { ...headers, 'X-DashScope-Async': 'enable' },
        body: JSON.stringify({
          model: config.model,
          input: { prompt: input.prompt.slice(0, 800) },
          parameters: {
            n: 1,
            size: input.size,
            negative_prompt: input.negativePrompt,
            prompt_extend: input.promptExtend,
            watermark: false,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    ))
    const createdState = asyncState(created)
    const taskId = createdState.taskId
    if (!taskId) {
      logQwenGenerationFailure({
        reason: 'generation_failed',
        providerErrorCode: 'MISSING_TASK_ID',
        providerErrorMessage: 'Qwen did not return a task identifier.',
        httpStatus: 200,
        requestId: createdState.requestId,
      })
      throw new ImageAIError('generation_failed', 'Qwen did not return a task identifier.')
    }
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      await sleep(pollIntervalMs)
      const state = asyncState(await jsonResponse(await fetcher(
        `${config.baseUrl}/tasks/${encodeURIComponent(taskId)}`,
        {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(timeoutMs),
        },
      )))
      if (state.status === 'SUCCEEDED') return state.urls
      if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(state.status || '')) {
        logQwenGenerationFailure({
          reason: 'generation_failed',
          providerErrorCode: state.code || state.status,
          providerErrorMessage: state.message,
          httpStatus: 200,
          requestId: state.requestId,
        })
        throw new ImageAIError('generation_failed', `Qwen image task failed (${state.code || state.status}).`)
      }
    }
    throw new ImageAIError('generation_timeout', 'Qwen image generation timed out.')
  }

  async function generate(input: QwenGenerationInput): Promise<ImageGenerationResult> {
    const startedAt = Date.now()
    const requestMetadata = {
      assetType: input.logType,
      model: config.model,
      candidateCount: input.candidateCount,
      referenceImageCount: Math.min(input.referenceImageUrls.length, 3),
      timeoutMs,
    }
    console.info('qwen_image_generation_started', requestMetadata)
    try {
      const modern = config.model.startsWith('qwen-image-2.0')
        || config.model.startsWith('qwen-image-3')
      const urls = modern
        ? await synchronous(input)
        : (await Promise.all(
            Array.from({ length: input.candidateCount }, () => oneAsynchronous(input)),
          )).flat()
      if (!urls.length) {
        logQwenGenerationFailure({
          reason: 'no_images_returned',
          providerErrorCode: 'EMPTY_IMAGE_RESPONSE',
          providerErrorMessage: 'Qwen returned no image results.',
        })
        throw new ImageAIError('no_images_returned', 'Qwen returned no image results.')
      }
      return {
        images: urls.slice(0, input.candidateCount).map(url => ({
          url,
          mimeType: 'image/png',
        })),
        provider: 'qwen',
        model: config.model,
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      if (error instanceof ImageAIError) {
        if (error.reason === 'generation_timeout') {
          logQwenGenerationFailure({
            reason: error.reason,
            providerErrorCode: 'POLL_TIMEOUT',
            providerErrorMessage: error.message,
            ...requestMetadata,
          })
        }
        throw error
      }
      if ((error as { name?: string }).name === 'TimeoutError') {
        logQwenGenerationFailure({
          reason: 'generation_timeout',
          providerErrorCode: 'REQUEST_TIMEOUT',
          providerErrorMessage: (error as { message?: string }).message,
          ...requestMetadata,
        })
        throw new ImageAIError('generation_timeout', 'Qwen image generation timed out.')
      }
      logQwenGenerationFailure({
        reason: 'generation_failed',
        providerErrorCode: (error as { code?: string }).code || 'REQUEST_FAILED',
        providerErrorMessage: (error as { message?: string }).message,
      })
      throw new ImageAIError('generation_failed', 'Qwen image generation failed.')
    }
  }

  return {
    id: 'qwen',
    model: config.model,
    generateAssetConcepts(input) {
      return generate({
        logType: input.assetType,
        prompt: input.prompt,
        referenceImageUrls: input.referenceImageUrls,
        candidateCount: input.candidateCount,
        size: imageSize(input.assetType),
        negativePrompt,
        promptExtend: input.assetType === 'location',
      })
    },
    generateStoryboardImage(input) {
      return generate({
        logType: 'storyboard',
        prompt: input.prompt,
        referenceImageUrls: input.referenceImageUrls,
        candidateCount: 1,
        size: storyboardImageSize(input.orientation),
        negativePrompt: combinedNegativePrompt(input.negativePrompt),
        promptExtend: true,
      })
    },
  }
}
