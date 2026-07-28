import type { ShotCharacterDto, ShotDto } from '@/lib/production/types'
import type { SceneDto } from '@/lib/episodes/types'

export interface SubmitImageToVideoInput {
  firstFrameUrl: string
  prompt: string
  negativePrompt?: string | null
  durationSeconds: number
  resolution: '720P' | '1080P'
}

export interface SubmittedVideoTask {
  provider: 'wan'
  model: string
  providerTaskId: string
  requestId: string | null
}

export interface VideoTaskStatus {
  status: 'Pending' | 'Running' | 'Succeeded' | 'Failed'
  videoUrl?: string
  requestId?: string | null
  providerErrorCode?: string | null
  providerErrorMessage?: string | null
}

export interface VideoGenerationProvider {
  readonly id: 'wan'
  readonly model: string
  submitImageToVideo(input: SubmitImageToVideoInput): Promise<SubmittedVideoTask>
  getTask(providerTaskId: string): Promise<VideoTaskStatus>
}

export interface BuildVideoPromptInput {
  shot: ShotDto
  scene: SceneDto
  assignments: ShotCharacterDto[]
}
