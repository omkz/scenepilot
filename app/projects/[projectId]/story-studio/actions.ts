'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  archiveCharacter,
  createCharacter,
  deleteCharacter,
  restoreCharacter,
  setCharacterStatus,
  updateCharacter,
} from '@/lib/db/queries/characters'
import {
  archiveCostume,
  createCostume,
  deleteCostume,
  restoreCostume,
  setCostumeStatus,
  updateCostume,
} from '@/lib/db/queries/costumes'
import {
  archiveLocation,
  createLocation,
  deleteLocation,
  restoreLocation,
  setLocationStatus,
  updateLocation,
} from '@/lib/db/queries/locations'
import {
  assetStatusSchema,
  characterInputSchema,
  costumeInputSchema,
  costumeUpdateInputSchema,
  locationInputSchema,
} from '@/lib/assets/validation'
import type { StoryStudioTab } from '@/lib/assets/types'
import type { AssetDeleteResult } from '@/lib/assets/types'

export interface AssetActionState {
  message?: string
  errors?: Record<string, string[]>
}

function text(formData: FormData, name: string) {
  return formData.get(name)
}

function characterPayload(formData: FormData) {
  return {
    name: text(formData, 'name'),
    narrativeRole: text(formData, 'narrativeRole'),
    age: text(formData, 'age'),
    genderPresentation: text(formData, 'genderPresentation'),
    personality: text(formData, 'personality'),
    motivation: text(formData, 'motivation'),
    visualDirection: text(formData, 'visualDirection'),
    appearance: text(formData, 'appearance'),
    distinguishingFeatures: text(formData, 'distinguishingFeatures'),
  }
}

function costumePayload(formData: FormData) {
  return {
    characterId: text(formData, 'characterId'),
    name: text(formData, 'name'),
    description: text(formData, 'description'),
    category: text(formData, 'category'),
    condition: text(formData, 'condition'),
    isDefault: text(formData, 'isDefault'),
  }
}

function costumeUpdatePayload(formData: FormData) {
  const { characterId: _characterId, ...payload } = costumePayload(formData)
  return payload
}

function locationPayload(formData: FormData) {
  return {
    name: text(formData, 'name'),
    description: text(formData, 'description'),
    locationType: text(formData, 'locationType'),
    architectureStyle: text(formData, 'architectureStyle'),
    defaultTimeOfDay: text(formData, 'defaultTimeOfDay'),
    defaultLighting: text(formData, 'defaultLighting'),
    visualIdentityNotes: text(formData, 'visualIdentityNotes'),
  }
}

function validationState(error: z.ZodError): AssetActionState {
  return {
    message: 'Please correct the highlighted fields.',
    errors: z.flattenError(error).fieldErrors,
  }
}

function studioPath(
  projectId: string,
  tab: StoryStudioTab,
  options?: { archived?: boolean; saved?: boolean; error?: string; notice?: string },
) {
  const params = new URLSearchParams({ tab })
  if (options?.archived) params.set('archived', '1')
  if (options?.saved) params.set('saved', '1')
  if (options?.error) params.set('error', options.error)
  if (options?.notice) params.set('notice', options.notice)
  return `/projects/${projectId}/story-studio?${params}`
}

function deletionError(type: 'character' | 'costume' | 'location', result: AssetDeleteResult) {
  if (result.deleted) return null
  if (result.reason === 'not-found') return 'asset-not-found'
  return [
    'asset-in-use',
    type,
    result.usage?.costumes || 0,
    result.usage?.scenes || 0,
    result.usage?.shots || 0,
  ].join(':')
}

function revalidateAssets(projectId: string) {
  revalidatePath(`/projects/${projectId}/story-studio`)
  revalidatePath(`/projects/${projectId}/overview`)
}

function tabForType(type: 'character' | 'costume' | 'location'): StoryStudioTab {
  if (type === 'character') return 'characters'
  if (type === 'costume') return 'costumes'
  return 'locations'
}

function throwRedirect(error: unknown) {
  if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
}

export async function createCharacterAction(
  projectId: string,
  _state: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = characterInputSchema.safeParse(characterPayload(formData))
  if (!result.success) return validationState(result.error)
  try {
    const character = await createCharacter(projectId, result.data)
    if (!character) return { message: 'Project not found.' }
    revalidateAssets(projectId)
    redirect(studioPath(projectId, 'characters', { saved: true, notice: character.assetCode }))
  } catch (error) {
    throwRedirect(error)
    return { message: 'Unable to create the character.' }
  }
}

export async function updateCharacterAction(
  projectId: string,
  characterId: string,
  _state: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = characterInputSchema.safeParse(characterPayload(formData))
  if (!result.success) return validationState(result.error)
  try {
    const character = await updateCharacter(projectId, characterId, result.data)
    if (!character) return { message: 'Character not found in this project.' }
    revalidateAssets(projectId)
    redirect(studioPath(projectId, 'characters', { saved: true, notice: character.assetCode }))
  } catch (error) {
    throwRedirect(error)
    return { message: 'Unable to update the character.' }
  }
}

export async function createCostumeAction(
  projectId: string,
  _state: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = costumeInputSchema.safeParse(costumePayload(formData))
  if (!result.success) return validationState(result.error)
  try {
    const created = await createCostume(projectId, result.data)
    if (!created.costume) {
      return { message: created.reason === 'invalid-character' ? 'Select a character from this project.' : 'Project not found.' }
    }
    revalidateAssets(projectId)
    redirect(studioPath(projectId, 'costumes', { saved: true, notice: created.costume.assetCode }))
  } catch (error) {
    throwRedirect(error)
    return { message: 'Unable to create the costume.' }
  }
}

export async function updateCostumeAction(
  projectId: string,
  costumeId: string,
  _state: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = costumeUpdateInputSchema.safeParse(costumeUpdatePayload(formData))
  if (!result.success) return validationState(result.error)
  try {
    const updated = await updateCostume(projectId, costumeId, result.data)
    if (!updated.costume) {
      return { message: 'Costume not found.' }
    }
    revalidateAssets(projectId)
    redirect(studioPath(projectId, 'costumes', { saved: true, notice: updated.costume.assetCode }))
  } catch (error) {
    throwRedirect(error)
    return { message: 'Unable to update the costume.' }
  }
}

export async function createLocationAction(
  projectId: string,
  _state: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = locationInputSchema.safeParse(locationPayload(formData))
  if (!result.success) return validationState(result.error)
  try {
    const location = await createLocation(projectId, result.data)
    if (!location) return { message: 'Project not found.' }
    revalidateAssets(projectId)
    redirect(studioPath(projectId, 'locations', { saved: true, notice: location.assetCode }))
  } catch (error) {
    throwRedirect(error)
    return { message: 'Unable to create the location.' }
  }
}

export async function updateLocationAction(
  projectId: string,
  locationId: string,
  _state: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = locationInputSchema.safeParse(locationPayload(formData))
  if (!result.success) return validationState(result.error)
  try {
    const location = await updateLocation(projectId, locationId, result.data)
    if (!location) return { message: 'Location not found in this project.' }
    revalidateAssets(projectId)
    redirect(studioPath(projectId, 'locations', { saved: true, notice: location.assetCode }))
  } catch (error) {
    throwRedirect(error)
    return { message: 'Unable to update the location.' }
  }
}

export async function setAssetStatusAction(
  projectId: string,
  type: 'character' | 'costume' | 'location',
  assetId: string,
  statusValue: string,
) {
  const status = assetStatusSchema.parse(statusValue)
  if (type === 'character') await setCharacterStatus(projectId, assetId, status)
  if (type === 'costume') await setCostumeStatus(projectId, assetId, status)
  if (type === 'location') await setLocationStatus(projectId, assetId, status)
  revalidateAssets(projectId)
  redirect(studioPath(projectId, tabForType(type), { notice: `status-${status.toLowerCase()}` }))
}

export async function archiveAssetAction(
  projectId: string,
  type: 'character' | 'costume' | 'location',
  assetId: string,
) {
  if (type === 'character') await archiveCharacter(projectId, assetId)
  if (type === 'costume') await archiveCostume(projectId, assetId)
  if (type === 'location') await archiveLocation(projectId, assetId)
  revalidateAssets(projectId)
  redirect(studioPath(projectId, tabForType(type), { notice: 'archived' }))
}

export async function restoreAssetAction(
  projectId: string,
  type: 'character' | 'costume' | 'location',
  assetId: string,
) {
  if (type === 'character') await restoreCharacter(projectId, assetId)
  if (type === 'costume') await restoreCostume(projectId, assetId)
  if (type === 'location') await restoreLocation(projectId, assetId)
  revalidateAssets(projectId)
  redirect(studioPath(projectId, tabForType(type), { notice: 'restored' }))
}

export async function deleteAssetAction(
  projectId: string,
  type: 'character' | 'costume' | 'location',
  assetId: string,
) {
  const validId = z.uuid().safeParse(assetId)
  if (!validId.success || !z.uuid().safeParse(projectId).success) {
    redirect(studioPath(projectId, tabForType(type), { error: 'asset-not-found' }))
  }
  const result = type === 'character'
    ? await deleteCharacter(projectId, assetId)
    : type === 'costume'
      ? await deleteCostume(projectId, assetId)
      : await deleteLocation(projectId, assetId)
  revalidateAssets(projectId)
  const error = deletionError(type, result)
  if (error) redirect(studioPath(projectId, tabForType(type), { error }))
  redirect(studioPath(projectId, tabForType(type), { notice: 'deleted' }))
}
