import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDatabase } from '@/lib/db'
import {
  assetImages,
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
} from '@/lib/db/queries/asset-images'

const runDatabaseTests = process.env.RUN_DB_TESTS === '1'
const suite = runDatabaseTests ? describe : describe.skip

suite.sequential('asset image scoping and master references', () => {
  const projectA = randomUUID()
  const projectB = randomUUID()
  const characterA = randomUUID()
  const characterB = randomUUID()
  const archivedCharacter = randomUUID()
  const costumeA = randomUUID()
  const locationA = randomUUID()

  beforeAll(async () => {
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
    await getDatabase().delete(projects).where(inArray(projects.id, [projectA, projectB]))
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
    expect(updated.find(image => image.id === images[0].id)?.imageRole).toBe('Alternate View')
    expect(updated.find(image => image.id === images[1].id)?.imageRole).toBe('Master Reference')
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
})
