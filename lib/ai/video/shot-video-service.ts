import 'server-only'

import { z } from 'zod'
import { ImageAIError } from '@/lib/ai/image/errors'
import { readImageAIConfig } from '@/lib/ai/image/image-provider'
import { generateStoryboardKeyframe } from '@/lib/ai/image/storyboard-image-service'
import {
  buildVideoNegativePrompt,
  buildVideoPrompt,
} from '@/lib/ai/video/build-video-prompt'
import { safeVideoErrorMessage, VideoAIError } from '@/lib/ai/video/errors'
import {
  getVideoGenerationProvider,
  readVideoAIConfig,
} from '@/lib/ai/video/video-provider'
import {
  downloadGeneratedVideo,
  resolveVideoFirstFrame,
} from '@/lib/ai/video/video-media'
import { getEpisode } from '@/lib/db/queries/episodes'
import { getProjectById } from '@/lib/db/queries/projects'
import { getScene } from '@/lib/db/queries/scenes'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'
import { getShot } from '@/lib/db/queries/shots'
import {
  claimShotVideoJobSaving,
  completeShotVideoJob,
  createShotVideoJob,
  failShotVideoJob,
  getLatestShotVideoJob,
  getStoryboardJob,
  markShotVideoJobPending,
  markShotVideoJobRunning,
  setShotVideoProviderTask,
} from '@/lib/db/queries/storyboard-jobs'
import {
  processAssetStorageDeletionJobs,
  queueAssetStorageDeletion,
} from '@/lib/db/queries/asset-storage-deletion-jobs'
import {
  createProductionMediaStorageKey,
  getAssetStorage,
  type AssetStorage,
} from '@/lib/storage/asset-storage'

export const SHOT_VIDEO_PROMPT_VERSION = 'shot-video-v1'

const startSchema = z.object({
  projectId: z.uuid(),
  episodeId: z.uuid(),
  shotId: z.uuid(),
})
const pollSchema = z.object({
  projectId: z.uuid(),
  jobId: z.uuid(),
})

function videoOutput(job: { outputPlaceholder: unknown }) {
  const output = job.outputPlaceholder as Record<string, unknown> | null
  return output?.kind === 'Shot Video' && typeof output.storageUrl === 'string'
    ? output
    : null
}

async function cleanupStoredVideo(storageProvider: string, storageKey: string) {
  try {
    const cleanupJobId = await queueAssetStorageDeletion(storageProvider, storageKey)
    await processAssetStorageDeletionJobs([cleanupJobId])
  } catch {
    console.error('shot_video_cleanup_queue_failed', {
      storageProvider,
      errorCode: 'CLEANUP_QUEUE_FAILED',
    })
  }
}

export async function startShotVideoGeneration(rawInput: {
  projectId: string
  episodeId: string
  shotId: string
}) {
  const parsed = startSchema.safeParse(rawInput)
  if (!parsed.success) throw new VideoAIError('invalid_scope', 'The shot could not be found.')
  const { projectId, episodeId, shotId } = parsed.data
  try {
    readImageAIConfig()
  } catch {
    throw new VideoAIError('provider_not_configured', 'Image AI is not configured.')
  }
  const config = readVideoAIConfig()
  const latest = await getLatestShotVideoJob(projectId, episodeId, shotId)
  if (latest && ['Queued', 'Submitted', 'Running'].includes(latest.status)) {
    throw new VideoAIError('job_already_running', 'Video generation is already running.')
  }
  const [project, episode, shot] = await Promise.all([
    getProjectById(projectId),
    getEpisode(projectId, episodeId),
    getShot(projectId, episodeId, shotId),
  ])
  if (!project || !episode || !shot) {
    throw new VideoAIError('invalid_scope', 'The shot could not be found.')
  }
  const [scene, assignments] = await Promise.all([
    getScene(projectId, episodeId, shot.sceneId),
    listShotCharacters(projectId, episodeId, shot.id),
  ])
  if (!scene) throw new VideoAIError('invalid_scope', 'The scene could not be found.')

  let keyframe
  try {
    keyframe = await generateStoryboardKeyframe({ projectId, episodeId, shotId })
  } catch (error) {
    if (error instanceof ImageAIError) {
      if (error.reason === 'provider_not_configured') {
        throw new VideoAIError('provider_not_configured', 'Image AI is not configured.')
      }
      if (error.reason === 'storage_unavailable') {
        throw new VideoAIError('storage_unavailable', 'Image storage is not configured.')
      }
      if (
        error.reason === 'storyboard_invalid_assets'
        || error.reason === 'asset_not_found'
        || error.reason === 'asset_archived'
      ) {
        throw new VideoAIError('invalid_assets', 'The shot assets are not ready for video generation.')
      }
    }
    throw new VideoAIError('keyframe_failed', 'The storyboard keyframe could not be prepared.')
  }
  const firstFrameUrl = await resolveVideoFirstFrame(keyframe.keyframe)
  const prompt = buildVideoPrompt({ shot, scene, assignments })
  const negativePrompt = buildVideoNegativePrompt(shot.negativePrompt)
  const durationSeconds = Math.max(
    2,
    Math.min(5, shot.targetDurationSeconds || config.defaultDurationSeconds),
  )
  const inputSnapshot = {
    prompt,
    negativePrompt,
    durationSeconds,
    resolution: config.resolution,
    keyframeJobId: keyframe.keyframe.jobId,
    keyframeStorageUrl: keyframe.keyframe.storageUrl,
    providerTaskId: null,
    providerRequestId: null,
    characterIds: assignments.map(item => item.characterId),
    costumeIds: assignments.map(item => item.costumeId).filter((id): id is string => Boolean(id)),
    locationId: shot.locationId,
  }
  const job = await createShotVideoJob({
    projectId,
    episodeId,
    sceneId: scene.id,
    shotId,
    inputSnapshot,
  })
  if (!job) {
    throw new VideoAIError('job_already_running', 'Video generation is already running.')
  }
  try {
    const provider = getVideoGenerationProvider(config)
    const submitted = await provider.submitImageToVideo({
      firstFrameUrl,
      prompt,
      negativePrompt,
      durationSeconds,
      resolution: config.resolution,
    })
    const updated = await setShotVideoProviderTask({
      projectId,
      episodeId,
      shotId,
      jobId: job.id,
      providerTaskId: submitted.providerTaskId,
      providerRequestId: submitted.requestId,
    })
    if (!updated) throw new VideoAIError('persistence_failed', 'The video task could not be saved.')
    return updated
  } catch (error) {
    await failShotVideoJob(projectId, job.id, safeVideoErrorMessage(error))
    if (error instanceof VideoAIError) throw error
    throw new VideoAIError('submit_failed', 'The video task could not be submitted.')
  }
}

export async function pollShotVideoGeneration(rawInput: {
  projectId: string
  jobId: string
}) {
  const parsed = pollSchema.safeParse(rawInput)
  if (!parsed.success) throw new VideoAIError('invalid_scope', 'The video job was not found.')
  const { projectId, jobId } = parsed.data
  let job = await getStoryboardJob(projectId, jobId)
  if (!job || job.jobType !== 'Shot Video') {
    throw new VideoAIError('invalid_scope', 'The video job was not found.')
  }
  if (job.status === 'Completed' || job.status === 'Failed') return job

  let config: ReturnType<typeof readVideoAIConfig>
  try {
    config = readVideoAIConfig()
  } catch (error) {
    await failShotVideoJob(projectId, job.id, 'Video AI configuration is incomplete.')
    throw error
  }
  const snapshot = job.inputSnapshot as Record<string, unknown>
  const providerTaskId = typeof snapshot.providerTaskId === 'string'
    ? snapshot.providerTaskId
    : null
  if (!providerTaskId) {
    await failShotVideoJob(projectId, job.id, 'The video provider task was not recorded.')
    throw new VideoAIError('persistence_failed', 'The video provider task was not recorded.')
  }
  const createdAt = new Date(job.createdAt).getTime()
  if (Date.now() - createdAt > config.taskTimeoutMinutes * 60_000) {
    await failShotVideoJob(projectId, job.id, 'Video generation took too long to complete.')
    throw new VideoAIError('task_timeout', 'Video generation timed out.')
  }

  const provider = getVideoGenerationProvider(config)
  let state: Awaited<ReturnType<typeof provider.getTask>>
  try {
    state = await provider.getTask(providerTaskId)
  } catch (error) {
    await failShotVideoJob(projectId, job.id, 'The video provider could not be reached.')
    if (error instanceof VideoAIError) throw error
    throw new VideoAIError('task_failed', 'The video provider could not be reached.')
  }
  if (state.status === 'Pending') {
    await markShotVideoJobPending(projectId, job.id)
    return (await getStoryboardJob(projectId, job.id)) || job
  }
  if (state.status === 'Running') {
    await markShotVideoJobRunning(projectId, job.id)
    return (await getStoryboardJob(projectId, job.id)) || job
  }
  if (state.status === 'Failed' || !state.videoUrl) {
    await failShotVideoJob(projectId, job.id, 'The video provider could not complete this shot.')
    console.error('wan_video_task_failed', {
      provider: 'wan',
      model: config.model,
      taskId: providerTaskId,
      requestId: state.requestId || null,
      providerErrorCode: state.providerErrorCode || null,
      providerErrorMessage: state.providerErrorMessage || null,
    })
    return (await getStoryboardJob(projectId, job.id)) || job
  }

  const claimed = await claimShotVideoJobSaving(projectId, job.id)
  if (!claimed) return (await getStoryboardJob(projectId, job.id)) || job
  job = claimed
  let storage: AssetStorage
  try {
    storage = getAssetStorage()
  } catch {
    await failShotVideoJob(projectId, job.id, 'Video storage is not configured.')
    throw new VideoAIError('storage_unavailable', 'Video storage is not configured.')
  }
  let stored: Awaited<ReturnType<AssetStorage['upload']>> | null = null
  try {
    const bytes = await downloadGeneratedVideo(state.videoUrl)
    const storageKey = createProductionMediaStorageKey({
      projectId,
      episodeId: job.episodeId,
      sceneId: job.sceneId,
      shotId: job.shotId,
      type: 'video',
      extension: 'mp4',
    })
    stored = await storage.upload({
      storageKey,
      filename: 'shot-video.mp4',
      mimeType: 'video/mp4',
      bytes,
    })
    const output = {
      kind: 'Shot Video',
      storageProvider: stored.provider,
      storageKey: stored.key,
      storageUrl: stored.url,
      mimeType: 'video/mp4',
      sizeBytes: bytes.byteLength,
      durationSeconds: Number(snapshot.durationSeconds) || config.defaultDurationSeconds,
      width: null,
      height: null,
      resolution: snapshot.resolution,
      generationProvider: 'wan',
      generationModel: config.model,
      providerTaskId,
      providerRequestId: snapshot.providerRequestId || state.requestId || null,
      generationPromptVersion: SHOT_VIDEO_PROMPT_VERSION,
    }
    const completed = await completeShotVideoJob(projectId, job.id, output)
    if (!completed) {
      throw new VideoAIError('persistence_failed', 'The generated video could not be saved.')
    }
    return completed
  } catch (error) {
    if (stored) await cleanupStoredVideo(stored.provider, stored.key)
    await failShotVideoJob(projectId, job.id, safeVideoErrorMessage(error))
    if (error instanceof VideoAIError) throw error
    throw new VideoAIError('video_download_failed', 'The generated video could not be saved.')
  }
}

export function getShotVideoUrl(job: { outputPlaceholder: unknown }) {
  const output = videoOutput(job)
  return typeof output?.storageUrl === 'string' ? output.storageUrl : null
}
