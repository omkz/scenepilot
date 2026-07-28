import 'server-only'

import { and, asc, count, eq, max, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import {
  assetImages,
  assetStorageDeletionJobs,
  characters,
  costumes,
  locations,
  projects,
  type AssetImageRecord,
} from '@/lib/db/schema'
import type {
  AssetImageDto,
  AssetImageRole,
  AssetType,
} from '@/lib/assets/types'

const valid = (...ids: string[]) => ids.every(id => z.uuid().safeParse(id).success)
const ownerColumn = {
  character: assetImages.characterId,
  costume: assetImages.costumeId,
  location: assetImages.locationId,
} as const

export type AssetImageMutationReason =
  | 'not_found'
  | 'invalid_file'
  | 'file_too_large'
  | 'unsupported_type'
  | 'image_limit_reached'
  | 'asset_archived'
  | 'cross_project_reference'
  | 'storage_unavailable'
  | 'upload_failed'

export type AssetImageMutationResult<T = AssetImageDto> =
  | { ok: true; value: T }
  | { ok: false; reason: AssetImageMutationReason }

function serialize(row: AssetImageRecord): AssetImageDto {
  const assetType: AssetType = row.characterId
    ? 'character'
    : row.costumeId
      ? 'costume'
      : 'location'
  return {
    ...row,
    assetType,
    assetId: row.characterId || row.costumeId || row.locationId || '',
    imageRole: row.imageRole as AssetImageRole,
    sourceType: row.sourceType as AssetImageDto['sourceType'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function lockAsset(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0],
  projectId: string,
  assetType: AssetType,
  assetId: string,
) {
  const [project] = await transaction.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), sql`${projects.archivedAt} is null`))
    .limit(1).for('update')
  if (!project) return { found: false, archived: true, crossProject: false }
  const table = assetType === 'character'
    ? characters
    : assetType === 'costume'
      ? costumes
      : locations
  const [asset] = await transaction.select({
    projectId: table.projectId,
    archivedAt: table.archivedAt,
  }).from(table).where(eq(table.id, assetId)).limit(1).for('update')
  if (!asset) return { found: false, archived: false, crossProject: false }
  if (asset.projectId !== projectId) return { found: false, archived: false, crossProject: true }
  return { found: true, archived: Boolean(asset.archivedAt), crossProject: false }
}

export async function getAssetImageScopeState(
  projectId: string,
  assetType: AssetType,
  assetId: string,
) {
  if (!valid(projectId, assetId)) {
    return { found: false, archived: false, crossProject: false }
  }
  return getDatabase().transaction(transaction => lockAsset(
    transaction,
    projectId,
    assetType,
    assetId,
  ))
}

export async function listAssetImages(
  projectId: string,
  assetType?: AssetType,
  assetId?: string,
) {
  if (!valid(projectId, ...(assetId ? [assetId] : []))) return []
  if (assetId && !assetType) return []
  const conditions = [eq(assetImages.projectId, projectId)]
  if (assetType && assetId) conditions.push(eq(ownerColumn[assetType], assetId))
  const rows = await getDatabase().select().from(assetImages)
    .where(and(...conditions))
    .orderBy(asc(assetImages.position), asc(assetImages.createdAt))
  return rows.map(serialize)
}

export async function getAssetImage(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
) {
  if (!valid(projectId, assetId, imageId)) return null
  const [row] = await getDatabase().select().from(assetImages).where(and(
    eq(assetImages.projectId, projectId),
    eq(ownerColumn[assetType], assetId),
    eq(assetImages.id, imageId),
  )).limit(1)
  return row ? serialize(row) : null
}

export async function createUploadedAssetImage(input: {
  projectId: string
  assetType: AssetType
  assetId: string
  storageProvider: string
  storageKey: string
  storageUrl: string
  originalFilename: string | null
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  sourceNote: string | null
  sourceUrl: string | null
}): Promise<AssetImageMutationResult> {
  if (!valid(input.projectId, input.assetId)) return { ok: false, reason: 'not_found' }
  return getDatabase().transaction(async transaction => {
    const scope = await lockAsset(transaction, input.projectId, input.assetType, input.assetId)
    if (scope.crossProject) return { ok: false, reason: 'cross_project_reference' } as const
    if (!scope.found) return { ok: false, reason: 'not_found' } as const
    if (scope.archived) return { ok: false, reason: 'asset_archived' } as const
    const [inspirationTotal, positionResult] = await Promise.all([
      transaction.select({ value: count(assetImages.id) }).from(assetImages).where(and(
        eq(assetImages.projectId, input.projectId),
        eq(ownerColumn[input.assetType], input.assetId),
        eq(assetImages.imageRole, 'Inspiration'),
      )),
      transaction.select({ value: max(assetImages.position) }).from(assetImages).where(and(
        eq(assetImages.projectId, input.projectId),
        eq(ownerColumn[input.assetType], input.assetId),
        eq(assetImages.imageRole, 'Inspiration'),
      )),
    ])
    if (Number(inspirationTotal[0].value) >= 5) {
      return { ok: false, reason: 'image_limit_reached' } as const
    }
    const owner = {
      characterId: input.assetType === 'character' ? input.assetId : null,
      costumeId: input.assetType === 'costume' ? input.assetId : null,
      locationId: input.assetType === 'location' ? input.assetId : null,
    }
    const [row] = await transaction.insert(assetImages).values({
      projectId: input.projectId,
      ...owner,
      imageRole: 'Inspiration',
      sourceType: 'Upload',
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      storageUrl: input.storageUrl,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      sourceNote: input.sourceNote,
      sourceUrl: input.sourceUrl,
      position: Number(positionResult[0].value || 0) + 1,
    }).returning()
    return { ok: true, value: serialize(row) } as const
  })
}

export async function setAssetImageAsMaster(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
): Promise<AssetImageMutationResult> {
  if (!valid(projectId, assetId, imageId)) return { ok: false, reason: 'not_found' }
  return getDatabase().transaction(async transaction => {
    const scope = await lockAsset(transaction, projectId, assetType, assetId)
    if (scope.crossProject) return { ok: false, reason: 'cross_project_reference' } as const
    if (!scope.found) return { ok: false, reason: 'not_found' } as const
    if (scope.archived) return { ok: false, reason: 'asset_archived' } as const
    const rows = await transaction.select().from(assetImages).where(and(
      eq(assetImages.projectId, projectId),
      eq(ownerColumn[assetType], assetId),
    )).for('update')
    const target = rows.find(row => row.id === imageId)
    if (!target || target.imageRole !== 'Inspiration') {
      return { ok: false, reason: 'not_found' } as const
    }
    const now = new Date()
    const supportingPosition = Math.max(
      0,
      ...rows
        .filter(row => row.imageRole === 'Inspiration' && row.id !== imageId)
        .map(row => row.position),
    ) + 1
    await transaction.update(assetImages).set({
      imageRole: 'Inspiration',
      position: supportingPosition,
      updatedAt: now,
    }).where(and(
      eq(assetImages.projectId, projectId),
      eq(ownerColumn[assetType], assetId),
      eq(assetImages.imageRole, 'Master Reference'),
    ))
    const [row] = await transaction.update(assetImages).set({
      imageRole: 'Master Reference',
      updatedAt: now,
    }).where(and(
      eq(assetImages.projectId, projectId),
      eq(ownerColumn[assetType], assetId),
      eq(assetImages.id, imageId),
    )).returning()
    return row
      ? { ok: true, value: serialize(row) } as const
      : { ok: false, reason: 'not_found' } as const
  })
}

export async function updateAssetImageMetadata(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
  input: { sourceUrl: string | null; sourceNote: string | null },
): Promise<AssetImageMutationResult> {
  if (!valid(projectId, assetId, imageId)) return { ok: false, reason: 'not_found' }
  const [row] = await getDatabase().update(assetImages).set({
    ...input,
    updatedAt: new Date(),
  }).where(and(
    eq(assetImages.projectId, projectId),
    eq(ownerColumn[assetType], assetId),
    eq(assetImages.id, imageId),
  )).returning()
  return row
    ? { ok: true, value: serialize(row) }
    : { ok: false, reason: 'not_found' }
}

export async function deleteAssetImage(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  imageId: string,
): Promise<AssetImageMutationResult<{ cleanupJobId: string }>> {
  if (!valid(projectId, assetId, imageId)) return { ok: false, reason: 'not_found' }
  return getDatabase().transaction(async transaction => {
    const [image] = await transaction.select({
      id: assetImages.id,
      storageProvider: assetImages.storageProvider,
      storageKey: assetImages.storageKey,
    }).from(assetImages).where(and(
      eq(assetImages.projectId, projectId),
      eq(ownerColumn[assetType], assetId),
      eq(assetImages.id, imageId),
    )).limit(1).for('update')
    if (!image) return { ok: false, reason: 'not_found' } as const
    await transaction.delete(assetImages).where(and(
      eq(assetImages.projectId, projectId),
      eq(ownerColumn[assetType], assetId),
      eq(assetImages.id, imageId),
    ))
    const [job] = await transaction.insert(assetStorageDeletionJobs).values({
      storageProvider: image.storageProvider,
      storageKey: image.storageKey,
    }).returning({ id: assetStorageDeletionJobs.id })
    return { ok: true, value: { cleanupJobId: job.id } } as const
  })
}

export async function reorderAssetImages(
  projectId: string,
  assetType: AssetType,
  assetId: string,
  orderedImageIds: string[],
) {
  if (
    !valid(projectId, assetId, ...orderedImageIds)
    || new Set(orderedImageIds).size !== orderedImageIds.length
  ) return false
  return getDatabase().transaction(async transaction => {
    const rows = await transaction.select({ id: assetImages.id }).from(assetImages).where(and(
      eq(assetImages.projectId, projectId),
      eq(ownerColumn[assetType], assetId),
      eq(assetImages.imageRole, 'Inspiration'),
    )).for('update')
    const existingIds = rows.map(row => row.id)
    if (
      existingIds.length !== orderedImageIds.length
      || existingIds.some(id => !orderedImageIds.includes(id))
    ) return false
    for (const [position, imageId] of orderedImageIds.entries()) {
      await transaction.update(assetImages).set({
        position: position + 1,
        updatedAt: new Date(),
      }).where(and(
        eq(assetImages.projectId, projectId),
        eq(ownerColumn[assetType], assetId),
        eq(assetImages.id, imageId),
      ))
    }
    return true
  })
}
