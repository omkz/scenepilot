export type VideoAIErrorReason =
  | 'provider_not_configured'
  | 'invalid_scope'
  | 'invalid_assets'
  | 'keyframe_failed'
  | 'job_already_running'
  | 'submit_failed'
  | 'task_failed'
  | 'task_timeout'
  | 'unsafe_video_url'
  | 'video_download_failed'
  | 'invalid_video'
  | 'storage_unavailable'
  | 'storage_upload_failed'
  | 'persistence_failed'

export class VideoAIError extends Error {
  constructor(
    readonly reason: VideoAIErrorReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'VideoAIError'
  }
}

export function safeVideoErrorMessage(error: unknown) {
  if (error instanceof VideoAIError) {
    if (error.reason === 'task_timeout') return 'Video generation took too long to complete.'
    if (error.reason === 'task_failed') return 'The video provider could not complete this shot.'
  }
  return 'Shot video generation could not be completed.'
}
