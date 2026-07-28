export const IMAGE_AI_ERROR_REASONS = [
  'provider_not_configured',
  'asset_not_found',
  'asset_archived',
  'character_master_required',
  'storyboard_missing_master',
  'storyboard_invalid_assets',
  'invalid_candidate_count',
  'generation_failed',
  'generation_timeout',
  'no_images_returned',
  'storage_unavailable',
  'storage_upload_failed',
  'persistence_failed',
] as const

export type ImageAIErrorReason = typeof IMAGE_AI_ERROR_REASONS[number]

export class ImageAIError extends Error {
  constructor(
    readonly reason: ImageAIErrorReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ImageAIError'
  }
}

export function normalizeImageAIError(error: unknown) {
  if (error instanceof ImageAIError) return error
  return new ImageAIError(
    'generation_failed',
    'Image concept generation could not be completed.',
  )
}

export const IMAGE_AI_USER_MESSAGES: Record<ImageAIErrorReason, string> = {
  provider_not_configured: 'Image concept generation is not configured.',
  asset_not_found: 'The project asset could not be found.',
  asset_archived: 'Archived assets cannot generate concepts.',
  character_master_required: 'Select a Character Master Reference before generating Costume Concepts.',
  storyboard_missing_master: 'Required Master References are missing.',
  storyboard_invalid_assets: 'Storyboard assets must be active and approved.',
  invalid_candidate_count: 'The requested concept count is invalid.',
  generation_failed: 'Image concept generation could not be completed.',
  generation_timeout: 'Image generation took too long to complete.',
  no_images_returned: 'The image provider returned no usable concepts.',
  storage_unavailable: 'Image storage is not configured.',
  storage_upload_failed: 'Generated concepts could not be stored.',
  persistence_failed: 'Generated concepts could not be saved.',
}
