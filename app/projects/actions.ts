'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  archiveProject,
  createProject,
  deleteProject,
  restoreProject,
  updateProject,
} from '@/lib/db/queries/projects'
import { createProjectSchema, updateProjectSchema } from '@/lib/projects/validation'

export interface ProjectActionState {
  message?: string
  errors?: Record<string, string[]>
}

function valueOrUndefined(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function projectPayload(formData: FormData, includeProjectState: boolean) {
  return {
    name: formData.get('name'),
    description: valueOrUndefined(formData.get('description')),
    genre: formData.get('genre'),
    primaryLanguage: formData.get('primaryLanguage'),
    episodeCount: valueOrUndefined(formData.get('episodeCount')),
    episodeDuration: valueOrUndefined(formData.get('episodeDuration')),
    orientation: valueOrUndefined(formData.get('orientation')),
    status: includeProjectState ? valueOrUndefined(formData.get('status')) : undefined,
    currentSeason: includeProjectState ? valueOrUndefined(formData.get('currentSeason')) : undefined,
  }
}

function validationState(error: z.ZodError): ProjectActionState {
  return {
    message: 'Please correct the highlighted fields.',
    errors: z.flattenError(error).fieldErrors,
  }
}

export async function createProjectAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const result = createProjectSchema.safeParse(projectPayload(formData, false))
  if (!result.success) return validationState(result.error)

  try {
    const project = await createProject(result.data)
    revalidatePath('/projects')
    redirect(`/projects/${project.id}/overview`)
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    return { message: 'Unable to create the project. Please try again.' }
  }
}

export async function updateProjectAction(
  projectId: string,
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const result = updateProjectSchema.safeParse(projectPayload(formData, true))
  if (!result.success) return validationState(result.error)

  try {
    const project = await updateProject(projectId, result.data)
    if (!project) return { message: 'Project not found.' }
    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)
    if (project.status === 'Archived') redirect('/projects')
    redirect(`/projects/${projectId}/settings?saved=1`)
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    return { message: 'Unable to update the project. Please try again.' }
  }
}

export async function archiveProjectAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get('projectId'))
  await archiveProject(projectId)
  revalidatePath('/projects')
  redirect('/projects')
}

export async function restoreProjectAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get('projectId'))
  await restoreProject(projectId)
  revalidatePath('/projects')
  redirect('/projects')
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get('projectId'))
  await deleteProject(projectId)
  revalidatePath('/projects')
  redirect('/projects')
}
