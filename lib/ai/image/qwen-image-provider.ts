import 'server-only'

import { ImageAIError } from '@/lib/ai/image/errors'
import type { ImageAIConfig } from '@/lib/ai/image/image-provider'
import type {
  AssetConceptType,
  ImageGenerationProvider,
  ImageGenerationResult,
} from '@/lib/ai/image/types'

type Fetcher = typeof fetch

interface QwenProviderOptions {
  fetcher?: Fetcher
  sleep?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  timeoutMs?: number
}

const negativePrompt = 'Low quality, distorted anatomy, malformed hands, duplicate people, inconsistent identity, text, logo, signature, watermark, cropped important details.'

function imageSize(assetType: AssetConceptType, modern: boolean) {
  if (modern) {
    if (assetType === 'character' || assetType === 'costume') return '1728*2368'
    return '2368*1728'
  }
  if (assetType === 'character' || assetType === 'costume') return '1104*1472'
  return '1472*1104'
}

async function jsonResponse(response: Response) {
  const data = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    const code = typeof data?.code === 'string' ? data.code : 'PROVIDER_ERROR'
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
    results?: Array<{ url?: string }>
  } | undefined
  return {
    taskId: output?.task_id,
    status: output?.task_status,
    code: output?.code,
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
  const timeoutMs = options.timeoutMs ?? 90_000
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  }

  async function synchronous(input: {
    assetType: AssetConceptType
    prompt: string
    referenceImageUrls: string[]
    candidateCount: number
  }) {
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
            size: imageSize(input.assetType, true),
            negative_prompt: negativePrompt,
            prompt_extend: true,
            watermark: false,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    )
    return syncImageUrls(await jsonResponse(response))
  }

  async function oneAsynchronous(input: {
    assetType: AssetConceptType
    prompt: string
  }) {
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
            size: imageSize(input.assetType, false),
            negative_prompt: negativePrompt,
            prompt_extend: true,
            watermark: false,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    ))
    const taskId = asyncState(created).taskId
    if (!taskId) throw new ImageAIError('generation_failed', 'Qwen did not return a task identifier.')
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
        throw new ImageAIError('generation_failed', `Qwen image task failed (${state.code || state.status}).`)
      }
    }
    throw new ImageAIError('generation_timeout', 'Qwen image generation timed out.')
  }

  return {
    id: 'qwen',
    model: config.model,
    async generateAssetConcepts(input): Promise<ImageGenerationResult> {
      const startedAt = Date.now()
      try {
        const modern = config.model.startsWith('qwen-image-2.0')
          || config.model.startsWith('qwen-image-3')
        const urls = modern
          ? await synchronous(input)
          : (await Promise.all(
              Array.from({ length: input.candidateCount }, () => oneAsynchronous(input)),
            )).flat()
        if (!urls.length) {
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
        if (error instanceof ImageAIError) throw error
        if ((error as { name?: string }).name === 'TimeoutError') {
          throw new ImageAIError('generation_timeout', 'Qwen image generation timed out.')
        }
        throw new ImageAIError('generation_failed', 'Qwen image generation failed.')
      }
    },
  }
}
