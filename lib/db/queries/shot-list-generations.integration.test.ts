import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { buildShotListContextFingerprint } from '@/lib/ai/context/shot-list'
import type { ShotList } from '@/lib/ai/schemas/shot-list'
import { AI_TASK_TYPES } from '@/lib/ai/task-types'
import { getDatabase } from '@/lib/db'
import {
  aiGenerations,
  characters,
  costumes,
  episodes,
  locations,
  projects,
  sceneCharacters,
  scenes,
  shots,
} from '@/lib/db/schema'
import { saveAndApplyShotListGeneration } from '@/lib/db/queries/shot-list-generations'

const runDatabaseTests = process.env.RUN_DB_TESTS === '1'
const suite = runDatabaseTests ? describe : describe.skip

suite.sequential('Shot List apply transaction', () => {
  const projectId = randomUUID()
  const episodeId = randomUUID()
  const sceneId = randomUUID()
  const characterId = randomUUID()
  const costumeId = randomUUID()
  const locationId = randomUUID()

  const draft: ShotList = {
    sceneTitle: 'Transaction scene',
    visualStrategy: 'Use clear coverage that escalates toward the final reveal.',
    pacingNotes: 'Hold the opening before accelerating into the reaction.',
    totalEstimatedDurationSeconds: 20,
    shots: [{
      temporaryId: 'shot-1',
      title: 'Current client title',
      description: 'The protagonist enters and discovers the hidden ledger.',
      shotType: 'Medium',
      cameraAngle: 'Eye Level',
      cameraMovement: 'Static',
      lens: '50mm',
      composition: 'Frame the protagonist beside the open cabinet.',
      action: 'The protagonist opens the hidden ledger.',
      dialogueExcerpt: null,
      emotionalIntent: 'Suspicion becomes certainty.',
      estimatedDurationSeconds: 20,
      locationId,
      timeOfDay: 'Continuous',
      lightingNotes: null,
      generationPrompt: null,
      negativePrompt: null,
      compositionLocked: false,
      characters: [{
        characterId,
        costumeId,
        screenPosition: 'Center',
        pose: 'Leaning forward',
        expression: 'Suspicious',
        action: 'Opens the ledger',
        gazeDirection: 'Down',
        physicalState: 'Uninjured',
      }],
    }],
  }

  beforeAll(async () => {
    const database = getDatabase()
    await database.insert(projects).values({
      id: projectId,
      name: 'Shot List Integration',
      slug: `shot-list-${projectId}`,
      genre: 'Thriller',
      primaryLanguage: 'English',
      episodeCount: 1,
      episodeDuration: '30–60 seconds',
      orientation: 'Vertical 9:16',
      status: 'Active',
      currentSeason: 1,
    })
    await database.insert(episodes).values({
      id: episodeId,
      projectId,
      episodeNumber: 1,
      title: 'Integration Episode',
      targetDurationSeconds: 60,
      status: 'Approved',
      productionStatus: 'Ready for Production',
    })
    await database.insert(locations).values({
      id: locationId,
      projectId,
      assetCode: 'LOCATION-001',
      name: 'Archive Room',
      locationType: 'Interior',
      defaultTimeOfDay: 'Night',
      defaultLighting: 'Low-key Dramatic',
      approvalStatus: 'Approved',
    })
    await database.insert(characters).values({
      id: characterId,
      projectId,
      assetCode: 'CHAR-001',
      name: 'Mara Vale',
      narrativeRole: 'Protagonist',
      approvalStatus: 'Approved',
    })
    await database.insert(costumes).values({
      id: costumeId,
      projectId,
      characterId,
      assetCode: 'COSTUME-001',
      name: 'Archive Uniform',
      approvalStatus: 'Approved',
      isDefault: true,
    })
    await database.insert(scenes).values({
      id: sceneId,
      projectId,
      episodeId,
      sceneNumber: 1,
      position: 1,
      title: 'Ledger reveal',
      purpose: 'Reveal the conspiracy through a hidden document.',
      summary: 'Mara discovers the ledger in the archive room.',
      script: 'Mara opens the ledger and realizes the truth.',
      emotionalTone: 'Suspicious',
      timeOfDay: 'Night',
      targetDurationSeconds: 20,
      locationId,
      status: 'Approved',
    })
    await database.insert(sceneCharacters).values({
      projectId,
      episodeId,
      sceneId,
      characterId,
      costumeId,
      emotionalState: 'Suspicious',
      physicalState: 'Uninjured',
    })
  })

  afterAll(async () => {
    if (!runDatabaseTests) return
    await getDatabase().delete(projects).where(eq(projects.id, projectId))
    const client = (globalThis as typeof globalThis & {
      scenepilotPostgres?: { end: () => Promise<void> }
    }).scenepilotPostgres
    await client?.end()
  })

  async function createGeneration(fingerprint?: string) {
    const database = getDatabase()
    const [scene] = await database.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1)
    const [assignment] = await database.select().from(sceneCharacters)
      .where(eq(sceneCharacters.sceneId, sceneId)).limit(1)
    const contextFingerprint = fingerprint || buildShotListContextFingerprint({
      ...scene,
      updatedAt: scene.updatedAt.toISOString(),
    }, [assignment])
    const [generation] = await database.insert(aiGenerations).values({
      projectId,
      episodeId,
      sceneId,
      taskType: AI_TASK_TYPES.sceneShotList,
      provider: 'test',
      model: 'test',
      promptVersion: 'shot-list-v1',
      status: 'Completed',
      inputSnapshot: { contextFingerprint },
      output: draft,
    }).returning()
    return generation
  }

  it('applies the current draft, preserves numbering, and blocks repeat Apply', async () => {
    const generation = await createGeneration()
    const result = await saveAndApplyShotListGeneration({
      projectId,
      episodeId,
      sceneId,
      generationId: generation.id,
      mode: 'append',
      input: draft,
    })
    expect(result.ok).toBe(true)
    const created = await getDatabase().select().from(shots).where(eq(shots.sceneId, sceneId))
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      title: 'Current client title',
      shotNumber: 1,
      position: 1,
      status: 'Draft',
      approvalStatus: 'Draft',
    })
    const repeated = await saveAndApplyShotListGeneration({
      projectId,
      episodeId,
      sceneId,
      generationId: generation.id,
      mode: 'append',
      input: draft,
    })
    expect(repeated).toEqual({ ok: false, reason: 'already_applied' })
  })

  it('append preserves active Shots and replace archives them without reusing numbers', async () => {
    const appendGeneration = await createGeneration()
    const appended = await saveAndApplyShotListGeneration({
      projectId,
      episodeId,
      sceneId,
      generationId: appendGeneration.id,
      mode: 'append',
      input: { ...draft, shots: [{ ...draft.shots[0], temporaryId: 'shot-2', title: 'Appended shot' }] },
    })
    expect(appended.ok).toBe(true)

    const replaceGeneration = await createGeneration()
    const replaced = await saveAndApplyShotListGeneration({
      projectId,
      episodeId,
      sceneId,
      generationId: replaceGeneration.id,
      mode: 'replace',
      input: { ...draft, shots: [{ ...draft.shots[0], temporaryId: 'shot-3', title: 'Replacement shot' }] },
    })
    expect(replaced.ok).toBe(true)
    const allShots = await getDatabase().select().from(shots).where(eq(shots.sceneId, sceneId))
    expect(allShots.filter(item => !item.archivedAt)).toHaveLength(1)
    expect(allShots.filter(item => item.archivedAt)).toHaveLength(2)
    expect(allShots.map(item => item.shotNumber).sort()).toEqual([1, 2, 3])
    expect(allShots.find(item => !item.archivedAt)?.position).toBe(1)
  })

  it('blocks stale context without modifying active Shots', async () => {
    const generation = await createGeneration('stale-fingerprint')
    const before = await getDatabase().select().from(shots).where(eq(shots.sceneId, sceneId))
    const result = await saveAndApplyShotListGeneration({
      projectId,
      episodeId,
      sceneId,
      generationId: generation.id,
      mode: 'replace',
      input: draft,
    })
    const after = await getDatabase().select().from(shots).where(eq(shots.sceneId, sceneId))
    expect(result).toEqual({ ok: false, reason: 'context_changed' })
    expect(after).toEqual(before)
  })

  it('rolls back Shot, archive, counter, and generation changes on assignment failure', async () => {
    const database = getDatabase()
    const generation = await createGeneration()
    const beforeShots = await database.select().from(shots).where(eq(shots.sceneId, sceneId))
    const [beforeScene] = await database.select().from(scenes).where(eq(scenes.id, sceneId))
    await database.execute(sql`
      CREATE OR REPLACE FUNCTION scenepilot_test_fail_shot_character()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced shot character failure';
      END;
      $$ LANGUAGE plpgsql
    `)
    await database.execute(sql`
      CREATE TRIGGER scenepilot_test_fail_shot_character_trigger
      BEFORE INSERT ON shot_characters
      FOR EACH ROW EXECUTE FUNCTION scenepilot_test_fail_shot_character()
    `)
    try {
      const result = await saveAndApplyShotListGeneration({
        projectId,
        episodeId,
        sceneId,
        generationId: generation.id,
        mode: 'replace',
        input: draft,
      })
      expect(result).toEqual({ ok: false, reason: 'apply_failed' })
    } finally {
      await database.execute(sql`
        DROP TRIGGER IF EXISTS scenepilot_test_fail_shot_character_trigger ON shot_characters
      `)
      await database.execute(sql`
        DROP FUNCTION IF EXISTS scenepilot_test_fail_shot_character()
      `)
    }
    const afterShots = await database.select().from(shots).where(eq(shots.sceneId, sceneId))
    const [afterScene] = await database.select().from(scenes).where(eq(scenes.id, sceneId))
    const [afterGeneration] = await database.select().from(aiGenerations)
      .where(eq(aiGenerations.id, generation.id))
    expect(afterShots).toEqual(beforeShots)
    expect(afterScene.nextShotNumber).toBe(beforeScene.nextShotNumber)
    expect(afterGeneration).toMatchObject({
      status: 'Completed',
      appliedAt: null,
      applyMetadata: null,
    })
  })
})
