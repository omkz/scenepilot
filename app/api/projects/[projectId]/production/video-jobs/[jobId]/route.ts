import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { VideoAIError } from '@/lib/ai/video/errors'
import {
  getShotVideoUrl,
  pollShotVideoGeneration,
} from '@/lib/ai/video/shot-video-service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; jobId: string }> },
) {
  const values = await params
  if (!z.uuid().safeParse(values.projectId).success || !z.uuid().safeParse(values.jobId).success) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }
  try {
    const job = await pollShotVideoGeneration(values)
    if (job.status === 'Completed') {
      revalidatePath(`/projects/${values.projectId}/production`)
      revalidatePath(`/projects/${values.projectId}/production/episodes/${job.episodeId}`)
    }
    return Response.json({
      status: job.status,
      progress: job.progress,
      videoUrl: getShotVideoUrl(job),
      errorMessage: job.status === 'Failed'
        ? job.errorMessage || 'Shot video generation failed safely.'
        : null,
    })
  } catch (error) {
    const status = error instanceof VideoAIError && error.reason === 'invalid_scope' ? 404 : 200
    return Response.json({
      status: 'Failed',
      progress: 100,
      videoUrl: null,
      errorMessage: error instanceof VideoAIError && error.reason === 'task_timeout'
        ? 'Video generation took too long to complete.'
        : 'Shot video generation could not be completed.',
    }, { status })
  }
}
