import 'server-only'

import { VideoAIError } from '@/lib/ai/video/errors'
import type { VideoAIConfig } from '@/lib/ai/video/video-provider'
import type {
  SubmitImageToVideoInput,
  VideoGenerationProvider,
  VideoTaskStatus,
} from '@/lib/ai/video/types'

type Fetcher = typeof fetch

interface WanProviderOptions {
  fetcher?: Fetcher
}

function safeValue(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 500) : null
}

function providerState(data: Record<string, unknown>) {
  const output = data.output as {
    task_id?: string
    task_status?: string
    video_url?: string
    code?: string
    message?: string
  } | undefined
  const results = output && 'results' in output
    ? output.results as Array<{ url?: string }> | undefined
    : undefined
  return {
    taskId: output?.task_id,
    status: output?.task_status,
    videoUrl: output?.video_url || results?.find(item => item.url)?.url,
    code: output?.code || data.code,
    message: output?.message || data.message,
    requestId: data.request_id || data.requestId,
  }
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    const state = providerState(data || {})
    console.error('wan_video_provider_failed', {
      provider: 'wan',
      httpStatus: response.status,
      requestId: safeValue(state.requestId),
      providerErrorCode: safeValue(state.code),
      providerErrorMessage: safeValue(state.message),
    })
    throw new VideoAIError('submit_failed', 'The video provider rejected the request.')
  }
  return data || {}
}

function mapStatus(value: string | undefined): VideoTaskStatus['status'] {
  if (value === 'PENDING') return 'Pending'
  if (value === 'RUNNING') return 'Running'
  if (value === 'SUCCEEDED') return 'Succeeded'
  return 'Failed'
}

export function createWanVideoProvider(
  config: VideoAIConfig,
  options: WanProviderOptions = {},
): VideoGenerationProvider {
  const fetcher = options.fetcher || fetch
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  }
  return {
    id: 'wan',
    model: config.model,
    async submitImageToVideo(input: SubmitImageToVideoInput) {
      const data = await parseResponse(await fetcher(
        `${config.baseUrl}/services/aigc/video-generation/video-synthesis`,
        {
          method: 'POST',
          headers: { ...headers, 'X-DashScope-Async': 'enable' },
          body: JSON.stringify({
            model: config.model,
            input: {
              prompt: input.prompt,
              negative_prompt: input.negativePrompt,
              media: [{ type: 'first_frame', url: input.firstFrameUrl }],
            },
            parameters: {
              resolution: input.resolution,
              duration: input.durationSeconds,
              prompt_extend: true,
              watermark: false,
            },
          }),
        },
      ))
      const state = providerState(data)
      if (!state.taskId) {
        throw new VideoAIError('submit_failed', 'The video provider did not return a task ID.')
      }
      console.info('wan_video_task_submitted', {
        provider: 'wan',
        model: config.model,
        taskId: state.taskId,
        requestId: safeValue(state.requestId),
      })
      return {
        provider: 'wan',
        model: config.model,
        providerTaskId: state.taskId,
        requestId: typeof state.requestId === 'string' ? state.requestId : null,
      }
    },
    async getTask(providerTaskId: string) {
      const data = await parseResponse(await fetcher(
        `${config.baseUrl}/tasks/${encodeURIComponent(providerTaskId)}`,
        { headers: { Authorization: `Bearer ${config.apiKey}` } },
      ))
      const state = providerState(data)
      const status = mapStatus(state.status)
      return {
        status,
        videoUrl: status === 'Succeeded' ? state.videoUrl : undefined,
        requestId: typeof state.requestId === 'string' ? state.requestId : null,
        providerErrorCode: status === 'Failed' ? safeValue(state.code) : null,
        providerErrorMessage: status === 'Failed' ? safeValue(state.message) : null,
      }
    },
  }
}
