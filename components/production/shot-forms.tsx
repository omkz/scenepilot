'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { LoaderCircle, Pencil, Plus, Users } from 'lucide-react'
import {
  addSceneCharactersAction,
  assignShotCharacterAction,
  createShotAction,
  updateShotAction,
  updateShotCharacterAction,
  type ProductionActionState,
} from '@/app/projects/[projectId]/production/actions'
import type { CostumeDto, LocationDto } from '@/lib/assets/types'
import type { SceneCharacterDto, SceneDto } from '@/lib/episodes/types'
import {
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  LENSES,
  SCREEN_POSITIONS,
  SHOT_APPROVAL_STATUSES,
  SHOT_STATUSES,
  SHOT_TIMES,
  SHOT_TYPES,
  type ShotCharacterDto,
  type ShotDto,
} from '@/lib/production/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const selectClass = 'mt-1.5 h-8 w-full rounded-lg border border-border bg-card px-2 text-sm'
const FieldError = ({ errors }: { errors?: string[] }) => errors?.[0] ? <div className="mt-1 text-[10px] text-red-400">{errors[0]}</div> : null
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={pending} className="bg-amber-500 text-black hover:bg-amber-400">{pending && <LoaderCircle size={12} className="animate-spin" />}{pending ? 'Saving…' : label}</Button>
}

export function ShotFormSheet({
  projectId,
  episodeId,
  scene,
  locations,
  shot,
}: {
  projectId: string
  episodeId: string
  scene: SceneDto
  locations: LocationDto[]
  shot?: ShotDto
}) {
  const [tab, setTab] = useState('overview')
  const action = shot ? updateShotAction.bind(null, projectId, episodeId, shot.id) : createShotAction.bind(null, projectId, episodeId, scene.id)
  const [state, formAction] = useActionState<ProductionActionState, FormData>(action, {})
  const show = (value: string) => tab === value ? 'space-y-4' : 'hidden'
  return <Sheet><SheetTrigger render={<Button size="sm" variant={shot ? 'ghost' : 'default'} className={shot ? '' : 'bg-amber-500 text-black hover:bg-amber-400'} />}>{shot ? <Pencil size={11} /> : <Plus size={11} />}{shot ? 'Edit' : 'Add Shot'}</SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>{shot ? `Edit ${shot.title}` : `Add shot to ${scene.title}`}</SheetTitle><SheetDescription>Compose the visual beat using persistent story asset references.</SheetDescription></SheetHeader>
    <div className="mx-4 mb-4 flex gap-1 rounded-lg bg-muted p-1">{['overview', 'camera', 'prompt'].map(value => <button type="button" key={value} onClick={() => setTab(value)} className={`rounded px-3 py-1 text-xs capitalize ${tab === value ? 'bg-card' : 'text-muted-foreground'}`}>{value}</button>)}</div>
    <form action={formAction} className="space-y-5 px-4 pb-6">
      {state.message && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{state.message}</div>}
      <section className={show('overview')}>
        <label className="block"><span className="text-xs">Title</span><Input name="title" defaultValue={shot?.title} required maxLength={150} className="mt-1.5" /><FieldError errors={state.errors?.title} /></label>
        <label className="block"><span className="text-xs">Description</span><Textarea name="description" defaultValue={shot?.description || ''} maxLength={3000} className="mt-1.5" /></label>
        <label className="block"><span className="text-xs">Action</span><Textarea name="action" defaultValue={shot?.action || ''} maxLength={3000} className="mt-1.5" /></label>
        <label className="block"><span className="text-xs">Dialogue excerpt</span><Textarea name="dialogueExcerpt" defaultValue={shot?.dialogueExcerpt || ''} maxLength={2000} className="mt-1.5" /></label>
        <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Emotional intent</span><Input name="emotionalIntent" defaultValue={shot?.emotionalIntent || ''} maxLength={500} className="mt-1.5" /></label><label><span className="text-xs">Duration</span><Input name="targetDurationSeconds" type="number" min={1} max={60} defaultValue={shot?.targetDurationSeconds || 5} className="mt-1.5" /></label></div>
        <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Location</span><select name="locationId" defaultValue={shot?.locationId || scene.locationId || ''} className={selectClass}><option value="">No location</option>{locations.map(item => <option key={item.id} value={item.id}>{item.assetCode} · {item.name} · {item.approvalStatus}</option>)}</select></label><label><span className="text-xs">Time of day</span><select name="timeOfDay" defaultValue={shot?.timeOfDay || scene.timeOfDay || 'Continuous'} className={selectClass}>{SHOT_TIMES.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <label className="block"><span className="text-xs">Lighting notes</span><Textarea name="lightingNotes" defaultValue={shot?.lightingNotes || ''} maxLength={1000} className="mt-1.5" /></label>
        <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Operational status</span><select name="status" defaultValue={shot?.status || 'Draft'} className={selectClass}>{SHOT_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label><label><span className="text-xs">Approval</span><select name="approvalStatus" defaultValue={shot?.approvalStatus || 'Draft'} className={selectClass}>{SHOT_APPROVAL_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label></div>
      </section>
      <section className={show('camera')}>
        <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Shot type</span><select name="shotType" defaultValue={shot?.shotType || 'Medium'} className={selectClass}>{SHOT_TYPES.map(item => <option key={item}>{item}</option>)}</select></label><label><span className="text-xs">Camera angle</span><select name="cameraAngle" defaultValue={shot?.cameraAngle || 'Eye Level'} className={selectClass}>{CAMERA_ANGLES.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <div className="grid grid-cols-2 gap-3"><label><span className="text-xs">Camera movement</span><select name="cameraMovement" defaultValue={shot?.cameraMovement || 'Static'} className={selectClass}>{CAMERA_MOVEMENTS.map(item => <option key={item}>{item}</option>)}</select></label><label><span className="text-xs">Lens</span><select name="lens" defaultValue={shot?.lens || '50mm'} className={selectClass}>{LENSES.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <label className="block"><span className="text-xs">Composition</span><Textarea name="composition" defaultValue={shot?.composition || ''} maxLength={2000} className="mt-1.5 min-h-32" /></label>
        <label className="flex items-center gap-2 text-xs"><input name="compositionLocked" type="checkbox" defaultChecked={shot?.compositionLocked} /> Lock composition</label>
      </section>
      <section className={show('prompt')}>
        <label className="block"><span className="text-xs">Generation prompt</span><Textarea name="generationPrompt" defaultValue={shot?.generationPrompt || ''} maxLength={10000} className="mt-1.5 min-h-64 font-mono text-xs" /></label>
        <label className="block"><span className="text-xs">Negative prompt</span><Textarea name="negativePrompt" defaultValue={shot?.negativePrompt || ''} maxLength={5000} className="mt-1.5 min-h-24 font-mono text-xs" /></label>
      </section>
      <div className="flex justify-end"><Submit label={shot ? 'Save Shot' : 'Create Shot'} /></div>
    </form>
  </SheetContent></Sheet>
}

export function ShotCharacterSheet({
  projectId,
  episodeId,
  shotId,
  sceneCharacters,
  costumes,
  assignment,
}: {
  projectId: string
  episodeId: string
  shotId: string
  sceneCharacters: SceneCharacterDto[]
  costumes: CostumeDto[]
  assignment?: ShotCharacterDto
}) {
  const [characterId, setCharacterId] = useState(assignment?.characterId || sceneCharacters[0]?.characterId || '')
  const action = assignment
    ? updateShotCharacterAction.bind(null, projectId, episodeId, shotId, assignment.id)
    : assignShotCharacterAction.bind(null, projectId, episodeId, shotId)
  const [state, formAction] = useActionState<ProductionActionState, FormData>(action, {})
  const availableCostumes = costumes.filter(item => item.characterId === characterId)
  return <Sheet><SheetTrigger render={<Button size="sm" variant="outline" />}>{assignment ? <Pencil size={11} /> : <Plus size={11} />}{assignment ? 'Edit Direction' : 'Add Character'}</SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-md"><SheetHeader><SheetTitle>{assignment ? `Direct ${assignment.characterName}` : 'Add Scene Character'}</SheetTitle><SheetDescription>Only characters from the parent scene can be assigned.</SheetDescription></SheetHeader><form action={formAction} className="space-y-4 px-4 pb-6">
    {state.message && <div className="text-xs text-red-400">{state.message}</div>}
    <label className="block"><span className="text-xs">Character</span><select name="characterId" value={characterId} onChange={event => setCharacterId(event.target.value)} className={selectClass}>{sceneCharacters.map(item => <option key={item.characterId} value={item.characterId}>{item.characterCode} · {item.characterName}</option>)}</select></label>
    <label className="block"><span className="text-xs">Costume</span><select key={characterId} name="costumeId" defaultValue={assignment?.characterId === characterId ? assignment.costumeId || '' : sceneCharacters.find(item => item.characterId === characterId)?.costumeId || ''} className={selectClass}><option value="">No costume</option>{availableCostumes.map(item => <option key={item.id} value={item.id}>{item.assetCode} · {item.name}</option>)}</select></label>
    <label className="block"><span className="text-xs">Screen position</span><select name="screenPosition" defaultValue={assignment?.screenPosition || ''} className={selectClass}><option value="">Unspecified</option>{SCREEN_POSITIONS.map(item => <option key={item}>{item}</option>)}</select></label>
    {['pose', 'expression', 'action', 'gazeDirection', 'physicalState'].map(name => <label key={name} className="block"><span className="text-xs capitalize">{name.replace(/([A-Z])/g, ' $1')}</span><Textarea name={name} defaultValue={assignment?.[name as keyof ShotCharacterDto] as string || ''} className="mt-1.5" /></label>)}
    <div className="flex justify-end"><Submit label={assignment ? 'Save Direction' : 'Add Character'} /></div>
  </form></SheetContent></Sheet>
}

export function AddSceneCharactersSheet({ projectId, episodeId, shotId, sceneCharacters }: { projectId: string; episodeId: string; shotId: string; sceneCharacters: SceneCharacterDto[] }) {
  return <Sheet><SheetTrigger render={<Button size="sm" variant="outline" />}><Users size={11} /> Add Scene Characters</SheetTrigger><SheetContent><SheetHeader><SheetTitle>Add Scene Characters</SheetTitle><SheetDescription>Selected characters inherit their scene costume and physical state.</SheetDescription></SheetHeader><form action={addSceneCharactersAction.bind(null, projectId, episodeId, shotId)} className="space-y-3 px-4"><div className="space-y-2">{sceneCharacters.map(item => <label key={item.id} className="flex items-center gap-3 rounded-lg border p-3 text-xs"><input type="checkbox" name="characterIds" value={item.characterId} /><span><strong>{item.characterCode} · {item.characterName}</strong><br /><span className="text-muted-foreground">{item.costumeName || 'No scene costume'}</span></span></label>)}</div><div className="flex justify-end"><Submit label="Add Selected" /></div></form></SheetContent></Sheet>
}
