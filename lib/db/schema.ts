import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 140 }).notNull(),
  description: text('description'),
  genre: varchar('genre', { length: 40 }).notNull(),
  primaryLanguage: varchar('primary_language', { length: 40 }).notNull(),
  episodeCount: integer('episode_count').notNull(),
  episodeDuration: varchar('episode_duration', { length: 30 }).notNull(),
  orientation: varchar('orientation', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  currentSeason: integer('current_season').notNull(),
  nextCharacterNumber: integer('next_character_number').default(1).notNull(),
  nextCostumeNumber: integer('next_costume_number').default(1).notNull(),
  nextLocationNumber: integer('next_location_number').default(1).notNull(),
  nextEpisodeNumber: integer('next_episode_number').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('projects_slug_unique').on(table.slug),
  index('projects_status_idx').on(table.status),
  index('projects_archived_at_idx').on(table.archivedAt),
])

export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assetCode: varchar('asset_code', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  narrativeRole: varchar('narrative_role', { length: 30 }).notNull(),
  age: integer('age'),
  genderPresentation: varchar('gender_presentation', { length: 100 }),
  personality: text('personality'),
  motivation: text('motivation'),
  visualDirection: text('visual_direction'),
  appearance: text('appearance'),
  distinguishingFeatures: text('distinguishing_features'),
  approvalStatus: varchar('approval_status', { length: 20 }).default('Draft').notNull(),
  facialIdentityLocked: boolean('facial_identity_locked').default(false).notNull(),
  skinToneLocked: boolean('skin_tone_locked').default(false).notNull(),
  eyeColorLocked: boolean('eye_color_locked').default(false).notNull(),
  hairstyleLocked: boolean('hairstyle_locked').default(false).notNull(),
  bodyProportionsLocked: boolean('body_proportions_locked').default(false).notNull(),
  distinguishingFeaturesLocked: boolean('distinguishing_features_locked').default(false).notNull(),
  accessoriesLocked: boolean('accessories_locked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('characters_project_asset_code_unique').on(table.projectId, table.assetCode),
  index('characters_project_id_idx').on(table.projectId),
  index('characters_approval_status_idx').on(table.approvalStatus),
  index('characters_archived_at_idx').on(table.archivedAt),
])

export const costumes = pgTable('costumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'restrict' }),
  assetCode: varchar('asset_code', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 30 }).default('Default').notNull(),
  condition: varchar('condition', { length: 30 }).default('Clean').notNull(),
  approvalStatus: varchar('approval_status', { length: 20 }).default('Draft').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('costumes_project_asset_code_unique').on(table.projectId, table.assetCode),
  uniqueIndex('costumes_character_default_unique')
    .on(table.characterId)
    .where(sql`${table.isDefault} = true AND ${table.archivedAt} IS NULL`),
  index('costumes_project_id_idx').on(table.projectId),
  index('costumes_character_id_idx').on(table.characterId),
  index('costumes_approval_status_idx').on(table.approvalStatus),
  index('costumes_archived_at_idx').on(table.archivedAt),
])

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assetCode: varchar('asset_code', { length: 20 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  locationType: varchar('location_type', { length: 30 }).notNull(),
  architectureStyle: varchar('architecture_style', { length: 500 }),
  defaultTimeOfDay: varchar('default_time_of_day', { length: 30 }).notNull(),
  defaultLighting: varchar('default_lighting', { length: 40 }).notNull(),
  visualIdentityNotes: text('visual_identity_notes'),
  approvalStatus: varchar('approval_status', { length: 20 }).default('Draft').notNull(),
  architectureLocked: boolean('architecture_locked').default(false).notNull(),
  layoutLocked: boolean('layout_locked').default(false).notNull(),
  lightingLocked: boolean('lighting_locked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('locations_project_asset_code_unique').on(table.projectId, table.assetCode),
  index('locations_project_id_idx').on(table.projectId),
  index('locations_approval_status_idx').on(table.approvalStatus),
  index('locations_archived_at_idx').on(table.archivedAt),
])

export const assetImages = pgTable('asset_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }),
  costumeId: uuid('costume_id').references(() => costumes.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }),
  imageRole: varchar('image_role', { length: 30 }).notNull(),
  sourceType: varchar('source_type', { length: 20 }).notNull(),
  storageProvider: varchar('storage_provider', { length: 40 }).notNull(),
  storageKey: text('storage_key').notNull(),
  storageUrl: text('storage_url').notNull(),
  originalFilename: text('original_filename'),
  mimeType: varchar('mime_type', { length: 40 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  sourceUrl: text('source_url'),
  sourceNote: text('source_note'),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, table => [
  check(
    'asset_images_exactly_one_owner_check',
    sql`num_nonnulls(${table.characterId}, ${table.costumeId}, ${table.locationId}) = 1`,
  ),
  uniqueIndex('asset_images_storage_key_unique').on(table.storageKey),
  uniqueIndex('asset_images_character_master_unique')
    .on(table.characterId)
    .where(sql`${table.characterId} is not null AND ${table.imageRole} = 'Master Reference'`),
  uniqueIndex('asset_images_costume_master_unique')
    .on(table.costumeId)
    .where(sql`${table.costumeId} is not null AND ${table.imageRole} = 'Master Reference'`),
  uniqueIndex('asset_images_location_master_unique')
    .on(table.locationId)
    .where(sql`${table.locationId} is not null AND ${table.imageRole} = 'Master Reference'`),
  index('asset_images_project_id_idx').on(table.projectId),
  index('asset_images_character_id_idx').on(table.characterId),
  index('asset_images_costume_id_idx').on(table.costumeId),
  index('asset_images_location_id_idx').on(table.locationId),
  index('asset_images_image_role_idx').on(table.imageRole),
  index('asset_images_created_at_idx').on(table.createdAt),
])

export const episodes = pgTable('episodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeNumber: integer('episode_number').notNull(),
  nextSceneNumber: integer('next_scene_number').default(1).notNull(),
  title: varchar('title', { length: 150 }).notNull(),
  summary: text('summary'),
  outline: text('outline'),
  script: text('script'),
  cliffhanger: text('cliffhanger'),
  targetDurationSeconds: integer('target_duration_seconds').notNull(),
  status: varchar('status', { length: 30 }).default('Draft').notNull(),
  productionStatus: varchar('production_status', { length: 40 }).default('Not Started').notNull(),
  storyboardStatus: varchar('storyboard_status', { length: 30 }).default('Not Started').notNull(),
  storyboardApprovedAt: timestamp('storyboard_approved_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('episodes_project_number_unique').on(table.projectId, table.episodeNumber),
  index('episodes_project_id_idx').on(table.projectId),
  index('episodes_status_idx').on(table.status),
  index('episodes_production_status_idx').on(table.productionStatus),
  index('episodes_archived_at_idx').on(table.archivedAt),
])

export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  sceneNumber: integer('scene_number').notNull(),
  position: integer('position').notNull(),
  nextShotNumber: integer('next_shot_number').default(1).notNull(),
  title: varchar('title', { length: 150 }).notNull(),
  purpose: text('purpose'),
  summary: text('summary'),
  script: text('script'),
  emotionalTone: varchar('emotional_tone', { length: 200 }),
  timeOfDay: varchar('time_of_day', { length: 30 }).default('Unspecified').notNull(),
  targetDurationSeconds: integer('target_duration_seconds').notNull(),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 30 }).default('Draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('scenes_episode_number_unique').on(table.episodeId, table.sceneNumber),
  uniqueIndex('scenes_episode_active_position_unique')
    .on(table.episodeId, table.position)
    .where(sql`${table.archivedAt} is null`),
  index('scenes_project_id_idx').on(table.projectId),
  index('scenes_episode_id_idx').on(table.episodeId),
  index('scenes_location_id_idx').on(table.locationId),
  index('scenes_position_idx').on(table.position),
  index('scenes_archived_at_idx').on(table.archivedAt),
])

export const sceneCharacters = pgTable('scene_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'restrict' }),
  costumeId: uuid('costume_id').references(() => costumes.id, { onDelete: 'restrict' }),
  roleInScene: varchar('role_in_scene', { length: 100 }),
  emotionalState: varchar('emotional_state', { length: 500 }),
  physicalState: varchar('physical_state', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, table => [
  uniqueIndex('scene_characters_scene_character_unique').on(table.sceneId, table.characterId),
  index('scene_characters_project_id_idx').on(table.projectId),
  index('scene_characters_episode_id_idx').on(table.episodeId),
  index('scene_characters_scene_id_idx').on(table.sceneId),
  index('scene_characters_character_id_idx').on(table.characterId),
  index('scene_characters_costume_id_idx').on(table.costumeId),
])

export const shots = pgTable('shots', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  shotNumber: integer('shot_number').notNull(),
  position: integer('position').notNull(),
  title: varchar('title', { length: 150 }).notNull(),
  description: text('description'),
  shotType: varchar('shot_type', { length: 40 }).notNull(),
  cameraAngle: varchar('camera_angle', { length: 40 }).notNull(),
  cameraMovement: varchar('camera_movement', { length: 40 }).notNull(),
  lens: varchar('lens', { length: 30 }).notNull(),
  composition: text('composition'),
  action: text('action'),
  dialogueExcerpt: text('dialogue_excerpt'),
  emotionalIntent: varchar('emotional_intent', { length: 500 }),
  targetDurationSeconds: integer('target_duration_seconds').notNull(),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  timeOfDay: varchar('time_of_day', { length: 30 }).default('Continuous').notNull(),
  lightingNotes: text('lighting_notes'),
  generationPrompt: text('generation_prompt'),
  negativePrompt: text('negative_prompt'),
  status: varchar('status', { length: 30 }).default('Draft').notNull(),
  approvalStatus: varchar('approval_status', { length: 20 }).default('Draft').notNull(),
  compositionLocked: boolean('composition_locked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('shots_scene_number_unique').on(table.sceneId, table.shotNumber),
  uniqueIndex('shots_scene_active_position_unique')
    .on(table.sceneId, table.position)
    .where(sql`${table.archivedAt} is null`),
  index('shots_project_id_idx').on(table.projectId),
  index('shots_episode_id_idx').on(table.episodeId),
  index('shots_scene_id_idx').on(table.sceneId),
  index('shots_location_id_idx').on(table.locationId),
  index('shots_approval_status_idx').on(table.approvalStatus),
  index('shots_archived_at_idx').on(table.archivedAt),
])

export const shotCharacters = pgTable('shot_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  shotId: uuid('shot_id').notNull().references(() => shots.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'restrict' }),
  costumeId: uuid('costume_id').references(() => costumes.id, { onDelete: 'restrict' }),
  screenPosition: varchar('screen_position', { length: 30 }),
  pose: varchar('pose', { length: 500 }),
  expression: varchar('expression', { length: 500 }),
  action: text('action'),
  gazeDirection: varchar('gaze_direction', { length: 300 }),
  physicalState: varchar('physical_state', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, table => [
  uniqueIndex('shot_characters_shot_character_unique').on(table.shotId, table.characterId),
  index('shot_characters_project_id_idx').on(table.projectId),
  index('shot_characters_episode_id_idx').on(table.episodeId),
  index('shot_characters_scene_id_idx').on(table.sceneId),
  index('shot_characters_shot_id_idx').on(table.shotId),
  index('shot_characters_character_id_idx').on(table.characterId),
  index('shot_characters_costume_id_idx').on(table.costumeId),
])

export const storyboardJobs = pgTable('storyboard_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  shotId: uuid('shot_id').notNull().references(() => shots.id, { onDelete: 'cascade' }),
  jobType: varchar('job_type', { length: 40 }).notNull(),
  status: varchar('status', { length: 20 }).default('Queued').notNull(),
  progress: integer('progress').default(0).notNull(),
  inputSnapshot: jsonb('input_snapshot').notNull(),
  outputPlaceholder: jsonb('output_placeholder'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, table => [
  index('storyboard_jobs_project_id_idx').on(table.projectId),
  index('storyboard_jobs_episode_id_idx').on(table.episodeId),
  index('storyboard_jobs_scene_id_idx').on(table.sceneId),
  index('storyboard_jobs_shot_id_idx').on(table.shotId),
  index('storyboard_jobs_status_idx').on(table.status),
])

export const aiGenerations = pgTable('ai_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }),
  taskType: varchar('task_type', { length: 60 }).notNull(),
  provider: varchar('provider', { length: 40 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  promptVersion: varchar('prompt_version', { length: 60 }).notNull(),
  status: varchar('status', { length: 20 }).default('Queued').notNull(),
  inputSnapshot: jsonb('input_snapshot').notNull(),
  output: jsonb('output'),
  rawOutput: text('raw_output'),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }),
  applyMetadata: jsonb('apply_metadata'),
}, table => [
  index('ai_generations_project_id_idx').on(table.projectId),
  index('ai_generations_episode_id_idx').on(table.episodeId),
  index('ai_generations_scene_id_idx').on(table.sceneId),
  index('ai_generations_task_type_idx').on(table.taskType),
  index('ai_generations_status_idx').on(table.status),
  index('ai_generations_created_at_idx').on(table.createdAt),
])

export type ProjectRecord = typeof projects.$inferSelect
export type CharacterRecord = typeof characters.$inferSelect
export type CostumeRecord = typeof costumes.$inferSelect
export type LocationRecord = typeof locations.$inferSelect
export type AssetImageRecord = typeof assetImages.$inferSelect
export type EpisodeRecord = typeof episodes.$inferSelect
export type SceneRecord = typeof scenes.$inferSelect
export type SceneCharacterRecord = typeof sceneCharacters.$inferSelect
export type ShotRecord = typeof shots.$inferSelect
export type ShotCharacterRecord = typeof shotCharacters.$inferSelect
export type StoryboardJobRecord = typeof storyboardJobs.$inferSelect
export type AIGenerationRecord = typeof aiGenerations.$inferSelect
