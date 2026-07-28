import { describe, expect, it, vi } from 'vitest'
import { createWanVideoProvider } from '@/lib/ai/video/wan-video-provider'
import { readVideoAIConfig } from '@/lib/ai/video/video-provider'

const environment = (values: Record<string, string>) => ({
  NODE_ENV: 'test',
  DASHSCOPE_API_KEY: 'test-key',
  ...values,
}) as NodeJS.ProcessEnv

describe('Wan video provider', () => {
  it('normalizes workspace endpoints with and without api/v1', () => {
    expect(readVideoAIConfig(environment({
      DASHSCOPE_BASE_URL: 'https://workspace.ap-southeast-1.maas.aliyuncs.com',
    })).baseUrl).toBe('https://workspace.ap-southeast-1.maas.aliyuncs.com/api/v1')
    expect(readVideoAIConfig(environment({
      DASHSCOPE_BASE_URL: 'https://workspace.ap-southeast-1.maas.aliyuncs.com/api/v1',
    })).baseUrl).toBe('https://workspace.ap-southeast-1.maas.aliyuncs.com/api/v1')
  })

  it('submits one asynchronous image-to-video task', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      new Response(JSON.stringify({
        output: { task_id: 'wan-task-1', task_status: 'PENDING' },
        request_id: 'request-1',
      }), { status: 200 })
    ))
    const config = readVideoAIConfig(environment({
      DASHSCOPE_BASE_URL: 'https://workspace.ap-southeast-1.maas.aliyuncs.com',
    }))
    const provider = createWanVideoProvider(config, { fetcher })
    const task = await provider.submitImageToVideo({
      firstFrameUrl: 'data:image/png;base64,AAAA',
      prompt: 'Subtle grounded movement',
      negativePrompt: 'identity drift',
      durationSeconds: 5,
      resolution: '720P',
    })
    expect(task).toEqual(expect.objectContaining({
      providerTaskId: 'wan-task-1',
      requestId: 'request-1',
    }))
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body))
    expect(request.parameters).toEqual(expect.objectContaining({
      resolution: '720P',
      duration: 5,
      prompt_extend: true,
      watermark: false,
    }))
    expect(request.input.media[0]).toEqual({
      type: 'first_frame',
      url: 'data:image/png;base64,AAAA',
    })
  })

  it.each([
    ['PENDING', 'Pending'],
    ['RUNNING', 'Running'],
    ['SUCCEEDED', 'Succeeded'],
    ['FAILED', 'Failed'],
    ['CANCELED', 'Failed'],
    ['UNKNOWN', 'Failed'],
  ])('maps provider state %s to %s', async (providerStatus, expected) => {
    const provider = createWanVideoProvider(
      readVideoAIConfig(environment({})),
      {
        fetcher: async () => new Response(JSON.stringify({
          output: {
            task_status: providerStatus,
            video_url: providerStatus === 'SUCCEEDED'
              ? 'https://result.aliyuncs.com/video.mp4'
              : undefined,
          },
        }), { status: 200 }),
      },
    )
    await expect(provider.getTask('task-1')).resolves.toEqual(
      expect.objectContaining({ status: expected }),
    )
  })
})
