import 'server-only'

import { and, asc, eq, inArray, isNull, lte } from 'drizzle-orm'
import { getDatabase } from '@/lib/db'
import {
  assetImages,
  assetStorageDeletionJobs,
} from '@/lib/db/schema'
import type { AssetType } from '@/lib/assets/types'
import { getAssetStorageForProvider } from '@/lib/storage/asset-storage'

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0]

const ownerColumn = {
  character: assetImages.characterId,
  costume: assetImages.costumeId,
  location: assetImages.locationId,
} as const

function safeErrorCode(error: unknown) {
  const code = (error as { code?: string }).code
  if (code === 'ASSET_STORAGE_CONFIGURATION_ERROR') return 'STORAGE_CONFIGURATION_ERROR'
  if (code === 'INVALID_LOCAL_ASSET_KEY') return 'INVALID_STORAGE_KEY'
  return 'STORAGE_REMOVE_FAILED'
}

function nextRetry(attemptCount: number) {
  const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attemptCount, 10))
  return new Date(Date.now() + delayMinutes * 60_000)
}

export async function collectAssetImageStorageObjects(
  transaction: Transaction,
  projectId: string,
  assetType: AssetType,
  assetId: string,
) {
  return transaction.select({
    storageProvider: assetImages.storageProvider,
    storageKey: assetImages.storageKey,
  }).from(assetImages).where(and(
    eq(assetImages.projectId, projectId),
    eq(ownerColumn[assetType], assetId),
  )).for('update')
}

export async function scheduleAssetStorageDeletionJobs(
  transaction: Transaction,
  objects: Array<{ storageProvider: string; storageKey: string }>,
) {
  if (!objects.length) return []
  return transaction.insert(assetStorageDeletionJobs).values(objects).returning({
    id: assetStorageDeletionJobs.id,
  })
}

export async function queueAssetStorageDeletion(storageProvider: string, storageKey: string) {
  const [job] = await getDatabase().insert(assetStorageDeletionJobs).values({
    storageProvider,
    storageKey,
  }).returning({ id: assetStorageDeletionJobs.id })
  return job.id
}

export async function processAssetStorageDeletionJobs(jobIds: string[]) {
  if (!jobIds.length) return { completed: 0, pending: 0 }
  const jobs = await getDatabase().select().from(assetStorageDeletionJobs).where(and(
    inArray(assetStorageDeletionJobs.id, jobIds),
    isNull(assetStorageDeletionJobs.completedAt),
  ))
  let completed = 0
  let pending = 0
  for (const job of jobs) {
    try {
      await getAssetStorageForProvider(job.storageProvider).remove(job.storageKey)
      const [updated] = await getDatabase().update(assetStorageDeletionJobs).set({
        completedAt: new Date(),
        lastErrorCode: null,
        updatedAt: new Date(),
      }).where(and(
        eq(assetStorageDeletionJobs.id, job.id),
        isNull(assetStorageDeletionJobs.completedAt),
      )).returning({ id: assetStorageDeletionJobs.id })
      if (updated) completed += 1
    } catch (error) {
      const attempts = job.attemptCount + 1
      await getDatabase().update(assetStorageDeletionJobs).set({
        attemptCount: attempts,
        lastErrorCode: safeErrorCode(error),
        nextAttemptAt: nextRetry(attempts),
        updatedAt: new Date(),
      }).where(and(
        eq(assetStorageDeletionJobs.id, job.id),
        isNull(assetStorageDeletionJobs.completedAt),
      ))
      pending += 1
      console.error('asset_storage_cleanup_failed', {
        jobId: job.id,
        storageProvider: job.storageProvider,
        errorCode: safeErrorCode(error),
      })
    }
  }
  return { completed, pending }
}

export async function processPendingAssetStorageDeletions(batchSize = 25) {
  const safeBatchSize = Math.max(1, Math.min(batchSize, 100))
  const due = await getDatabase().select({ id: assetStorageDeletionJobs.id })
    .from(assetStorageDeletionJobs)
    .where(and(
      isNull(assetStorageDeletionJobs.completedAt),
      lte(assetStorageDeletionJobs.nextAttemptAt, new Date()),
    ))
    .orderBy(asc(assetStorageDeletionJobs.nextAttemptAt))
    .limit(safeBatchSize)
  return processAssetStorageDeletionJobs(due.map(job => job.id))
}
