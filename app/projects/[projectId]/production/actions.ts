'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ScenePilotAIError } from '@/lib/ai/errors'
import { shotListSchema } from '@/lib/ai/schemas/shot-list'
import { generateSceneShotList } from '@/lib/ai/tasks/generate-shot-list'
import { getProjectById } from '@/lib/db/queries/projects'
import { listCharacters } from '@/lib/db/queries/characters'
import { getLocation } from '@/lib/db/queries/locations'
import { getEpisode, setStoryboardApproval } from '@/lib/db/queries/episodes'
import { getScene, listScenes } from '@/lib/db/queries/scenes'
import { listSceneCharacters } from '@/lib/db/queries/scene-characters'
import {
  archiveShot,
  createShot,
  deleteShot,
  duplicateShot,
  getShot,
  listShots,
  patchShot,
  reorderShots,
  restoreShot,
  setShotState,
  updateShot,
} from '@/lib/db/queries/shots'
import {
  addSceneCharactersToShot,
  assignCharacterToShot,
  removeCharacterFromShot,
  updateShotCharacter,
} from '@/lib/db/queries/shot-characters'
import { listShotCharacters } from '@/lib/db/queries/shot-characters'
import { createCompletedStoryboardJob } from '@/lib/db/queries/storyboard-jobs'
import {
  saveAndApplyShotListGeneration,
  updateShotListGenerationOutput,
  type ShotListApplyMode,
} from '@/lib/db/queries/shot-list-generations'
import { checkShot } from '@/lib/continuity/check-shot'
import { createBasicShotTemplates } from '@/lib/production/create-basic-shot-list'
import { buildShotPrompt } from '@/lib/production/build-shot-prompt'
import { getEpisodeStoryboardReadiness } from '@/lib/production/readiness'
import { SHOT_APPROVAL_STATUSES, SHOT_STATUSES } from '@/lib/production/types'
import { shotCharacterInputSchema, shotInputSchema } from '@/lib/production/validation'

export interface ProductionActionState {
  message?: string
  errors?: Record<string, string[]>
}

const value = (formData: FormData, name: string) => formData.get(name)
const shotPayload = (formData: FormData) => ({
  title: value(formData, 'title'),
  description: value(formData, 'description'),
  shotType: value(formData, 'shotType'),
  cameraAngle: value(formData, 'cameraAngle'),
  cameraMovement: value(formData, 'cameraMovement'),
  lens: value(formData, 'lens'),
  composition: value(formData, 'composition'),
  action: value(formData, 'action'),
  dialogueExcerpt: value(formData, 'dialogueExcerpt'),
  emotionalIntent: value(formData, 'emotionalIntent'),
  targetDurationSeconds: value(formData, 'targetDurationSeconds'),
  locationId: value(formData, 'locationId'),
  timeOfDay: value(formData, 'timeOfDay'),
  lightingNotes: value(formData, 'lightingNotes'),
  generationPrompt: value(formData, 'generationPrompt'),
  negativePrompt: value(formData, 'negativePrompt'),
  status: value(formData, 'status'),
  approvalStatus: value(formData, 'approvalStatus'),
  compositionLocked: value(formData, 'compositionLocked'),
})
const characterPayload = (formData: FormData) => ({
  characterId: value(formData, 'characterId'),
  costumeId: value(formData, 'costumeId'),
  screenPosition: value(formData, 'screenPosition'),
  pose: value(formData, 'pose'),
  expression: value(formData, 'expression'),
  action: value(formData, 'action'),
  gazeDirection: value(formData, 'gazeDirection'),
  physicalState: value(formData, 'physicalState'),
})
const workspace = (projectId: string, episodeId: string, sceneId?: string, notice?: string, error?: string) => {
  const query = new URLSearchParams()
  if (sceneId) query.set('scene', sceneId)
  if (notice) query.set('notice', notice)
  if (error) query.set('error', error)
  return `/projects/${projectId}/production/episodes/${episodeId}${query.size ? `?${query}` : ''}`
}
const shotListWorkspace = (
  projectId: string,
  episodeId: string,
  sceneId: string,
  values: {
    generationId?: string
    selectedShot?: string
    notice?: string
    error?: string
  } = {},
) => {
  const query = new URLSearchParams({ scene: sceneId })
  if (values.generationId) query.set('shotGeneration', values.generationId)
  if (values.selectedShot) query.set('selectedShot', values.selectedShot)
  if (values.notice) query.set('notice', values.notice)
  if (values.error) query.set('error', values.error)
  return `/projects/${projectId}/production/episodes/${episodeId}?${query}`
}
const refresh = (projectId: string, episodeId: string) => {
  revalidatePath(`/projects/${projectId}/production`)
  revalidatePath(`/projects/${projectId}/production/episodes/${episodeId}`)
  revalidatePath(`/projects/${projectId}/overview`)
}
const syncStoryboardStatus = async (projectId: string, episodeId: string) => {
  const readiness = await getEpisodeStoryboardReadiness(projectId, episodeId)
  await setStoryboardApproval(projectId, episodeId, readiness.readyForApproval ? 'Ready for Review' : readiness.totalShots > 0 ? 'In Progress' : 'Not Started')
}
const validation = (error: z.ZodError): ProductionActionState => ({
  message: 'Please correct the highlighted fields.',
  errors: z.flattenError(error).fieldErrors,
})
const rethrowRedirect = (error: unknown) => {
  if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
}

export async function createShotAction(projectId: string, episodeId: string, sceneId: string, _state: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  const parsed = shotInputSchema.safeParse(shotPayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const shot = await createShot(projectId, episodeId, sceneId, parsed.data)
    if (!shot) return { message: 'Shot assets must belong to this project and episode.' }
    await setStoryboardApproval(projectId, episodeId, 'In Progress')
    refresh(projectId, episodeId)
    redirect(workspace(projectId, episodeId, sceneId, 'shot-created'))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to create the shot.' }
  }
}

export async function updateShotAction(projectId: string, episodeId: string, shotId: string, _state: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  const parsed = shotInputSchema.safeParse(shotPayload(formData))
  if (!parsed.success) return validation(parsed.error)
  try {
    const shot = await updateShot(projectId, episodeId, shotId, parsed.data)
    if (!shot) return { message: 'Shot or referenced location is outside this project.' }
    await setStoryboardApproval(projectId, episodeId, 'In Progress')
    refresh(projectId, episodeId)
    redirect(workspace(projectId, episodeId, shot.sceneId, 'shot-saved'))
  } catch (error) {
    rethrowRedirect(error)
    return { message: 'Unable to update the shot.' }
  }
}

export async function moveShotAction(projectId: string, episodeId: string, sceneId: string, shotId: string, direction: 'up' | 'down') {
  const items = await listShots(projectId, episodeId, sceneId)
  const index = items.findIndex(item => item.id === shotId)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index >= 0 && target >= 0 && target < items.length) {
    const ids = items.map(item => item.id)
    const current = ids[index]
    ids[index] = ids[target]
    ids[target] = current
    await reorderShots(projectId, episodeId, sceneId, ids)
  }
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, sceneId, `moved-${direction}`))
}

export async function duplicateShotAction(projectId: string, episodeId: string, shotId: string) {
  const shot = await duplicateShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'shot-duplicated'))
}

export async function archiveShotAction(projectId: string, episodeId: string, shotId: string) {
  const shot = await archiveShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'shot-archived'))
}

export async function restoreShotAction(projectId: string, episodeId: string, shotId: string) {
  const shot = await restoreShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'shot-restored'))
}

export async function deleteShotAction(projectId: string, episodeId: string, shotId: string) {
  const shot = await getShot(projectId, episodeId, shotId, true)
  await deleteShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'shot-deleted'))
}

export async function assignShotCharacterAction(projectId: string, episodeId: string, shotId: string, _state: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  const parsed = shotCharacterInputSchema.safeParse(characterPayload(formData))
  if (!parsed.success) return validation(parsed.error)
  const assignment = await assignCharacterToShot(projectId, episodeId, shotId, parsed.data)
  if (!assignment) return { message: 'Character must belong to the parent scene, and costume must belong to that character.' }
  const shot = await getShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'character-added'))
}

export async function updateShotCharacterAction(projectId: string, episodeId: string, shotId: string, assignmentId: string, _state: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  const parsed = shotCharacterInputSchema.safeParse(characterPayload(formData))
  if (!parsed.success) return validation(parsed.error)
  const assignment = await updateShotCharacter(projectId, episodeId, shotId, assignmentId, parsed.data)
  if (!assignment) return { message: 'Invalid character or costume relationship.' }
  const shot = await getShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'character-saved'))
}

export async function removeShotCharacterAction(projectId: string, episodeId: string, shotId: string, assignmentId: string) {
  await removeCharacterFromShot(projectId, episodeId, shotId, assignmentId)
  const shot = await getShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'character-removed'))
}

export async function addSceneCharactersAction(projectId: string, episodeId: string, shotId: string, formData: FormData) {
  const characterIds = formData.getAll('characterIds').map(String)
  await addSceneCharactersToShot(projectId, episodeId, shotId, characterIds)
  const shot = await getShot(projectId, episodeId, shotId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'scene-characters-added'))
}

export async function setShotStatusAction(projectId: string, episodeId: string, shotId: string, statusValue: string) {
  const status = z.enum(SHOT_STATUSES).parse(statusValue)
  const shot = await setShotState(projectId, episodeId, shotId, { status })
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, `status-${status}`))
}

export async function setShotApprovalAction(projectId: string, episodeId: string, shotId: string, statusValue: string) {
  const approvalStatus = z.enum(SHOT_APPROVAL_STATUSES).parse(statusValue)
  if (approvalStatus === 'Approved') {
    const [current, assignments, issues] = await Promise.all([
      getShot(projectId, episodeId, shotId),
      listShotCharacters(projectId, episodeId, shotId),
      checkShot(projectId, episodeId, shotId),
    ])
    const complete = current && current.title.trim() && (current.description?.trim() || current.action?.trim()) &&
      current.shotType && current.cameraAngle && current.locationId && assignments.every(item => item.costumeId) &&
      !issues.some(item => item.severity === 'Error')
    if (!complete) redirect(workspace(projectId, episodeId, current?.sceneId, undefined, 'shot-not-ready'))
  }
  const shot = await setShotState(projectId, episodeId, shotId, { approvalStatus })
  await syncStoryboardStatus(projectId, episodeId)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, `approval-${approvalStatus}`))
}

export async function setCompositionLockAction(projectId: string, episodeId: string, shotId: string, locked: boolean) {
  const shot = await setShotState(projectId, episodeId, shotId, { compositionLocked: locked })
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, locked ? 'composition-locked' : 'composition-unlocked'))
}

export async function inheritSceneLocationAction(projectId: string, episodeId: string, shotId: string) {
  const shot = await getShot(projectId, episodeId, shotId)
  const scene = shot ? await getScene(projectId, episodeId, shot.sceneId) : null
  if (shot && scene) await patchShot(projectId, episodeId, shot.id, { locationId: scene.locationId, timeOfDay: scene.timeOfDay })
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot?.sceneId, 'location-inherited'))
}

export async function createBasicShotListAction(projectId: string, episodeId: string, sceneId: string) {
  const [scene, assignments, existingShots] = await Promise.all([
    getScene(projectId, episodeId, sceneId),
    listSceneCharacters(projectId, episodeId, sceneId),
    listShots(projectId, episodeId, sceneId),
  ])
  if (!scene) redirect(workspace(projectId, episodeId, undefined, undefined, 'scene-not-found'))
  if (existingShots.length > 0) redirect(workspace(projectId, episodeId, sceneId, undefined, 'shots-already-exist'))
  const templates = createBasicShotTemplates(scene, assignments.length)
  for (const template of templates) await createShot(projectId, episodeId, sceneId, template)
  await setStoryboardApproval(projectId, episodeId, 'In Progress')
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, sceneId, 'basic-shot-list-created'))
}

export async function buildShotPromptAction(projectId: string, episodeId: string, shotId: string) {
  const shot = await getShot(projectId, episodeId, shotId)
  const [project, episode, scene, assignments, characterAssets, location] = await Promise.all([
    getProjectById(projectId),
    getEpisode(projectId, episodeId),
    shot ? getScene(projectId, episodeId, shot.sceneId) : null,
    listShotCharacters(projectId, episodeId, shotId),
    listCharacters(projectId),
    shot?.locationId ? getLocation(projectId, shot.locationId) : null,
  ])
  if (!shot || !project || !episode || !scene) redirect(workspace(projectId, episodeId, undefined, undefined, 'shot-not-found'))
  const prompt = buildShotPrompt({ project, scene, shot, characters: assignments, characterAssets, location })
  await patchShot(projectId, episodeId, shotId, { generationPrompt: prompt })
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot.sceneId, 'prompt-built'))
}

export async function createStoryboardPlaceholderAction(projectId: string, episodeId: string, shotId: string) {
  const [shot, project] = await Promise.all([getShot(projectId, episodeId, shotId), getProjectById(projectId)])
  if (!shot || !project) redirect(workspace(projectId, episodeId, undefined, undefined, 'shot-not-found'))
  const assignments = await listShotCharacters(projectId, episodeId, shotId)
  await createCompletedStoryboardJob(projectId, episodeId, shot.sceneId, shot.id, {
    prompt: shot.generationPrompt,
    characterIds: assignments.map(item => item.characterId),
    costumeIds: assignments.map(item => item.costumeId).filter(Boolean),
    locationId: shot.locationId,
  }, {
    label: 'Storyboard Placeholder',
    disclaimer: 'Not AI-generated',
    shotId: shot.id,
    aspectRatio: project.orientation,
    characterCount: assignments.length,
    locationCode: shot.locationCode,
  })
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, shot.sceneId, 'placeholder-created'))
}

export async function approveStoryboardAction(projectId: string, episodeId: string) {
  const readiness = await getEpisodeStoryboardReadiness(projectId, episodeId)
  if (!readiness.readyForApproval) redirect(workspace(projectId, episodeId, undefined, undefined, 'storyboard-not-ready'))
  await setStoryboardApproval(projectId, episodeId, 'Approved', true)
  refresh(projectId, episodeId)
  redirect(workspace(projectId, episodeId, undefined, 'storyboard-approved'))
}

export async function generateShotListAction(
  projectId: string,
  episodeId: string,
  sceneId: string,
) {
  if (![projectId, episodeId, sceneId].every(id => z.uuid().safeParse(id).success)) {
    redirect(workspace(projectId, episodeId, undefined, undefined, 'invalid-shot-list-scope'))
  }
  try {
    const result = await generateSceneShotList({ projectId, episodeId, sceneId })
    refresh(projectId, episodeId)
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      generationId: result.generation.id,
      notice: 'shot-list-generated',
    }))
  } catch (error) {
    rethrowRedirect(error)
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      error: error instanceof ScenePilotAIError ? error.code : 'AI_UNKNOWN_ERROR',
    }))
  }
}

export async function updateShotListPreviewAction(
  projectId: string,
  episodeId: string,
  sceneId: string,
  generationId: string,
  formData: FormData,
) {
  if (![projectId, episodeId, sceneId, generationId].every(id => z.uuid().safeParse(id).success)) {
    redirect(shotListWorkspace(projectId, episodeId, sceneId, { error: 'invalid_output' }))
  }
  try {
    const parsedJson = JSON.parse(String(formData.get('shotList') || ''))
    const parsed = shotListSchema.safeParse(parsedJson)
    if (!parsed.success) {
      redirect(shotListWorkspace(projectId, episodeId, sceneId, {
        generationId,
        error: 'invalid_output',
      }))
    }
    const output = await updateShotListGenerationOutput({
      projectId,
      episodeId,
      sceneId,
      generationId,
      input: parsed.data,
    })
    if (!output) {
      redirect(shotListWorkspace(projectId, episodeId, sceneId, {
        generationId,
        error: 'not_found',
      }))
    }
    refresh(projectId, episodeId)
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      generationId,
      notice: 'shot-list-preview-saved',
    }))
  } catch (error) {
    rethrowRedirect(error)
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      generationId,
      error: 'invalid_output',
    }))
  }
}

export async function applyShotListAction(
  projectId: string,
  episodeId: string,
  sceneId: string,
  generationId: string,
  mode: ShotListApplyMode,
  formData: FormData,
) {
  if (
    (mode !== 'append' && mode !== 'replace')
    || ![projectId, episodeId, sceneId, generationId].every(id => z.uuid().safeParse(id).success)
  ) {
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      generationId,
      error: 'invalid_output',
    }))
  }
  try {
    const input = JSON.parse(String(formData.get('shotList') || ''))
    const result = await saveAndApplyShotListGeneration({
      projectId,
      episodeId,
      sceneId,
      generationId,
      mode,
      input,
    })
    if (!result.ok) {
      redirect(shotListWorkspace(projectId, episodeId, sceneId, {
        generationId,
        error: result.reason,
      }))
    }
    refresh(projectId, episodeId)
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      selectedShot: result.createdShotIds[0],
      notice: 'shot-list-applied',
    }))
  } catch (error) {
    rethrowRedirect(error)
    redirect(shotListWorkspace(projectId, episodeId, sceneId, {
      generationId,
      error: 'apply_failed',
    }))
  }
}
