'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { LoaderCircle, Pencil, Plus, Save } from 'lucide-react'
import {
  createCharacterAction,
  createCostumeAction,
  createLocationAction,
  updateCharacterAction,
  updateCostumeAction,
  updateLocationAction,
  type AssetActionState,
} from '@/app/projects/[projectId]/story-studio/actions'
import {
  COSTUME_CATEGORIES,
  COSTUME_CONDITIONS,
  LOCATION_LIGHTING,
  LOCATION_TIMES,
  LOCATION_TYPES,
  NARRATIVE_ROLES,
  type CharacterDto,
  type CostumeDto,
  type LocationDto,
} from '@/lib/assets/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const selectClassName = 'h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus:border-ring'

function FieldError({ value }: { value?: string[] }) {
  return value?.[0] ? <p className="mt-1 text-[11px] text-red-400">{value[0]}</p> : null
}

function FormMessage({ state }: { state: AssetActionState }) {
  if (!state.message) return null
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
      {state.message}
    </div>
  )
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="bg-amber-500 text-black hover:bg-amber-400">
      {pending ? <LoaderCircle size={13} className="mr-1.5 animate-spin" /> : <Save size={13} className="mr-1.5" />}
      {pending ? 'Saving…' : editing ? 'Save Changes' : 'Create Asset'}
    </Button>
  )
}

function CheckField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="accent-amber-500" />
      {label}
    </label>
  )
}

interface CharacterFormSheetProps {
  projectId: string
  character?: CharacterDto
}

export function CharacterFormSheet({ projectId, character }: CharacterFormSheetProps) {
  const action = character
    ? updateCharacterAction.bind(null, projectId, character.id)
    : createCharacterAction.bind(null, projectId)
  const [state, formAction] = useActionState<AssetActionState, FormData>(action, {})
  const editing = Boolean(character)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="sm"
            variant={editing ? 'ghost' : 'default'}
            className={editing
              ? 'h-7 px-2 text-[11px]'
              : 'h-8 bg-amber-500 text-xs font-semibold text-black hover:bg-amber-400'
            }
          />
        }
      >
        {editing ? <Pencil size={11} className="mr-1" /> : <Plus size={12} className="mr-1.5" />}
        {editing ? 'Edit' : 'Add Character'}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? `Edit ${character?.name}` : 'Create Character'}</SheetTitle>
          <SheetDescription>Define a reusable cast reference and lock the traits that must remain consistent.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-5 px-4 pb-6">
          <FormMessage state={state} />
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className="text-xs font-medium">Name</span>
              <Input name="name" defaultValue={character?.name} maxLength={100} required className="mt-1.5" />
              <FieldError value={state.errors?.name} />
            </label>
            <label>
              <span className="text-xs font-medium">Narrative role</span>
              <select name="narrativeRole" defaultValue={character?.narrativeRole || 'Protagonist'} className={`${selectClassName} mt-1.5`}>
                {NARRATIVE_ROLES.map(value => <option key={value}>{value}</option>)}
              </select>
              <FieldError value={state.errors?.narrativeRole} />
            </label>
            <label>
              <span className="text-xs font-medium">Age</span>
              <Input name="age" type="number" min={0} max={200} defaultValue={character?.age ?? ''} className="mt-1.5" />
              <FieldError value={state.errors?.age} />
            </label>
            <label className="col-span-2">
              <span className="text-xs font-medium">Gender presentation</span>
              <Input name="genderPresentation" defaultValue={character?.genderPresentation || ''} maxLength={100} className="mt-1.5" />
              <FieldError value={state.errors?.genderPresentation} />
            </label>
            {[
              ['personality', 'Personality', 1000, character?.personality],
              ['motivation', 'Motivation', 1000, character?.motivation],
              ['appearance', 'Appearance', 2000, character?.appearance],
              ['distinguishingFeatures', 'Distinguishing features', 1000, character?.distinguishingFeatures],
            ].map(([name, label, maximum, value]) => (
              <label key={String(name)} className="col-span-2">
                <span className="text-xs font-medium">{label}</span>
                <Textarea name={String(name)} defaultValue={String(value || '')} maxLength={Number(maximum)} className="mt-1.5 min-h-20" />
                <FieldError value={state.errors?.[String(name)]} />
              </label>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Consistency locks</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CheckField name="facialIdentityLocked" label="Lock facial identity" defaultChecked={character?.facialIdentityLocked} />
              <CheckField name="skinToneLocked" label="Lock skin tone" defaultChecked={character?.skinToneLocked} />
              <CheckField name="eyeColorLocked" label="Lock eye color" defaultChecked={character?.eyeColorLocked} />
              <CheckField name="hairstyleLocked" label="Lock hairstyle" defaultChecked={character?.hairstyleLocked} />
              <CheckField name="bodyProportionsLocked" label="Lock body proportions" defaultChecked={character?.bodyProportionsLocked} />
              <CheckField name="distinguishingFeaturesLocked" label="Preserve distinguishing features" defaultChecked={character?.distinguishingFeaturesLocked} />
              <CheckField name="accessoriesLocked" label="Prevent accessory changes" defaultChecked={character?.accessoriesLocked} />
            </div>
          </div>
          <div className="flex justify-end"><SubmitButton editing={editing} /></div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

interface CostumeFormSheetProps {
  projectId: string
  characters: CharacterDto[]
  costume?: CostumeDto
}

export function CostumeFormSheet({ projectId, characters, costume }: CostumeFormSheetProps) {
  const action = costume
    ? updateCostumeAction.bind(null, projectId, costume.id)
    : createCostumeAction.bind(null, projectId)
  const [state, formAction] = useActionState<AssetActionState, FormData>(action, {})
  const editing = Boolean(costume)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="sm"
            variant={editing ? 'ghost' : 'default'}
            className={editing
              ? 'h-7 px-2 text-[11px]'
              : 'h-8 bg-amber-500 text-xs font-semibold text-black hover:bg-amber-400'
            }
          />
        }
      >
        {editing ? <Pencil size={11} className="mr-1" /> : <Plus size={12} className="mr-1.5" />}
        {editing ? 'Edit' : 'Add Costume'}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? `Edit ${costume?.name}` : 'Create Costume'}</SheetTitle>
          <SheetDescription>Attach a stable wardrobe reference to a character in this project.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-4 px-4 pb-6">
          <FormMessage state={state} />
          <label className="block">
            <span className="text-xs font-medium">Character</span>
            <select name="characterId" defaultValue={costume?.characterId || characters[0]?.id} className={`${selectClassName} mt-1.5`}>
              {characters.map(character => <option key={character.id} value={character.id}>{character.name} · {character.assetCode}</option>)}
            </select>
            <FieldError value={state.errors?.characterId} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Name</span>
            <Input name="name" defaultValue={costume?.name} maxLength={100} required className="mt-1.5" />
            <FieldError value={state.errors?.name} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Description</span>
            <Textarea name="description" defaultValue={costume?.description || ''} maxLength={2000} className="mt-1.5 min-h-24" />
            <FieldError value={state.errors?.description} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs font-medium">Category</span>
              <select name="category" defaultValue={costume?.category || 'Default'} className={`${selectClassName} mt-1.5`}>
                {COSTUME_CATEGORIES.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium">Condition</span>
              <select name="condition" defaultValue={costume?.condition || 'Clean'} className={`${selectClassName} mt-1.5`}>
                {COSTUME_CONDITIONS.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <CheckField name="isDefault" label="Default costume for this character" defaultChecked={costume?.isDefault} />
          <div className="flex justify-end"><SubmitButton editing={editing} /></div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

interface LocationFormSheetProps {
  projectId: string
  location?: LocationDto
}

export function LocationFormSheet({ projectId, location }: LocationFormSheetProps) {
  const action = location
    ? updateLocationAction.bind(null, projectId, location.id)
    : createLocationAction.bind(null, projectId)
  const [state, formAction] = useActionState<AssetActionState, FormData>(action, {})
  const editing = Boolean(location)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="sm"
            variant={editing ? 'ghost' : 'default'}
            className={editing
              ? 'h-7 px-2 text-[11px]'
              : 'h-8 bg-amber-500 text-xs font-semibold text-black hover:bg-amber-400'
            }
          />
        }
      >
        {editing ? <Pencil size={11} className="mr-1" /> : <Plus size={12} className="mr-1.5" />}
        {editing ? 'Edit' : 'Add Location'}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? `Edit ${location?.name}` : 'Create Location'}</SheetTitle>
          <SheetDescription>Define a reusable environment and lock its production identity.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-4 px-4 pb-6">
          <FormMessage state={state} />
          <label className="block">
            <span className="text-xs font-medium">Name</span>
            <Input name="name" defaultValue={location?.name} maxLength={120} required className="mt-1.5" />
            <FieldError value={state.errors?.name} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Description</span>
            <Textarea name="description" defaultValue={location?.description || ''} maxLength={2000} className="mt-1.5 min-h-20" />
            <FieldError value={state.errors?.description} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs font-medium">Location type</span>
              <select name="locationType" defaultValue={location?.locationType || 'Interior'} className={`${selectClassName} mt-1.5`}>
                {LOCATION_TYPES.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium">Architecture style</span>
              <Input name="architectureStyle" defaultValue={location?.architectureStyle || ''} maxLength={500} className="mt-1.5" />
              <FieldError value={state.errors?.architectureStyle} />
            </label>
            <label>
              <span className="text-xs font-medium">Default time</span>
              <select name="defaultTimeOfDay" defaultValue={location?.defaultTimeOfDay || 'Morning'} className={`${selectClassName} mt-1.5`}>
                {LOCATION_TIMES.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium">Default lighting</span>
              <select name="defaultLighting" defaultValue={location?.defaultLighting || 'Natural'} className={`${selectClassName} mt-1.5`}>
                {LOCATION_LIGHTING.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium">Visual identity notes</span>
            <Textarea name="visualIdentityNotes" defaultValue={location?.visualIdentityNotes || ''} maxLength={2000} className="mt-1.5 min-h-24" />
            <FieldError value={state.errors?.visualIdentityNotes} />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CheckField name="architectureLocked" label="Lock architecture" defaultChecked={location?.architectureLocked} />
            <CheckField name="layoutLocked" label="Lock layout" defaultChecked={location?.layoutLocked} />
            <CheckField name="lightingLocked" label="Lock lighting preset" defaultChecked={location?.lightingLocked} />
          </div>
          <div className="flex justify-end"><SubmitButton editing={editing} /></div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
