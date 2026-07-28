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

  it('falls back to QWEN_API_KEY while preferring DASHSCOPE_API_KEY', () => {
    expect(readImageAIConfig({
      QWEN_API_KEY: 'text-key',
    } as NodeJS.ProcessEnv).apiKey).toBe('text-key')
    expect(readImageAIConfig({
      DASHSCOPE_API_KEY: 'image-key',
      QWEN_API_KEY: 'text-key',
    } as NodeJS.ProcessEnv).apiKey).toBe('image-key')
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
    const previousDashscope = process.env.DASHSCOPE_API_KEY
    const previousQwen = process.env.QWEN_API_KEY
    delete process.env.DASHSCOPE_API_KEY
    delete process.env.QWEN_API_KEY
    expect(getImageAIStatus()).toEqual(expect.objectContaining({
      configured: false,
      provider: 'qwen',
    }))
    process.env.QWEN_API_KEY = 'fallback-key'
    expect(getImageAIStatus()).toEqual(expect.objectContaining({
      configured: true,
      provider: 'qwen',
    }))
    if (previousDashscope) process.env.DASHSCOPE_API_KEY = previousDashscope
    else delete process.env.DASHSCOPE_API_KEY
    if (previousQwen) process.env.QWEN_API_KEY = previousQwen
    else delete process.env.QWEN_API_KEY
  })
})
