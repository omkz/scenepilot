import 'server-only'

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { episodes, projects, type EpisodeRecord } from '@/lib/db/schema'
import type { EpisodeDto, EpisodeStatus, ProductionStatus } from '@/lib/episodes/types'
import type { EpisodeInput } from '@/lib/episodes/validation'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)

function serialize(row: EpisodeRecord): EpisodeDto {
  return {
    ...row,
    status: row.status as EpisodeStatus,
    productionStatus: row.productionStatus as ProductionStatus,
    storyboardApprovedAt: row.storyboardApprovedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() || null,
  }
}

export async function listEpisodes(projectId: string, includeArchived = false) {
  if (!valid(projectId)) return []
  const archive = includeArchived ? isNotNull(episodes.archivedAt) : isNull(episodes.archivedAt)
  const rows = await getDatabase().select().from(episodes)
    .where(and(eq(episodes.projectId, projectId), archive))
    .orderBy(episodes.episodeNumber)
  return rows.map(serialize)
}

export async function getEpisode(projectId: string, episodeId: string, includeArchived = false) {
  if (!valid(projectId, episodeId)) return null
  const conditions = [eq(episodes.projectId, projectId), eq(episodes.id, episodeId)]
  if (!includeArchived) conditions.push(isNull(episodes.archivedAt))
  const [row] = await getDatabase().select().from(episodes).where(and(...conditions)).limit(1)
  return row ? serialize(row) : null
}

export async function createEpisode(projectId: string, input: EpisodeInput) {
  if (!valid(projectId)) return null
  return getDatabase().transaction(async transaction => {
    const [counter] = await transaction.update(projects)
      .set({ nextEpisodeNumber: sql`${projects.nextEpisodeNumber} + 1` })
      .where(and(eq(projects.id, projectId), isNull(projects.archivedAt)))
      .returning({ value: projects.nextEpisodeNumber })
    if (!counter) return null
    const [row] = await transaction.insert(episodes).values({
      ...input,
      projectId,
      episodeNumber: counter.value - 1,
    }).returning()
    return serialize(row)
  })
}

export async function updateEpisode(projectId: string, episodeId: string, input: EpisodeInput) {
  if (!valid(projectId, episodeId)) return null
  const [row] = await getDatabase().update(episodes).set({ ...input, updatedAt: new Date() })
    .where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId), isNull(episodes.archivedAt)))
    .returning()
  return row ? serialize(row) : null
}

export async function setEpisodeStatuses(
  projectId: string,
  episodeId: string,
  values: { status?: EpisodeStatus; productionStatus?: ProductionStatus },
) {
  if (!valid(projectId, episodeId)) return null
  const archivedAt = values.status === 'Archived' ? new Date() : undefined
  const [row] = await getDatabase().update(episodes)
    .set({ ...values, ...(archivedAt ? { archivedAt } : {}), updatedAt: new Date() })
    .where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId)))
    .returning()
  return row ? serialize(row) : null
}

export async function setStoryboardApproval(
  projectId: string,
  episodeId: string,
  storyboardStatus: string,
  approved = false,
) {
  if (!valid(projectId, episodeId)) return null
  const [row] = await getDatabase().update(episodes).set({
    storyboardStatus,
    storyboardApprovedAt: approved ? new Date() : null,
    ...(approved ? { productionStatus: 'In Production' } : {}),
    updatedAt: new Date(),
  }).where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId), isNull(episodes.archivedAt))).returning()
  return row ? serialize(row) : null
}

export function archiveEpisode(projectId: string, episodeId: string) {
  return setEpisodeStatuses(projectId, episodeId, { status: 'Archived' })
}

export async function restoreEpisode(projectId: string, episodeId: string) {
  if (!valid(projectId, episodeId)) return null
  const [row] = await getDatabase().update(episodes)
    .set({ status: 'Draft', archivedAt: null, updatedAt: new Date() })
    .where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId), isNotNull(episodes.archivedAt)))
    .returning()
  return row ? serialize(row) : null
}

export async function deleteEpisode(projectId: string, episodeId: string) {
  if (!valid(projectId, episodeId)) return null
  const [row] = await getDatabase().delete(episodes)
    .where(and(eq(episodes.projectId, projectId), eq(episodes.id, episodeId)))
    .returning({ id: episodes.id })
  return row || null
}
