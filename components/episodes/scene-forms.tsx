'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { LoaderCircle, Pencil, Plus } from 'lucide-react'
import {
  assignCharacterAction,
  createSceneAction,
  updateAssignmentAction,
  updateSceneAction,
  type EpisodeActionState,
} from '@/app/projects/[projectId]/episodes/actions'
import { SCENE_STATUSES, SCENE_TIMES, type SceneCharacterDto, type SceneDto } from '@/lib/episodes/types'
import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const selectClass = 'mt-1.5 h-8 w-full rounded-lg border border-border bg-card px-2 text-sm'
const ErrorText = ({ errors }: { errors?: string[] }) => errors?.[0] ? <p className="mt-1 text-[11px] text-red-400">{errors[0]}</p> : null
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending} className="bg-amber-500 text-black hover:bg-amber-400">{pending ? <LoaderCircle size={12} className="animate-spin" /> : null}{pending ? 'Saving…' : label}</Button> }

export function SceneFormSheet({ projectId, episodeId, locations, scene }: { projectId: string; episodeId: string; locations: LocationDto[]; scene?: SceneDto }) {
  const action = scene ? updateSceneAction.bind(null, projectId, episodeId, scene.id) : createSceneAction.bind(null, projectId, episodeId)
  const [state, formAction] = useActionState<EpisodeActionState, FormData>(action, {})
  return <Sheet><SheetTrigger render={<Button size="sm" variant={scene ? 'ghost' : 'default'} className={scene ? '' : 'bg-amber-500 text-black hover:bg-amber-400'} />}>{scene ? <Pencil size={11} /> : <Plus size={11} />}{scene ? 'Edit' : 'Add Scene'}</SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{scene ? `Edit ${scene.title}` : 'Add Scene'}</SheetTitle><SheetDescription>Compose the scene and attach its primary project location.</SheetDescription></SheetHeader><form action={formAction} className="space-y-4 px-4 pb-6">
    {state.message && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{state.message}</div>}
    <label className="block"><span className="text-xs">Title</span><Input name="title" defaultValue={scene?.title} maxLength={150} required className="mt-1.5" /><ErrorText errors={state.errors?.title} /></label>
    <label className="block"><span className="text-xs">Purpose</span><Textarea name="purpose" defaultValue={scene?.purpose || ''} maxLength={1000} className="mt-1.5" /></label>
    <label className="block"><span className="text-xs">Summary</span><Textarea name="summary" defaultValue={scene?.summary || ''} maxLength={2000} className="mt-1.5" /></label>
    <label className="block"><span className="text-xs">Script</span><Textarea name="script" defaultValue={scene?.script || ''} maxLength={20000} className="mt-1.5 min-h-36" /></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Emotional tone</span><Input name="emotionalTone" defaultValue={scene?.emotionalTone || ''} maxLength={200} className="mt-1.5" /></label><label><span className="text-xs">Duration (seconds)</span><Input name="targetDurationSeconds" type="number" min={1} max={300} defaultValue={scene?.targetDurationSeconds || 30} className="mt-1.5" /></label></div>
    <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Time of day</span><select name="timeOfDay" defaultValue={scene?.timeOfDay || 'Unspecified'} className={selectClass}>{SCENE_TIMES.map(value => <option key={value}>{value}</option>)}</select></label><label><span className="text-xs">Status</span><select name="status" defaultValue={scene?.status || 'Draft'} className={selectClass}>{SCENE_STATUSES.filter(value => value !== 'Archived').map(value => <option key={value}>{value}</option>)}</select></label></div>
    <label className="block"><span className="text-xs">Location</span><select name="locationId" defaultValue={scene?.locationId || ''} className={selectClass}><option value="">No location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name} · {location.assetCode} · {location.approvalStatus}</option>)}</select></label>
    <div className="flex justify-end"><Submit label={scene ? 'Save Scene' : 'Create Scene'} /></div>
  </form></SheetContent></Sheet>
}

export function AssignmentFormSheet({ projectId, episodeId, sceneId, characters, costumes, assignment }: { projectId: string; episodeId: string; sceneId: string; characters: CharacterDto[]; costumes: CostumeDto[]; assignment?: SceneCharacterDto }) {
  const [characterId, setCharacterId] = useState(assignment?.characterId || characters[0]?.id || '')
  const action = assignment ? updateAssignmentAction.bind(null, projectId, episodeId, sceneId, assignment.id) : assignCharacterAction.bind(null, projectId, episodeId, sceneId)
  const [state, formAction] = useActionState<EpisodeActionState, FormData>(action, {})
  const characterCostumes = costumes.filter(costume => costume.characterId === characterId)
  return <Sheet><SheetTrigger render={<Button size="sm" variant={assignment ? 'ghost' : 'outline'} />}>{assignment ? <Pencil size={11} /> : <Plus size={11} />}{assignment ? 'Edit State' : 'Add Character'}</SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-md"><SheetHeader><SheetTitle>{assignment ? `Edit ${assignment.characterName}` : 'Assign Character'}</SheetTitle><SheetDescription>Only costumes owned by the selected character are available.</SheetDescription></SheetHeader><form action={formAction} className="space-y-4 px-4 pb-6">
    {state.message && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{state.message}</div>}
    <label className="block"><span className="text-xs">Character</span><select name="characterId" value={characterId} onChange={event => setCharacterId(event.target.value)} className={selectClass}>{characters.map(character => <option key={character.id} value={character.id}>{character.name} · {character.assetCode} · {character.approvalStatus}</option>)}</select></label>
    <label className="block"><span className="text-xs">Costume</span><select name="costumeId" defaultValue={assignment?.costumeId || ''} className={selectClass}><option value="">No costume</option>{characterCostumes.map(costume => <option key={costume.id} value={costume.id}>{costume.name} · {costume.assetCode} · {costume.condition}</option>)}</select></label>
    <label className="block"><span className="text-xs">Role in scene</span><Input name="roleInScene" defaultValue={assignment?.roleInScene || ''} maxLength={100} className="mt-1.5" /></label>
    <label className="block"><span className="text-xs">Emotional state</span><Textarea name="emotionalState" defaultValue={assignment?.emotionalState || ''} maxLength={500} className="mt-1.5" /></label>
    <label className="block"><span className="text-xs">Physical state</span><Textarea name="physicalState" defaultValue={assignment?.physicalState || ''} maxLength={500} className="mt-1.5" /></label>
    <div className="flex justify-end"><Submit label={assignment ? 'Save Assignment' : 'Assign Character'} /></div>
  </form></SheetContent></Sheet>
}
