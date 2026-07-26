import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

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
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
}, table => [
  uniqueIndex('projects_slug_unique').on(table.slug),
  index('projects_status_idx').on(table.status),
  index('projects_archived_at_idx').on(table.archivedAt),
])

export type ProjectRecord = typeof projects.$inferSelect
