'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  archiveEpisode,
  createEpisode,
  deleteEpisode,
  getEpisode,
  restoreEpisode,
  setEpisodeStatuses,
  updateEpisode,
} from '@/lib/db/queries/episodes'
import {
  archiveScene,
  createScene,
  deleteScene,
  listScenes,
  reorderScenes,
  restoreScene,
  setSceneStatus,
  updateScene,
} from '@/lib/db/queries/scenes'
import {
  assignCharacterToScene,
  removeCharacterFromScene,
  updateSceneCharacter,
} from '@/lib/db/queries/scene-characters'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import { episodeInputSchema, sceneCharacterInputSchema, sceneInputSchema } from '@/lib/episodes/validation'
import { EPISODE_STATUSES, SCENE_STATUSES } from '@/lib/episodes/types'
import { checkEpisodeContinuity } from '@/lib/continuity/check-episode'
import { calculateEpisodeReadiness } from '@/lib/episodes/readiness'

export interface EpisodeActionState {
  message?: string
  errors?: Record<string, string[]>
}

const value = (formData: FormData, name: string) => formData.get(name)
const episodePayload = (formData: FormData) => ({
  title: value(formData, 'title'),
  summary: value(formData, 'summary'),
  outline: value(formData, 'outline'),
  script: value(formData, 'script'),
  cliffhanger: value(formData, 'cliffhanger'),
  targetDurationSeconds: value(formData, 'targetDurationSeconds'),
  status: value(formData, 'status'),
  productionStatus: value(formData, 'productionStatus') || 'Not Started',
})
const scenePayload = (formData: FormData) => ({
  title: value(formData, 'title'),
  purpose: value(formData, 'purpose'),
  summary: value(formData, 'summary'),
  script: value(formData, 'script'),
  emotionalTone: value(formData, 'emotionalTone'),
  timeOfDay: value(formData, 'timeOfDay'),
  targetDurationSeconds: value(formData, 'targetDurationSeconds'),
  locationId: value(formData, 'locationId'),
  status: value(formData, 'status'),
})
const assignmentPayload = (formData: FormData) => ({
  characterId: value(formData, 'characterId'),
  costumeId: value(formData, 'costumeId'),
  roleInScene: value(formData, 'roleInScene'),
  emotionalState: value(formData, 'emotionalState'),
  physicalState: value(formData, 'physicalState'),
})

function validation(error: z.ZodError): EpisodeActionState {
  return { message: 'Please correct the highlighted fields.', errors: z.flattenError(error).fieldErrors }
}

function refresh(projectId: string, episodeId?: string) {
  revalidatePath(`/projects/${projectId}/episodes`)
  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath(`/projects/${projectId}/production`)
  if (episodeId) revalidatePath(`/projects/${projectId}/episodes/${episodeId}`)
}

const detailPath = (projectId: string, episodeId: string, tab = 'overview', notice?: string, error?: string) => {
  const params = new URLSearchParams({ tab })
  if (notice) params.set('notice', notice)
  if (error) params.set('error', error)
  return `/projects/${projectId}/episodes/${episodeId}?${params}`
}

function rethrowRedirect(error: unknown) {
  if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
}

export async function createEpisodeAction(projectId: string, _state: EpisodeActionState, formData: FormData): Promise<EpisodeActionState> {
  const parsed = episodeInputSchema.safeParse(episodePayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const episode = await createEpisode(projectId, parsed.data)
    if (!episode) return { message: 'Project not found.' }
    refresh(projectId, episode.id)
    redirect(detailPath(projectId, episode.id, 'scenes', 'created'))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to create the episode.' }
  }
}

export async function updateEpisodeAction(projectId: string, episodeId: string, _state: EpisodeActionState, formData: FormData): Promise<EpisodeActionState> {
  const parsed = episodeInputSchema.safeParse(episodePayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const episode = await updateEpisode(projectId, episodeId, parsed.data)
    if (!episode) return { message: 'Episode not found in this project.' }
    refresh(projectId, episodeId)
    redirect(detailPath(projectId, episodeId, String(value(formData, 'returnTab') || 'overview'), 'episode-saved'))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to update the episode.' }
  }
}

export async function createSceneAction(projectId: string, episodeId: string, _state: EpisodeActionState, formData: FormData): Promise<EpisodeActionState> {
  const parsed = sceneInputSchema.safeParse(scenePayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const scene = await createScene(projectId, episodeId, parsed.data)
    if (!scene) return { message: 'Scene assets must belong to this project.' }
    refresh(projectId, episodeId)
    redirect(detailPath(projectId, episodeId, 'scenes', `scene-${scene.sceneNumber}`))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to create the scene.' }
  }
}

export async function updateSceneAction(projectId: string, episodeId: string, sceneId: string, _state: EpisodeActionState, formData: FormData): Promise<EpisodeActionState> {
  const parsed = sceneInputSchema.safeParse(scenePayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const scene = await updateScene(projectId, episodeId, sceneId, parsed.data)
    if (!scene) return { message: 'Scene or location not found in this project.' }
    refresh(projectId, episodeId)
    redirect(detailPath(projectId, episodeId, 'scenes', `scene-${scene.sceneNumber}-saved`))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to update the scene.' }
  }
}

export async function assignCharacterAction(projectId: string, episodeId: string, sceneId: string, _state: EpisodeActionState, formData: FormData): Promise<EpisodeActionState> {
  const parsed = sceneCharacterInputSchema.safeParse(assignmentPayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const assignment = await assignCharacterToScene(projectId, episodeId, sceneId, parsed.data)
    if (!assignment) return { message: 'Assignment is invalid, duplicated, or crosses project boundaries.' }
    refresh(projectId, episodeId)
    redirect(detailPath(projectId, episodeId, 'scenes', 'character-assigned'))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to assign the character.' }
  }
}

export async function updateAssignmentAction(
  projectId: string,
  episodeId: string,
  sceneId: string,
  assignmentId: string,
  _state: EpisodeActionState,
  formData: FormData,
): Promise<EpisodeActionState> {
  const parsed = sceneCharacterInputSchema.safeParse(assignmentPayload(formData))
  if (!parsed.success) return validation(parsed.error)
  const assignment = await updateSceneCharacter(projectId, episodeId, sceneId, assignmentId, parsed.data)
  if (!assignment) return { message: 'Costume must belong to the assigned project character.' }
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', 'assignment-saved'))
}

export async function removeAssignmentAction(projectId: string, episodeId: string, sceneId: string, assignmentId: string) {
  await removeCharacterFromScene(projectId, episodeId, sceneId, assignmentId)
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', 'assignment-removed'))
}

export async function moveSceneAction(projectId: string, episodeId: string, sceneId: string, direction: 'up' | 'down') {
  const scenes = await listScenes(projectId, episodeId)
  const index = scenes.findIndex(scene => scene.id === sceneId)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index >= 0 && target >= 0 && target < scenes.length) {
    const ids = scenes.map(scene => scene.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await reorderScenes(projectId, episodeId, ids)
  }
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', `moved-${direction}`))
}

export async function setEpisodeStatusAction(projectId: string, episodeId: string, statusValue: string) {
  const status = z.enum(EPISODE_STATUSES).parse(statusValue)
  await setEpisodeStatuses(projectId, episodeId, { status })
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'overview', `status-${status}`))
}

export async function setSceneStatusAction(projectId: string, episodeId: string, sceneId: string, statusValue: string) {
  const status = z.enum(SCENE_STATUSES).parse(statusValue)
  await setSceneStatus(projectId, episodeId, sceneId, status)
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', `scene-status-${status}`))
}

export async function archiveEpisodeAction(projectId: string, episodeId: string) {
  await archiveEpisode(projectId, episodeId)
  refresh(projectId, episodeId)
  redirect(`/projects/${projectId}/episodes?notice=archived`)
}

export async function restoreEpisodeAction(projectId: string, episodeId: string) {
  await restoreEpisode(projectId, episodeId)
  refresh(projectId, episodeId)
  redirect(`/projects/${projectId}/episodes?archived=1&notice=restored`)
}

export async function deleteEpisodeAction(projectId: string, episodeId: string) {
  await deleteEpisode(projectId, episodeId)
  refresh(projectId)
  redirect(`/projects/${projectId}/episodes?notice=deleted`)
}

export async function archiveSceneAction(projectId: string, episodeId: string, sceneId: string) {
  await archiveScene(projectId, episodeId, sceneId)
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', 'scene-archived'))
}

export async function restoreSceneAction(projectId: string, episodeId: string, sceneId: string) {
  await restoreScene(projectId, episodeId, sceneId)
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', 'scene-restored'))
}

export async function deleteSceneAction(projectId: string, episodeId: string, sceneId: string) {
  await deleteScene(projectId, episodeId, sceneId)
  refresh(projectId, episodeId)
  redirect(detailPath(projectId, episodeId, 'scenes', 'scene-deleted'))
}

export async function sendToProductionAction(projectId: string, episodeId: string) {
  const [episode, scenes, assignments, issues] = await Promise.all([
    getEpisode(projectId, episodeId),
    listScenes(projectId, episodeId),
    listSceneCharacters(projectId, episodeId),
    checkEpisodeContinuity(projectId, episodeId),
  ])
  if (!episode) redirect(`/projects/${projectId}/episodes`)
  const readiness = calculateEpisodeReadiness(episode, scenes, assignments, issues)
  if (!readiness.readyForProduction) {
    redirect(detailPath(projectId, episodeId, 'overview', undefined, 'not-ready'))
  }
  await setEpisodeStatuses(projectId, episodeId, { productionStatus: 'Ready for Production' })
  await Promise.all(scenes.filter(scene => scene.status === 'Approved').map(scene =>
    setSceneStatus(projectId, episodeId, scene.id, 'Sent to Production')
  ))
  refresh(projectId, episodeId)
  redirect(`/projects/${projectId}/production?notice=episode-ready`)
}
