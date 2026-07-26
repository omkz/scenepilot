import {
  boolean,
  index,
  integer,
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

export type ProjectRecord = typeof projects.$inferSelect
export type CharacterRecord = typeof characters.$inferSelect
export type CostumeRecord = typeof costumes.$inferSelect
export type LocationRecord = typeof locations.$inferSelect
