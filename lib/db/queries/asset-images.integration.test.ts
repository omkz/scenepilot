import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq, inArray, like, or, sql } from 'drizzle-orm'
import { getDatabase } from '@/lib/db'
import {
  assetImages,
  assetStorageDeletionJobs,
  characters,
  costumes,
  locations,
  projects,
} from '@/lib/db/schema'
import {
  createUploadedAssetImage,
  deleteAssetImage,
  getAssetImage,
  setAssetImageAsMaster,
  reorderAssetImages,
} from '@/lib/db/queries/asset-images'
import { processAssetStorageDeletionJobs } from '@/lib/db/queries/asset-storage-deletion-jobs'
import { getCostume, updateCostume } from '@/lib/db/queries/costumes'
import { deleteLocation } from '@/lib/db/queries/locations'
import { storeAssetImageUpload } from '@/lib/assets/upload-asset-image'
import { createLocalAssetStorage, resolveLocalAssetPath } from '@/lib/storage/local-asset-storage'
import { POST as uploadLocalAsset } from '@/app/api/asset-images/local-upload/route'

const runDatabaseTests = process.env.RUN_DB_TESTS === '1'
const suite = runDatabaseTests ? describe : describe.skip

suite.sequential('asset image scoping and master references', () => {
  const projectA = randomUUID()
  const projectB = randomUUID()
  const characterA = randomUUID()
  const characterB = randomUUID()
  const characterA2 = randomUUID()
  const archivedCharacter = randomUUID()
  const uploadCharacter = randomUUID()
  const costumeA = randomUUID()
  const locationA = randomUUID()
  let localRoot = ''

  async function localFileCount() {
    return (await readdir(localRoot, { recursive: true, withFileTypes: true }))
      .filter(entry => entry.isFile()).length
  }

  beforeAll(async () => {
    localRoot = await mkdtemp(path.join(os.tmpdir(), 'scenepilot-db-assets-'))
    const database = getDatabase()
    await database.insert(projects).values([
      {
        id: projectA,
        name: 'Visual Asset A',
        slug: `visual-a-${projectA}`,
        genre: 'Historical',
        primaryLanguage: 'English',
        episodeCount: 1,
        episodeDuration: '30–60 seconds',
        orientation: 'Vertical 9:16',
        status: 'Active',
        currentSeason: 1,
      },
      {
        id: projectB,
        name: 'Visual Asset B',
        slug: `visual-b-${projectB}`,
        genre: 'Historical',
        primaryLanguage: 'English',
        episodeCount: 1,
        episodeDuration: '30–60 seconds',
        orientation: 'Vertical 9:16',
        status: 'Active',
        currentSeason: 1,
      },
    ])
    await database.insert(characters).values([
      {
        id: characterA,
        projectId: projectA,
        assetCode: 'CHAR-001',
        name: 'Raden Wijaya',
        narrativeRole: 'Protagonist',
        approvalStatus: 'Approved',
      },
      {
        id: archivedCharacter,
        projectId: projectA,
        assetCode: 'CHAR-002',
        name: 'Archived Character',
        narrativeRole: 'Supporting',
        approvalStatus: 'Archived',
        archivedAt: new Date(),
      },
      {
        id: characterA2,
        projectId: projectA,
        assetCode: 'CHAR-003',
        name: 'Arya Wiraraja',
        narrativeRole: 'Supporting',
        approvalStatus: 'Approved',
      },
      {
        id: uploadCharacter,
        projectId: projectA,
        assetCode: 'CHAR-004',
        name: 'Upload Test Character',
        narrativeRole: 'Supporting',
        approvalStatus: 'Approved',
      },
      {
        id: characterB,
        projectId: projectB,
        assetCode: 'CHAR-001',
        name: 'Other Project Character',
        narrativeRole: 'Supporting',
        approvalStatus: 'Approved',
      },
    ])
    await database.insert(costumes).values({
      id: costumeA,
      projectId: projectA,
      characterId: characterA,
      assetCode: 'COSTUME-001',
      name: 'Diplomatic Costume',
      approvalStatus: 'Approved',
    })
    await database.insert(locations).values({
      id: locationA,
      projectId: projectA,
      assetCode: 'LOCATION-001',
      name: 'Riverside Alliance Camp',
      locationType: 'Exterior',
      defaultTimeOfDay: 'Dawn',
      defaultLighting: 'Natural',
      approvalStatus: 'Approved',
    })
  })

  afterAll(async () => {
    if (!runDatabaseTests) return
    await getDatabase().delete(assetStorageDeletionJobs).where(or(
      eq(assetStorageDeletionJobs.storageProvider, 'test'),
      like(assetStorageDeletionJobs.storageKey, `%${projectA}%`),
      like(assetStorageDeletionJobs.storageKey, `%${projectB}%`),
    ))
    await getDatabase().delete(projects).where(inArray(projects.id, [projectA, projectB]))
    await rm(localRoot, { recursive: true, force: true })
    const client = (globalThis as typeof globalThis & {
      scenepilotPostgres?: { end: () => Promise<void> }
    }).scenepilotPostgres
    await client?.end()
  })

  function upload(assetId: string, index: number, assetType: 'character' | 'costume' | 'location' = 'character', projectId = projectA) {
    return createUploadedAssetImage({
      projectId,
      assetType,
      assetId,
      storageProvider: 'test',
      storageKey: `${projectId}/${assetType}/${assetId}/${index}-${randomUUID()}.png`,
      storageUrl: `https://example.test/${randomUUID()}.png`,
      originalFilename: `reference-${index}.png`,
      mimeType: 'image/png',
      sizeBytes: 100,
      width: 100,
      height: 100,
      sourceNote: null,
      sourceUrl: null,
    })
  }

  it('rejects cross-project and archived asset uploads', async () => {
    expect(await upload(characterB, 1)).toEqual({
      ok: false,
      reason: 'cross_project_reference',
    })
    expect(await upload(archivedCharacter, 2)).toEqual({
      ok: false,
      reason: 'asset_archived',
    })
  })

  it('stores valid JPEG, PNG, and WebP files locally with database rows', async () => {
    const fixtures = [
      {
        filename: 'portrait.jpg',
        mimeType: 'image/jpeg',
        bytes: Uint8Array.from([
          0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20,
          0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
        ]),
      },
      {
        filename: 'portrait.png',
        mimeType: 'image/png',
        bytes: Uint8Array.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x10,
        ]),
      },
      {
        filename: 'portrait.webp',
        mimeType: 'image/webp',
        bytes: Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00,
          0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58,
          0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x1f, 0x00, 0x00, 0x0f, 0x00, 0x00,
        ]),
      },
    ]
    const storage = createLocalAssetStorage(localRoot)
    for (const fixture of fixtures) {
      const result = await storeAssetImageUpload({
        projectId: projectA,
        assetType: 'character',
        assetId: uploadCharacter,
        originalFilename: fixture.filename,
        claimedMimeType: fixture.mimeType,
        bytes: fixture.bytes,
        sourceUrl: 'https://example.test/reference',
        sourceNote: 'Local integration test',
      }, { storage })
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.value.storageUrl).toMatch(/^\/api\/local-assets\//)
      expect(new Uint8Array(await readFile(resolveLocalAssetPath(result.value.storageKey, localRoot))))
        .toEqual(fixture.bytes)
    }
    expect(await getDatabase().select().from(assetImages)
      .where(eq(assetImages.characterId, uploadCharacter))).toHaveLength(3)

    const before = await localFileCount()
    const failed = await storeAssetImageUpload({
      projectId: projectA,
      assetType: 'character',
      assetId: randomUUID(),
      originalFilename: 'orphan.png',
      claimedMimeType: fixtures[1].mimeType,
      bytes: fixtures[1].bytes,
      sourceUrl: null,
      sourceNote: null,
    }, { storage })
    expect(failed).toEqual({ ok: false, reason: 'not_found' })
    expect(await localFileCount()).toBe(before)
  })

  it('persists a local multipart upload before returning success', async () => {
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x10,
    ])
    const formData = new FormData()
    formData.set('projectId', projectA)
    formData.set('assetType', 'character')
    formData.set('assetId', uploadCharacter)
    formData.set('sourceUrl', 'https://example.test/multipart-reference')
    formData.set('sourceNote', 'Multipart route upload')
    formData.set('file', new File([png], 'multipart.png', { type: 'image/png' }))
    const previousRoot = process.env.ASSET_LOCAL_STORAGE_ROOT
    const previousDriver = process.env.ASSET_STORAGE_DRIVER
    process.env.ASSET_LOCAL_STORAGE_ROOT = localRoot
    process.env.ASSET_STORAGE_DRIVER = 'local'
    try {
      const response = await uploadLocalAsset(new Request('http://localhost/api/asset-images/local-upload', {
        method: 'POST',
        body: formData,
      }))
      const result = await response.json() as { ok: boolean; value?: { storageKey: string } }
      expect(response.status).toBe(201)
      expect(result.ok).toBe(true)
      expect(result.value?.storageKey).toBeTruthy()
      await expect(readFile(resolveLocalAssetPath(result.value!.storageKey, localRoot))).resolves.toBeTruthy()
      expect(await getDatabase().select().from(assetImages)
        .where(eq(assetImages.storageKey, result.value!.storageKey))).toHaveLength(1)
    } finally {
      if (previousRoot === undefined) delete process.env.ASSET_LOCAL_STORAGE_ROOT
      else process.env.ASSET_LOCAL_STORAGE_ROOT = previousRoot
      if (previousDriver === undefined) delete process.env.ASSET_STORAGE_DRIVER
      else process.env.ASSET_STORAGE_DRIVER = previousDriver
    }
  })

  it('rejects a sixth Inspiration image', async () => {
    for (let index = 1; index <= 5; index += 1) {
      expect((await upload(characterA, index)).ok).toBe(true)
    }
    expect(await upload(characterA, 6)).toEqual({
      ok: false,
      reason: 'image_limit_reached',
    })
  })

  it('enforces full project and asset-type scope', async () => {
    const [image] = await getDatabase().select().from(assetImages)
      .where(eq(assetImages.characterId, characterA)).limit(1)
    expect(await getAssetImage(projectA, 'costume', costumeA, image.id)).toBeNull()
    expect(await setAssetImageAsMaster(projectA, 'costume', costumeA, image.id))
      .toEqual({ ok: false, reason: 'not_found' })
    expect(await setAssetImageAsMaster(projectB, 'character', characterB, image.id))
      .toEqual({ ok: false, reason: 'not_found' })
  })

  it('atomically replaces the Master Reference and keeps only one master', async () => {
    const images = await getDatabase().select().from(assetImages)
      .where(eq(assetImages.characterId, characterA))
    expect((await setAssetImageAsMaster(projectA, 'character', characterA, images[0].id)).ok).toBe(true)
    expect((await setAssetImageAsMaster(projectA, 'character', characterA, images[1].id)).ok).toBe(true)
    const updated = await getDatabase().select().from(assetImages)
      .where(eq(assetImages.characterId, characterA))
    expect(updated.filter(image => image.imageRole === 'Master Reference')).toHaveLength(1)
    expect(updated.find(image => image.id === images[0].id)?.imageRole).toBe('Inspiration')
    expect(updated.find(image => image.id === images[1].id)?.imageRole).toBe('Master Reference')
    expect(updated.filter(image => image.imageRole === 'Inspiration')).toHaveLength(4)
  })

  it('rolls back a failed master promotion', async () => {
    const database = getDatabase()
    const images = await database.select().from(assetImages)
      .where(eq(assetImages.characterId, characterA))
    const currentMaster = images.find(image => image.imageRole === 'Master Reference')
    const target = images.find(image => image.imageRole === 'Inspiration')
    expect(currentMaster && target).toBeTruthy()
    await database.execute(sql`
      CREATE OR REPLACE FUNCTION scenepilot_test_fail_master_promotion()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.image_role = 'Master Reference' AND NEW.id = ${sql.raw(`'${target!.id}'::uuid`)} THEN
          RAISE EXCEPTION 'forced master promotion failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    await database.execute(sql`
      CREATE TRIGGER scenepilot_test_fail_master_promotion_trigger
      BEFORE UPDATE ON asset_images
      FOR EACH ROW EXECUTE FUNCTION scenepilot_test_fail_master_promotion()
    `)
    try {
      await expect(setAssetImageAsMaster(projectA, 'character', characterA, target!.id))
        .rejects.toThrow()
    } finally {
      await database.execute(sql`DROP TRIGGER IF EXISTS scenepilot_test_fail_master_promotion_trigger ON asset_images`)
      await database.execute(sql`DROP FUNCTION IF EXISTS scenepilot_test_fail_master_promotion()`)
    }
    const after = await database.select().from(assetImages)
      .where(eq(assetImages.characterId, characterA))
    expect(after.find(image => image.id === currentMaster!.id)?.imageRole).toBe('Master Reference')
    expect(after.filter(image => image.imageRole === 'Master Reference')).toHaveLength(1)
  })

  it('reorders only the complete scoped Inspiration set', async () => {
    const supporting = await getDatabase().select().from(assetImages).where(and(
      eq(assetImages.characterId, characterA),
      eq(assetImages.imageRole, 'Inspiration'),
    ))
    const master = (await getDatabase().select().from(assetImages).where(and(
      eq(assetImages.characterId, characterA),
      eq(assetImages.imageRole, 'Master Reference'),
    )))[0]
    const reversed = supporting.map(image => image.id).reverse()
    expect(await reorderAssetImages(projectA, 'character', characterA, reversed)).toBe(true)
    expect(await reorderAssetImages(projectA, 'character', characterA, reversed.slice(1))).toBe(false)
    expect(await reorderAssetImages(projectA, 'character', characterA, [...reversed, reversed[0]])).toBe(false)
    expect(await reorderAssetImages(projectA, 'character', characterA, [...reversed.slice(1), master.id])).toBe(false)

    const locationImage = await upload(locationA, 30, 'location')
    expect(locationImage.ok).toBe(true)
    expect(await reorderAssetImages(
      projectA,
      'character',
      characterA,
      [...reversed.slice(1), locationImage.ok ? locationImage.value.id : randomUUID()],
    )).toBe(false)
  })

  it('keeps Costume ownership immutable under a manipulated update', async () => {
    const image = await upload(costumeA, 40, 'costume')
    expect(image.ok).toBe(true)
    if (image.ok) {
      expect((await setAssetImageAsMaster(projectA, 'costume', costumeA, image.value.id)).ok).toBe(true)
    }
    const current = await getCostume(projectA, costumeA)
    expect(current?.characterId).toBe(characterA)
    const updated = await updateCostume(projectA, costumeA, {
      name: 'Diplomatic Costume Revised',
      description: 'Revised visual direction.',
      category: 'Formal',
      condition: 'Clean',
      isDefault: false,
      characterId: characterA2,
    } as Parameters<typeof updateCostume>[2] & { characterId: string })
    expect(updated.costume?.characterId).toBe(characterA)
    expect((await getCostume(projectA, costumeA))?.characterId).toBe(characterA)
    const [master] = await getDatabase().select().from(assetImages).where(and(
      eq(assetImages.costumeId, costumeA),
      eq(assetImages.imageRole, 'Master Reference'),
    ))
    expect(master.costumeId).toBe(costumeA)
  })

  it('creates retryable cleanup jobs without persisting raw errors', async () => {
    const image = (await getDatabase().select().from(assetImages).where(and(
      eq(assetImages.characterId, characterA),
      eq(assetImages.imageRole, 'Inspiration'),
    )).limit(1))[0]
    const deleted = await deleteAssetImage(projectA, 'character', characterA, image.id)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    const [job] = await getDatabase().select().from(assetStorageDeletionJobs)
      .where(eq(assetStorageDeletionJobs.id, deleted.value.cleanupJobId))
    expect(job.storageKey).toBe(image.storageKey)
    expect(job.completedAt).toBeNull()
    await processAssetStorageDeletionJobs([job.id])
    const [failed] = await getDatabase().select().from(assetStorageDeletionJobs)
      .where(eq(assetStorageDeletionJobs.id, job.id))
    expect(failed.attemptCount).toBe(1)
    expect(failed.completedAt).toBeNull()
    expect(failed.lastErrorCode).toBe('STORAGE_CONFIGURATION_ERROR')
    expect(failed.lastErrorCode).not.toContain('Unsupported persisted storage provider')
    await processAssetStorageDeletionJobs([job.id])
    const [retried] = await getDatabase().select().from(assetStorageDeletionJobs)
      .where(eq(assetStorageDeletionJobs.id, job.id))
    expect(retried.attemptCount).toBe(2)
    expect(retried.nextAttemptAt.getTime()).toBeGreaterThan(failed.nextAttemptAt.getTime())

    const [missingLocalJob] = await getDatabase().insert(assetStorageDeletionJobs).values({
      storageProvider: 'local',
      storageKey: `asset-images/${projectA}/character/${characterA}/${randomUUID()}.png`,
    }).returning()
    await processAssetStorageDeletionJobs([missingLocalJob.id])
    const [completed] = await getDatabase().select().from(assetStorageDeletionJobs)
      .where(eq(assetStorageDeletionJobs.id, missingLocalJob.id))
    expect(completed.completedAt).toBeInstanceOf(Date)
    expect(completed.lastErrorCode).toBeNull()
  })

  it('deleting a local image schedules and completes file cleanup', async () => {
    const [image] = await getDatabase().select().from(assetImages)
      .where(eq(assetImages.characterId, uploadCharacter)).limit(1)
    await expect(readFile(resolveLocalAssetPath(image.storageKey, localRoot))).resolves.toBeTruthy()
    const previousRoot = process.env.ASSET_LOCAL_STORAGE_ROOT
    process.env.ASSET_LOCAL_STORAGE_ROOT = localRoot
    try {
      const deleted = await deleteAssetImage(projectA, 'character', uploadCharacter, image.id)
      expect(deleted.ok).toBe(true)
      if (!deleted.ok) return
      await processAssetStorageDeletionJobs([deleted.value.cleanupJobId])
      const [job] = await getDatabase().select().from(assetStorageDeletionJobs)
        .where(eq(assetStorageDeletionJobs.id, deleted.value.cleanupJobId))
      expect(job.completedAt).toBeInstanceOf(Date)
      await expect(readFile(resolveLocalAssetPath(image.storageKey, localRoot))).rejects.toThrow()
    } finally {
      if (previousRoot === undefined) delete process.env.ASSET_LOCAL_STORAGE_ROOT
      else process.env.ASSET_LOCAL_STORAGE_ROOT = previousRoot
    }
  })

  it('deleting inspiration leaves the master and deleting master leaves none', async () => {
    const database = getDatabase()
    const images = await database.select().from(assetImages)
      .where(eq(assetImages.characterId, characterA))
    const master = images.find(image => image.imageRole === 'Master Reference')!
    const inspiration = images.find(image => image.imageRole === 'Inspiration')!
    expect((await deleteAssetImage(projectA, 'character', characterA, inspiration.id)).ok).toBe(true)
    expect((await database.select().from(assetImages).where(and(
      eq(assetImages.characterId, characterA),
      eq(assetImages.imageRole, 'Master Reference'),
    )))).toHaveLength(1)
    expect((await deleteAssetImage(projectA, 'character', characterA, master.id)).ok).toBe(true)
    expect((await database.select().from(assetImages).where(and(
      eq(assetImages.characterId, characterA),
      eq(assetImages.imageRole, 'Master Reference'),
    )))).toHaveLength(0)
  })

  it('deleting an unused asset schedules cleanup for all related images', async () => {
    const imageKeys = (await getDatabase().select({ key: assetImages.storageKey })
      .from(assetImages).where(eq(assetImages.locationId, locationA))).map(image => image.key)
    expect(imageKeys.length).toBeGreaterThan(0)
    expect(await deleteLocation(projectA, locationA)).toEqual({ deleted: true })
    const jobs = await getDatabase().select().from(assetStorageDeletionJobs)
      .where(inArray(assetStorageDeletionJobs.storageKey, imageKeys))
    expect(jobs.map(job => job.storageKey).sort()).toEqual(imageKeys.sort())
  })
})
