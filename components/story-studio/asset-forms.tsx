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
  type AssetImageDto,
  type AssetStorageStatusDto,
  type CharacterDto,
  type CostumeDto,
  type ImageAIStatusDto,
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
import { AssetImageManager } from '@/components/story-studio/asset-image-manager'

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

function PendingVisualReferences() {
  return <section className="border-t px-4 pb-6 pt-5">
    <h3 className="text-sm font-semibold">Visual References</h3>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
      Create the asset first, then reopen it to upload inspiration images and select its Master Reference.
    </p>
  </section>
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
  images?: AssetImageDto[]
  storageStatus?: AssetStorageStatusDto
  imageAIStatus?: ImageAIStatusDto
}

export function CharacterFormSheet({ projectId, character, images = [], storageStatus, imageAIStatus }: CharacterFormSheetProps) {
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
      <SheetContent className="!w-full !max-w-none overflow-y-auto sm:!w-[94vw] sm:!max-w-[72rem]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? `Edit ${character?.name}` : 'Create Character'}</SheetTitle>
          <SheetDescription>Define the character&apos;s story role and foundational visual identity.</SheetDescription>
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
              <span className="text-xs font-medium">Age / Apparent age</span>
              <Input name="age" type="number" min={0} max={200} defaultValue={character?.age ?? ''} className="mt-1.5" />
              <FieldError value={state.errors?.age} />
            </label>
            <label className="col-span-2">
              <span className="text-xs font-medium">Character Description</span>
              <Textarea
                name="visualDirection"
                defaultValue={character?.visualDirection || ''}
                maxLength={2000}
                placeholder="A Javanese prince in his early thirties, lean build, shoulder-length black hair, calm authority, restrained royal headpiece, court clothing, and a visible keris hilt."
                className="mt-1.5 min-h-28"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Describe the character&apos;s appearance, presence, social identity, cultural details, and foundational clothing.
              </p>
              <FieldError value={state.errors?.visualDirection} />
            </label>
          </div>

          <details className="rounded-xl border bg-muted/10 p-3">
            <summary className="cursor-pointer text-xs font-semibold">More Character Details</summary>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Optional details for story planning and more precise visual consistency.
            </p>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-medium">Gender Presentation</span>
                <Input name="genderPresentation" defaultValue={character?.genderPresentation || ''} maxLength={100} className="mt-1.5" />
                <FieldError value={state.errors?.genderPresentation} />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Personality</span>
                <Textarea name="personality" defaultValue={character?.personality || ''} maxLength={1000} className="mt-1.5 min-h-20" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">How the character typically thinks, behaves, and reacts.</p>
                <FieldError value={state.errors?.personality} />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Motivation</span>
                <Textarea name="motivation" defaultValue={character?.motivation || ''} maxLength={1000} className="mt-1.5 min-h-20" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">What the character wants and what drives their decisions.</p>
                <FieldError value={state.errors?.motivation} />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Appearance Summary</span>
                <Textarea name="appearance" defaultValue={character?.appearance || ''} maxLength={2000} className="mt-1.5 min-h-20" />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Physical facts such as body type, face, hair, skin tone, age, and permanent physical traits.
                </p>
                <FieldError value={state.errors?.appearance} />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Distinguishing Features</span>
                <Textarea name="distinguishingFeatures" defaultValue={character?.distinguishingFeatures || ''} maxLength={1000} className="mt-1.5 min-h-20" />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Memorable identity markers such as scars, tattoos, jewelry, a headpiece, or a signature accessory.
                </p>
                <FieldError value={state.errors?.distinguishingFeatures} />
              </label>
            </div>
          </details>
          <div className="flex justify-end"><SubmitButton editing={editing} /></div>
        </form>
        {character
          ? <AssetImageManager projectId={projectId} assetType="character" assetId={character.id} images={images} storageStatus={storageStatus} imageAIStatus={imageAIStatus} />
          : <PendingVisualReferences />}
      </SheetContent>
    </Sheet>
  )
}

interface CostumeFormSheetProps {
  projectId: string
  characters: CharacterDto[]
  costume?: CostumeDto
  images?: AssetImageDto[]
  storageStatus?: AssetStorageStatusDto
  imageAIStatus?: ImageAIStatusDto
  linkedCharacterHasMaster?: boolean
}

export function CostumeFormSheet({ projectId, characters, costume, images = [], storageStatus, imageAIStatus, linkedCharacterHasMaster }: CostumeFormSheetProps) {
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
      <SheetContent className="!w-full !max-w-none overflow-y-auto sm:!w-[94vw] sm:!max-w-[72rem]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? `Edit ${costume?.name}` : 'Create Costume'}</SheetTitle>
          <SheetDescription>Attach a stable wardrobe reference to a character in this project.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-4 px-4 pb-6">
          <FormMessage state={state} />
          {costume ? <div className="rounded-lg border bg-muted/10 px-3 py-2.5">
            <div className="text-xs font-medium">Character</div>
            <div className="mt-1 text-xs text-muted-foreground">{costume.characterName}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Costume ownership cannot change because its Master Reference preserves this character&apos;s identity.
            </p>
          </div> : <label className="block">
            <span className="text-xs font-medium">Character</span>
            <select name="characterId" defaultValue={characters[0]?.id} className={`${selectClassName} mt-1.5`}>
              {characters.map(character => <option key={character.id} value={character.id}>{character.name} · {character.assetCode}</option>)}
            </select>
            <FieldError value={state.errors?.characterId} />
          </label>}
          <label className="block">
            <span className="text-xs font-medium">Name</span>
            <Input name="name" defaultValue={costume?.name} maxLength={100} required className="mt-1.5" />
            <FieldError value={state.errors?.name} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs font-medium">Category</span>
              <select name="category" defaultValue={costume?.category || 'Default'} className={`${selectClassName} mt-1.5`}>
                {COSTUME_CATEGORIES.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium">Default Condition</span>
              <select name="condition" defaultValue={costume?.condition || 'Clean'} className={`${selectClassName} mt-1.5`}>
                {COSTUME_CONDITIONS.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <CheckField name="isDefault" label="Default costume for this character" defaultChecked={costume?.isDefault} />
          <label className="block">
            <span className="text-xs font-medium">Visual Direction</span>
            <Textarea name="description" defaultValue={costume?.description || ''} maxLength={2000} className="mt-1.5 min-h-24" />
            <FieldError value={state.errors?.description} />
          </label>
          <div className="flex justify-end"><SubmitButton editing={editing} /></div>
        </form>
        {costume
          ? <AssetImageManager projectId={projectId} assetType="costume" assetId={costume.id} images={images} storageStatus={storageStatus} imageAIStatus={imageAIStatus} linkedCharacterHasMaster={linkedCharacterHasMaster} />
          : <PendingVisualReferences />}
      </SheetContent>
    </Sheet>
  )
}

interface LocationFormSheetProps {
  projectId: string
  location?: LocationDto
  images?: AssetImageDto[]
  storageStatus?: AssetStorageStatusDto
  imageAIStatus?: ImageAIStatusDto
}

export function LocationFormSheet({ projectId, location, images = [], storageStatus, imageAIStatus }: LocationFormSheetProps) {
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
      <SheetContent className="!w-full !max-w-none overflow-y-auto sm:!w-[94vw] sm:!max-w-[72rem]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? `Edit ${location?.name}` : 'Create Location'}</SheetTitle>
          <SheetDescription>Define what this recurring environment is and how it should look.</SheetDescription>
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
          <label className="block">
            <span className="text-xs font-medium">Location Type</span>
            <select name="locationType" defaultValue={location?.locationType || 'Interior'} className={`${selectClassName} mt-1.5`}>
              {LOCATION_TYPES.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium">Visual Direction</span>
            <Textarea name="visualIdentityNotes" defaultValue={location?.visualIdentityNotes || ''} maxLength={2000} className="mt-1.5 min-h-24" />
            <FieldError value={state.errors?.visualIdentityNotes} />
          </label>
          <details className="rounded-xl border bg-muted/10 p-3">
            <summary className="cursor-pointer text-xs font-semibold">Advanced Environment Details</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="col-span-2">
                <span className="text-xs font-medium">Architecture Style</span>
                <Input name="architectureStyle" defaultValue={location?.architectureStyle || ''} maxLength={500} className="mt-1.5" />
                <FieldError value={state.errors?.architectureStyle} />
              </label>
              <label>
                <span className="text-xs font-medium">Default Time of Day</span>
                <select name="defaultTimeOfDay" defaultValue={location?.defaultTimeOfDay || ''} className={`${selectClassName} mt-1.5`}>
                  <option value="">Use scene context</option>
                  {LOCATION_TIMES.map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span className="text-xs font-medium">Default Lighting</span>
                <select name="defaultLighting" defaultValue={location?.defaultLighting || ''} className={`${selectClassName} mt-1.5`}>
                  <option value="">Use safe default</option>
                  {LOCATION_LIGHTING.map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </details>
          <div className="flex justify-end"><SubmitButton editing={editing} /></div>
        </form>
        {location
          ? <AssetImageManager projectId={projectId} assetType="location" assetId={location.id} images={images} storageStatus={storageStatus} imageAIStatus={imageAIStatus} />
          : <PendingVisualReferences />}
      </SheetContent>
    </Sheet>
  )
}
