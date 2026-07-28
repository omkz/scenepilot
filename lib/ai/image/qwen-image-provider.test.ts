import { describe, expect, it, vi } from 'vitest'
import { ImageAIError } from '@/lib/ai/image/errors'
import { createQwenImageProvider } from '@/lib/ai/image/qwen-image-provider'

const baseConfig = {
  provider: 'qwen' as const,
  model: 'qwen-image-2.0-pro',
  candidateCount: 4,
  apiKey: 'test-key',
  baseUrl: 'https://dashscope.example.com/api/v1',
}

describe('Qwen image provider', () => {
  it('normalizes a synchronous multi-image response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      output: {
        choices: [{
          message: {
            content: [
              { image: 'https://example.aliyuncs.com/one.png' },
              { image: 'https://example.aliyuncs.com/two.png' },
            ],
          },
        }],
      },
    }), { status: 200 }))
    const provider = createQwenImageProvider(baseConfig, { fetcher })
    const result = await provider.generateAssetConcepts({
      assetType: 'character',
      prompt: 'Original portrait',
      referenceImageUrls: ['https://assets.example.com/reference.png'],
      candidateCount: 2,
    })
    expect(result.images.map(image => image.url)).toHaveLength(2)
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body))
    expect(request.parameters.n).toBe(2)
    expect(request.input.messages[0].content[0]).toEqual({
      image: 'https://assets.example.com/reference.png',
    })
  })

  it('polls legacy asynchronous Qwen models', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: { task_id: 'task-1', task_status: 'PENDING' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: {
          task_id: 'task-1',
          task_status: 'SUCCEEDED',
          results: [{ url: 'https://example.aliyuncs.com/result.png' }],
        },
      }), { status: 200 }))
    const provider = createQwenImageProvider(
      { ...baseConfig, model: 'qwen-image' },
      { fetcher, sleep: async () => undefined, pollIntervalMs: 0 },
    )
    const result = await provider.generateAssetConcepts({
      assetType: 'location',
      prompt: 'Original environment',
      referenceImageUrls: [],
      candidateCount: 1,
    })
    expect(result.images[0].url).toContain('result.png')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects empty provider responses', async () => {
    const provider = createQwenImageProvider(baseConfig, {
      fetcher: async () => new Response(JSON.stringify({
        output: { choices: [{ message: { content: [] } }] },
      }), { status: 200 }),
    })
    await expect(provider.generateAssetConcepts({
      assetType: 'character',
      prompt: 'Original portrait',
      referenceImageUrls: [],
      candidateCount: 1,
    })).rejects.toMatchObject({ reason: 'no_images_returned' })
  })

  it('returns a normalized timeout for unfinished asynchronous work', async () => {
    const provider = createQwenImageProvider(
      { ...baseConfig, model: 'qwen-image' },
      {
        fetcher: async () => new Response(JSON.stringify({
          output: { task_id: 'task-timeout', task_status: 'PENDING' },
        }), { status: 200 }),
        sleep: async () => new Promise(resolve => setTimeout(resolve, 3)),
        pollIntervalMs: 0,
        timeoutMs: 2,
      },
    )
    await expect(provider.generateAssetConcepts({
      assetType: 'character',
      prompt: 'Original portrait',
      referenceImageUrls: [],
      candidateCount: 1,
    })).rejects.toEqual(expect.objectContaining<ImageAIError>({
      reason: 'generation_timeout',
    }))
  })
})
