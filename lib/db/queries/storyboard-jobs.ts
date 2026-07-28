import 'server-only'

import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { storyboardJobs, shots } from '@/lib/db/schema'
import type { StoryboardJobDto } from '@/lib/production/types'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)
export const STORYBOARD_IMAGE_JOB_TYPE = 'Storyboard Image'
const serialize = (row: typeof storyboardJobs.$inferSelect): StoryboardJobDto => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  completedAt: row.completedAt?.toISOString() || null,
})

export async function listStoryboardJobs(projectId: string, episodeId: string, shotId?: string) {
  if (!valid(projectId, episodeId, ...(shotId ? [shotId] : []))) return []
  const conditions = [eq(storyboardJobs.projectId, projectId), eq(storyboardJobs.episodeId, episodeId)]
  if (shotId) conditions.push(eq(storyboardJobs.shotId, shotId))
  const rows = await getDatabase().select().from(storyboardJobs).where(and(...conditions)).orderBy(desc(storyboardJobs.createdAt))
  return rows.map(serialize)
}

export async function createCompletedStoryboardJob(
  projectId: string,
  episodeId: string,
  sceneId: string,
  shotId: string,
  inputSnapshot: Record<string, unknown>,
  outputPlaceholder: Record<string, unknown>,
) {
  if (!valid(projectId, episodeId, sceneId, shotId)) return null
  return getDatabase().transaction(async transaction => {
    const [shot] = await transaction.select({ id: shots.id }).from(shots).where(and(
      eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.sceneId, sceneId), eq(shots.id, shotId),
    )).limit(1)
    if (!shot) return null
    const now = new Date()
    const [job] = await transaction.insert(storyboardJobs).values({
      projectId,
      episodeId,
      sceneId,
      shotId,
      jobType: 'Storyboard Placeholder',
      status: 'Completed',
      progress: 100,
      inputSnapshot,
      outputPlaceholder,
      startedAt: now,
      completedAt: now,
      updatedAt: now,
    }).returning()
    await transaction.update(shots).set({ status: 'Generated', updatedAt: now }).where(and(
      eq(shots.projectId, projectId), eq(shots.episodeId, episodeId), eq(shots.id, shotId),
    ))
    return serialize(job)
  })
}

export async function createStoryboardImageJob(input: {
  projectId: string
  episodeId: string
  sceneId: string
  shotId: string
  prompt: string
  inputSnapshot: Record<string, unknown>
}) {
  if (!valid(input.projectId, input.episodeId, input.sceneId, input.shotId)) return null
  return getDatabase().transaction(async transaction => {
    const [shot] = await transaction.select({ id: shots.id }).from(shots).where(and(
      eq(shots.projectId, input.projectId),
      eq(shots.episodeId, input.episodeId),
      eq(shots.sceneId, input.sceneId),
      eq(shots.id, input.shotId),
      isNull(shots.archivedAt),
    )).limit(1).for('update')
    if (!shot) return null
    const now = new Date()
    const [job] = await transaction.insert(storyboardJobs).values({
      projectId: input.projectId,
      episodeId: input.episodeId,
      sceneId: input.sceneId,
      shotId: input.shotId,
      jobType: STORYBOARD_IMAGE_JOB_TYPE,
      status: 'Queued',
      progress: 0,
      inputSnapshot: input.inputSnapshot,
      updatedAt: now,
    }).returning()
    await transaction.update(shots).set({
      generationPrompt: input.prompt,
      updatedAt: now,
    }).where(and(
      eq(shots.projectId, input.projectId),
      eq(shots.episodeId, input.episodeId),
      eq(shots.sceneId, input.sceneId),
      eq(shots.id, input.shotId),
      isNull(shots.archivedAt),
    ))
    return serialize(job)
  })
}

export async function markStoryboardImageJobGenerating(
  projectId: string,
  episodeId: string,
  sceneId: string,
  shotId: string,
  jobId: string,
) {
  if (!valid(projectId, episodeId, sceneId, shotId, jobId)) return null
  return getDatabase().transaction(async transaction => {
    const [shot] = await transaction.select({ id: shots.id }).from(shots).where(and(
      eq(shots.projectId, projectId),
      eq(shots.episodeId, episodeId),
      eq(shots.sceneId, sceneId),
      eq(shots.id, shotId),
      isNull(shots.archivedAt),
    )).limit(1).for('update')
    if (!shot) return null
    const now = new Date()
    const [job] = await transaction.update(storyboardJobs).set({
      status: 'Generating',
      progress: 10,
      startedAt: now,
      updatedAt: now,
    }).where(and(
      eq(storyboardJobs.projectId, projectId),
      eq(storyboardJobs.episodeId, episodeId),
      eq(storyboardJobs.sceneId, sceneId),
      eq(storyboardJobs.shotId, shotId),
      eq(storyboardJobs.id, jobId),
      eq(storyboardJobs.jobType, STORYBOARD_IMAGE_JOB_TYPE),
      eq(storyboardJobs.status, 'Queued'),
    )).returning()
    if (!job) return null
    await transaction.update(shots).set({ status: 'Generating', updatedAt: now }).where(and(
      eq(shots.projectId, projectId),
      eq(shots.episodeId, episodeId),
      eq(shots.sceneId, sceneId),
      eq(shots.id, shotId),
      isNull(shots.archivedAt),
    ))
    return serialize(job)
  })
}

export async function completeStoryboardImageJob(
  projectId: string,
  episodeId: string,
  sceneId: string,
  shotId: string,
  jobId: string,
  output: Record<string, unknown>,
) {
  if (!valid(projectId, episodeId, sceneId, shotId, jobId)) return null
  return getDatabase().transaction(async transaction => {
    const [current] = await transaction.select({ id: storyboardJobs.id }).from(storyboardJobs)
      .where(and(
        eq(storyboardJobs.projectId, projectId),
        eq(storyboardJobs.episodeId, episodeId),
        eq(storyboardJobs.sceneId, sceneId),
        eq(storyboardJobs.shotId, shotId),
        eq(storyboardJobs.id, jobId),
        eq(storyboardJobs.jobType, STORYBOARD_IMAGE_JOB_TYPE),
        eq(storyboardJobs.status, 'Generating'),
      )).limit(1).for('update')
    if (!current) return null
    const now = new Date()
    const [job] = await transaction.update(storyboardJobs).set({
      status: 'Completed',
      progress: 100,
      outputPlaceholder: output,
      errorMessage: null,
      completedAt: now,
      updatedAt: now,
    }).where(eq(storyboardJobs.id, current.id)).returning()
    const [shot] = await transaction.update(shots).set({
      status: 'Generated',
      updatedAt: now,
    }).where(and(
      eq(shots.projectId, projectId),
      eq(shots.episodeId, episodeId),
      eq(shots.sceneId, sceneId),
      eq(shots.id, shotId),
      isNull(shots.archivedAt),
    )).returning({ id: shots.id })
    if (!shot) throw new Error('STORYBOARD_SHOT_STATE_UPDATE_FAILED')
    return serialize(job)
  })
}

export async function failStoryboardImageJob(
  projectId: string,
  episodeId: string,
  sceneId: string,
  shotId: string,
  jobId: string,
  safeMessage: string,
) {
  if (!valid(projectId, episodeId, sceneId, shotId, jobId)) return null
  return getDatabase().transaction(async transaction => {
    const now = new Date()
    const [job] = await transaction.update(storyboardJobs).set({
      status: 'Failed',
      errorMessage: safeMessage.slice(0, 500),
      completedAt: now,
      updatedAt: now,
    }).where(and(
      eq(storyboardJobs.projectId, projectId),
      eq(storyboardJobs.episodeId, episodeId),
      eq(storyboardJobs.sceneId, sceneId),
      eq(storyboardJobs.shotId, shotId),
      eq(storyboardJobs.id, jobId),
      eq(storyboardJobs.jobType, STORYBOARD_IMAGE_JOB_TYPE),
      inArray(storyboardJobs.status, ['Queued', 'Generating']),
    )).returning()
    if (!job) return null
    await transaction.update(shots).set({
      status: 'Failed',
      updatedAt: now,
    }).where(and(
      eq(shots.projectId, projectId),
      eq(shots.episodeId, episodeId),
      eq(shots.sceneId, sceneId),
      eq(shots.id, shotId),
      isNull(shots.archivedAt),
    ))
    return serialize(job)
  })
}
