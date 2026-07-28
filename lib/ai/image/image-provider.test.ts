import { describe, expect, it } from 'vitest'
import { getImageAIStatus, readImageAIConfig } from '@/lib/ai/image/image-provider'

describe('image AI configuration', () => {
  it('uses the recommended Qwen image defaults', () => {
    const config = readImageAIConfig({
      DASHSCOPE_API_KEY: 'test-key',
    } as NodeJS.ProcessEnv)
    expect(config.provider).toBe('qwen')
    expect(config.model).toBe('qwen-image-2.0-pro')
    expect(config.candidateCount).toBe(4)
  })

  it('rejects unsupported providers and unsafe endpoints', () => {
    expect(() => readImageAIConfig({
      IMAGE_AI_PROVIDER: 'other',
      DASHSCOPE_API_KEY: 'test-key',
    } as NodeJS.ProcessEnv)).toThrow(/Unsupported image provider/)
    expect(() => readImageAIConfig({
      DASHSCOPE_API_KEY: 'test-key',
      DASHSCOPE_BASE_URL: 'http://localhost:8000',
    } as NodeJS.ProcessEnv)).toThrow(/valid HTTPS URL/)
  })

  it('returns a safe, credential-free status', () => {
    const previous = process.env.DASHSCOPE_API_KEY
    delete process.env.DASHSCOPE_API_KEY
    expect(getImageAIStatus()).toEqual(expect.objectContaining({
      configured: false,
      provider: 'qwen',
    }))
    if (previous) process.env.DASHSCOPE_API_KEY = previous
  })
})
