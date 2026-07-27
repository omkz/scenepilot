import 'server-only'

import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { storyboardJobs, shots } from '@/lib/db/schema'
import type { StoryboardJobDto } from '@/lib/production/types'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)
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
