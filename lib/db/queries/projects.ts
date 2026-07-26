import 'server-only'

import { and, desc, eq, ilike, isNotNull, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '@/lib/db'
import { projects, type ProjectRecord } from '@/lib/db/schema'
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/projects/validation'
import type { ProjectDto, ProjectStatus } from '@/lib/projects/types'

interface ListProjectsOptions {
  archiveView?: 'active' | 'archived'
  search?: string
  status?: ProjectStatus
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

  return slug || 'project'
}

export function serializeProject(project: ProjectRecord): ProjectDto {
  return {
    ...project,
    genre: project.genre as ProjectDto['genre'],
    primaryLanguage: project.primaryLanguage as ProjectDto['primaryLanguage'],
    episodeDuration: project.episodeDuration as ProjectDto['episodeDuration'],
    orientation: project.orientation as ProjectDto['orientation'],
    status: project.status as ProjectDto['status'],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    archivedAt: project.archivedAt?.toISOString() || null,
  }
}

async function createUniqueSlug(name: string, excludeProjectId?: string) {
  const database = getDatabase()
  const baseSlug = slugify(name)

  for (let suffix = 1; suffix <= 1000; suffix += 1) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`
    const conditions = [eq(projects.slug, slug)]
    if (excludeProjectId) conditions.push(ne(projects.id, excludeProjectId))

    const existing = await database
      .select({ id: projects.id })
      .from(projects)
      .where(and(...conditions))
      .limit(1)

    if (existing.length === 0) return slug
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
}

export async function listProjects(options: ListProjectsOptions = {}) {
  const database = getDatabase()
  const conditions = [
    options.archiveView === 'archived' ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt),
  ]

  if (options.search?.trim()) {
    conditions.push(ilike(projects.name, `%${options.search.trim()}%`))
  }
  if (options.status) {
    conditions.push(eq(projects.status, options.status))
  }

  const rows = await database
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt))

  return rows.map(serializeProject)
}

export async function getProjectById(id: string, includeArchived = false) {
  if (!z.uuid().safeParse(id).success) return null

  const database = getDatabase()
  const conditions = [eq(projects.id, id)]
  if (!includeArchived) conditions.push(isNull(projects.archivedAt))

  const [project] = await database
    .select()
    .from(projects)
    .where(and(...conditions))
    .limit(1)

  return project ? serializeProject(project) : null
}

export async function createProject(input: CreateProjectInput) {
  const database = getDatabase()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await createUniqueSlug(input.name)
    try {
      const [project] = await database
        .insert(projects)
        .values({ ...input, slug })
        .returning()
      return serializeProject(project)
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error
    }
  }

  throw new Error('Unable to generate a unique project slug')
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const database = getDatabase()
  const slug = await createUniqueSlug(input.name, id)
  const archivedAt = input.status === 'Archived' ? new Date() : null

  const [project] = await database
    .update(projects)
    .set({ ...input, slug, archivedAt, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()

  return project ? serializeProject(project) : null
}

export async function archiveProject(id: string) {
  const database = getDatabase()
  const [project] = await database
    .update(projects)
    .set({ status: 'Archived', archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()
  return project ? serializeProject(project) : null
}

export async function restoreProject(id: string) {
  const database = getDatabase()
  const [project] = await database
    .update(projects)
    .set({ status: 'Draft', archivedAt: null, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()
  return project ? serializeProject(project) : null
}

export async function deleteProject(id: string) {
  const database = getDatabase()
  const [project] = await database
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id })
  return project || null
}
