'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  AlertTriangle,
  CheckCircle2,
  History,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  applyScenePlanAction,
  generateScenePlanAction,
  updateScenePlanPreviewAction,
} from '@/app/projects/[projectId]/episodes/ai-actions'
import type { AIGenerationDto } from '@/lib/ai/types'
import type {
  PersistedScenePlan,
  ScenePlan,
  ScenePlanScene,
} from '@/lib/ai/schemas/scene-plan'
import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'
import { SCENE_TIMES } from '@/lib/episodes/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const selectClass = 'h-8 w-full rounded-md border bg-background px-2 text-xs'

const aiErrors: Record<string, string> = {
  AI_CONFIGURATION_ERROR: 'AI provider configuration is incomplete.',
  AI_PROVIDER_ERROR: 'The provider temporarily rejected the request.',
  AI_RATE_LIMIT: 'The AI provider rate limit was reached. Try again later.',
  AI_TIMEOUT: 'The AI provider request timed out.',
  AI_INVALID_OUTPUT: 'The generated scene plan did not match the required structure.',
  AI_CONTEXT_ERROR: 'A usable outline, approved characters, and approved locations are required.',
  AI_UNKNOWN_ERROR: 'The scene plan could not be generated.',
}

const applyErrors: Record<string, string> = {
  already_applied: 'This scene plan has already been applied.',
  assets_changed: 'The generated scene plan is no longer valid because project assets changed. Save the preview again or generate a new plan.',
  invalid_output: 'The saved scene plan is no longer valid.',
  not_found: 'The scene plan could not be found for this project and episode.',
  apply_failed: 'The scene plan could not be applied. No partial scenes were created.',
  invalid: 'Choose a valid scene-plan apply mode.',
}

function PendingButton({
  disabled = false,
  label,
  pendingLabel,
  icon = 'sparkles',
  variant,
}: {
  disabled?: boolean
  label: string
  pendingLabel: string
  icon?: 'sparkles' | 'save'
  variant?: 'outline'
}) {
  const { pending } = useFormStatus()
  const Icon = pending ? LoaderCircle : icon === 'save' ? Save : Sparkles
  return <Button
    type="submit"
    variant={variant}
    disabled={disabled || pending}
    className={variant ? undefined : 'bg-amber-500 text-black hover:bg-amber-400'}
  >
    <Icon size={12} className={pending ? 'animate-spin' : undefined} />
    {pending ? pendingLabel : label}
  </Button>
}

export interface AIScenePlanContext {
  configured: boolean
  hasOutline: boolean
  approvedCharacters: number
  approvedCostumes: number
  approvedLocations: number
  existingScenes: number
  targetDurationSeconds: number
  hasPreviousEpisode: boolean
  characters: CharacterDto[]
  costumes: CostumeDto[]
  locations: LocationDto[]
}

function editablePlan(plan: PersistedScenePlan): ScenePlan {
  const { warnings: _warnings, ...editable } = plan
  return editable
}

function generationSummary(generation: AIGenerationDto) {
  const output = generation.output as {
    scenes?: unknown[]
    totalEstimatedDurationSeconds?: number
  } | null
  return {
    sceneCount: Array.isArray(output?.scenes) ? output.scenes.length : null,
    duration: typeof output?.totalEstimatedDurationSeconds === 'number'
      ? output.totalEstimatedDurationSeconds
      : null,
  }
}

function ApplyConfirmation({
  projectId,
  episodeId,
  generationId,
  mode,
  scenePlan,
  children,
}: {
  projectId: string
  episodeId: string
  generationId: string
  mode: 'append' | 'replace'
  scenePlan: string
  children: React.ReactNode
}) {
  const replacing = mode === 'replace'
  return <Dialog>
    <DialogTrigger render={<Button variant={replacing ? 'outline' : undefined} className={replacing ? 'text-red-400' : 'bg-amber-500 text-black hover:bg-amber-400'} />}>{children}</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{replacing ? 'Replace existing scenes?' : 'Append this scene plan?'}</DialogTitle>
        <DialogDescription>
          {replacing
            ? 'All current active scenes will be soft-archived. Their stable scene numbers remain reserved, and the generated plan will create new Draft scenes. This action does not permanently delete scenes.'
            : 'The generated Draft scenes will be added after the current active scenes. Existing scenes will remain unchanged.'}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <form action={applyScenePlanAction.bind(null, projectId, episodeId, generationId, mode)}>
          <input type="hidden" name="scenePlan" value={scenePlan} />
          <ApplyPendingButton mode={mode} />
        </form>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

function ApplyPendingButton({ mode, creating = false }: {
  mode: 'append' | 'replace'
  creating?: boolean
}) {
  const { pending } = useFormStatus()
  const label = creating
    ? 'Create Scenes'
    : mode === 'replace'
      ? 'Archive and Replace'
      : 'Append Scenes'
  const pendingLabel = creating
    ? 'Saving and creating…'
    : mode === 'replace'
      ? 'Saving and replacing…'
      : 'Saving and appending…'
  return <Button
    type="submit"
    variant={mode === 'replace' ? 'destructive' : 'default'}
    disabled={pending}
  >
    {pending && <LoaderCircle size={12} className="animate-spin" />}
    {pending ? pendingLabel : label}
  </Button>
}

export function AIScenePlanPanel({
  projectId,
  episodeId,
  context,
  generations,
  selectedGeneration,
  selectedScenePlan,
  aiError,
  scenePlanError,
  notice,
}: {
  projectId: string
  episodeId: string
  context: AIScenePlanContext
  generations: AIGenerationDto[]
  selectedGeneration: AIGenerationDto | null
  selectedScenePlan: PersistedScenePlan | null
  aiError?: string
  scenePlanError?: string
  notice?: string
}) {
  const [draft, setDraft] = useState<ScenePlan | null>(
    selectedScenePlan ? editablePlan(selectedScenePlan) : null,
  )
  const canGenerate = context.configured
    && context.hasOutline
    && context.approvedCharacters > 0
    && context.approvedLocations > 0
  const basePath = `/projects/${projectId}/episodes/${episodeId}?tab=scenes`
  const characterCodes = new Map(context.characters.map(item => [item.id, item.assetCode]))
  const costumeCodes = new Map(context.costumes.map(item => [item.id, item.assetCode]))
  const locationCodes = new Map(context.locations.map(item => [item.id, item.assetCode]))

  function updateScene(index: number, update: Partial<ScenePlanScene>) {
    setDraft(current => current ? {
      ...current,
      scenes: current.scenes.map((scene, sceneIndex) => (
        sceneIndex === index ? { ...scene, ...update } : scene
      )),
    } : current)
  }

  function updateAssignment(
    sceneIndex: number,
    assignmentIndex: number,
    update: Partial<ScenePlanScene['characterAssignments'][number]>,
  ) {
    if (!draft) return
    const scene = draft.scenes[sceneIndex]
    const characterAssignments = scene.characterAssignments.map((assignment, index) => (
      index === assignmentIndex ? { ...assignment, ...update } : assignment
    ))
    updateScene(sceneIndex, { characterAssignments })
  }

  function addCharacter(sceneIndex: number) {
    if (!draft) return
    const scene = draft.scenes[sceneIndex]
    const used = new Set(scene.characterAssignments.map(item => item.characterId))
    const character = context.characters.find(item => !used.has(item.id))
    if (!character) return
    const defaultCostume = context.costumes.find(item => (
      item.characterId === character.id && item.isDefault
    ))
    updateScene(sceneIndex, {
      characterAssignments: [...scene.characterAssignments, {
        characterId: character.id,
        costumeId: defaultCostume?.id || null,
        roleInScene: null,
        emotionalState: null,
        physicalState: null,
      }],
    })
  }

  return <div className="space-y-5 lg:col-span-2">
    <section className="rounded-xl border border-amber-500/20 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={14} className="text-amber-400" />
            AI Scene Plan
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Turn the approved episode outline into production-aware scenes using approved characters, costumes, and locations. Nothing is created automatically.
          </p>
        </div>
        <form action={generateScenePlanAction.bind(null, projectId, episodeId)}>
          <PendingButton disabled={!canGenerate} label="Generate Scene Plan" pendingLabel="Generating…" />
        </form>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] md:grid-cols-6">
        {[
          ['Outline', context.hasOutline ? 'Available' : 'Missing'],
          ['Characters', context.approvedCharacters],
          ['Costumes', context.approvedCostumes],
          ['Locations', context.approvedLocations],
          ['Existing scenes', context.existingScenes],
          ['Target', `${context.targetDurationSeconds}s`],
        ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-muted/20 p-2"><div className="text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div>)}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Previous episode context: {context.hasPreviousEpisode ? 'available' : 'none'}
      </div>
      {!context.configured && <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400"><AlertTriangle size={13} className="mt-0.5 shrink-0" />AI provider configuration is incomplete. Add the server-side provider variables to enable generation.</div>}
      {!context.hasOutline && <div className="mt-2 text-xs text-amber-400">Apply or write an episode outline before generating scenes.</div>}
      {context.approvedCharacters === 0 && <div className="mt-2 text-xs text-amber-400">Approve at least one character before generating scenes.</div>}
      {context.approvedLocations === 0 && <div className="mt-2 text-xs text-amber-400">Approve at least one location before generating scenes.</div>}
      {context.existingScenes > 0 && <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300"><strong>This episode already has scenes.</strong><br />Generating a new scene plan creates a separate preview. Existing scenes will not be changed until you explicitly apply the new plan.</div>}
      {aiError && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{aiErrors[aiError] || aiErrors.AI_UNKNOWN_ERROR}</div>}
      {scenePlanError && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{applyErrors[scenePlanError] || applyErrors.apply_failed}</div>}
      {notice === 'scene-plan-saved' && <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400"><CheckCircle2 size={12} />Scene-plan edits saved and revalidated.</div>}
      {notice === 'scene-plan-saved-applied' && <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400"><CheckCircle2 size={12} />Scene plan saved and applied successfully. Continuity results have been refreshed.</div>}
    </section>

    {selectedGeneration && selectedScenePlan && draft && <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400">Editable generation preview</div>
          <h2 className="mt-1 text-lg font-semibold">{selectedScenePlan.episodeTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{selectedScenePlan.planningSummary}</p>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          {selectedGeneration.provider} · {selectedGeneration.model}<br />
          {selectedGeneration.promptVersion} · {selectedGeneration.durationMs ?? '—'}ms<br />
          {selectedGeneration.totalTokens ? `${selectedGeneration.totalTokens} tokens` : 'Usage unavailable'}<br />
          {selectedGeneration.status}
        </div>
      </div>

      <form action={updateScenePlanPreviewAction.bind(null, projectId, episodeId, selectedGeneration.id)} className="mt-5 space-y-4">
        <input type="hidden" name="scenePlan" value={JSON.stringify(draft)} />
        {draft.scenes.map((scene, sceneIndex) => {
          const sceneWarnings = selectedScenePlan.warnings.filter(
            item => item.sceneTemporaryId === scene.temporaryId,
          )
          return <article key={`${scene.temporaryId}-${sceneIndex}`} className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold">Suggested Scene {sceneIndex + 1}</div>
              <div className="font-mono text-[9px] text-muted-foreground">{scene.temporaryId}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block"><span className="text-[10px] text-muted-foreground">Title</span><Input value={scene.title} maxLength={150} onChange={event => updateScene(sceneIndex, { title: event.target.value })} /></label>
              <label className="block"><span className="text-[10px] text-muted-foreground">Emotional tone</span><Input value={scene.emotionalTone} maxLength={200} onChange={event => updateScene(sceneIndex, { emotionalTone: event.target.value })} /></label>
              <label className="block md:col-span-2"><span className="text-[10px] text-muted-foreground">Purpose</span><Textarea value={scene.purpose} maxLength={1000} onChange={event => updateScene(sceneIndex, { purpose: event.target.value })} /></label>
              <label className="block md:col-span-2"><span className="text-[10px] text-muted-foreground">Summary</span><Textarea value={scene.summary} maxLength={2000} onChange={event => updateScene(sceneIndex, { summary: event.target.value })} /></label>
              <label className="block"><span className="text-[10px] text-muted-foreground">Time of day</span><select className={selectClass} value={scene.timeOfDay} onChange={event => updateScene(sceneIndex, { timeOfDay: event.target.value as ScenePlanScene['timeOfDay'] })}>{SCENE_TIMES.map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="block"><span className="text-[10px] text-muted-foreground">Duration (seconds)</span><Input type="number" min={1} max={300} value={scene.estimatedDurationSeconds} onChange={event => updateScene(sceneIndex, { estimatedDurationSeconds: Number(event.target.value) })} /></label>
              <label className="block md:col-span-2"><span className="text-[10px] text-muted-foreground">Location</span><select className={selectClass} value={scene.suggestedLocationId || ''} onChange={event => updateScene(sceneIndex, { suggestedLocationId: event.target.value || null })}><option value="">No location</option>{context.locations.map(location => <option key={location.id} value={location.id}>{location.assetCode} · {location.name}</option>)}</select></label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold">Character assignments</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => addCharacter(sceneIndex)} disabled={scene.characterAssignments.length >= context.characters.length}><Plus size={10} /> Add Character</Button>
            </div>
            <div className="mt-2 space-y-3">
              {scene.characterAssignments.map((assignment, assignmentIndex) => {
                const availableCostumes = context.costumes.filter(
                  item => item.characterId === assignment.characterId,
                )
                return <div key={`${assignment.characterId}-${assignmentIndex}`} className="rounded-lg bg-muted/30 p-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="block"><span className="text-[10px] text-muted-foreground">Character</span><select className={selectClass} value={assignment.characterId} onChange={event => {
                      const characterId = event.target.value
                      const defaultCostume = context.costumes.find(item => item.characterId === characterId && item.isDefault)
                      updateAssignment(sceneIndex, assignmentIndex, { characterId, costumeId: defaultCostume?.id || null })
                    }}>{context.characters.map(character => <option key={character.id} value={character.id}>{character.assetCode} · {character.name}</option>)}</select></label>
                    <label className="block"><span className="text-[10px] text-muted-foreground">Costume</span><select className={selectClass} value={assignment.costumeId || ''} onChange={event => updateAssignment(sceneIndex, assignmentIndex, { costumeId: event.target.value || null })}><option value="">No costume</option>{availableCostumes.map(costume => <option key={costume.id} value={costume.id}>{costume.assetCode} · {costume.name}</option>)}</select></label>
                    <label className="block"><span className="text-[10px] text-muted-foreground">Role</span><Input value={assignment.roleInScene || ''} maxLength={100} onChange={event => updateAssignment(sceneIndex, assignmentIndex, { roleInScene: event.target.value || null })} /></label>
                    <label className="block"><span className="text-[10px] text-muted-foreground">Emotional state</span><Input value={assignment.emotionalState || ''} maxLength={500} onChange={event => updateAssignment(sceneIndex, assignmentIndex, { emotionalState: event.target.value || null })} /></label>
                    <label className="block md:col-span-2"><span className="text-[10px] text-muted-foreground">Physical state</span><Input value={assignment.physicalState || ''} maxLength={500} onChange={event => updateAssignment(sceneIndex, assignmentIndex, { physicalState: event.target.value || null })} /></label>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>{characterCodes.get(assignment.characterId)} · {assignment.costumeId ? costumeCodes.get(assignment.costumeId) : 'No costume'}</span>
                    <Button type="button" size="sm" variant="ghost" className="text-red-400" onClick={() => updateScene(sceneIndex, { characterAssignments: scene.characterAssignments.filter((_, index) => index !== assignmentIndex) })}><Trash2 size={10} /> Remove</Button>
                  </div>
                </div>
              })}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border p-3"><div className="text-[10px] font-semibold">Continuity notes</div>{scene.continuityNotes.length ? scene.continuityNotes.map((note, index) => <div key={index} className="mt-1 text-[10px] text-muted-foreground">{note}</div>) : <div className="mt-1 text-[10px] text-muted-foreground">None</div>}</div>
              <div className="rounded-lg border p-3"><div className="text-[10px] font-semibold">Production notes</div>{scene.productionNotes.length ? scene.productionNotes.map((note, index) => <div key={index} className="mt-1 text-[10px] text-muted-foreground">{note}</div>) : <div className="mt-1 text-[10px] text-muted-foreground">None</div>}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {scene.suggestedLocationId && <span className="rounded bg-muted px-2 py-1 font-mono text-[9px]">{locationCodes.get(scene.suggestedLocationId)}</span>}
              {sceneWarnings.map((item, index) => <span key={`${item.code}-${index}`} className="rounded bg-amber-500/10 px-2 py-1 text-[9px] text-amber-400">{item.code}: {item.message}</span>)}
            </div>
          </article>
        })}
        {selectedScenePlan.warnings.some(item => item.sceneTemporaryId === null) && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">{selectedScenePlan.warnings.filter(item => item.sceneTemporaryId === null).map((item, index) => <div key={`${item.code}-${index}`} className="text-[10px] text-amber-400">{item.code}: {item.message}</div>)}</div>}
        {selectedGeneration.status === 'Completed' && <div className="flex justify-end"><PendingButton label="Save Preview Edits" pendingLabel="Saving…" icon="save" variant="outline" /></div>}
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        {selectedGeneration.status === 'Completed' && context.existingScenes === 0 && <form action={applyScenePlanAction.bind(null, projectId, episodeId, selectedGeneration.id, 'append')}><input type="hidden" name="scenePlan" value={JSON.stringify(draft)} /><ApplyPendingButton mode="append" creating /></form>}
        {selectedGeneration.status === 'Completed' && context.existingScenes > 0 && <>
          <ApplyConfirmation projectId={projectId} episodeId={episodeId} generationId={selectedGeneration.id} mode="append" scenePlan={JSON.stringify(draft)}>Apply as New Scenes</ApplyConfirmation>
          <ApplyConfirmation projectId={projectId} episodeId={episodeId} generationId={selectedGeneration.id} mode="replace" scenePlan={JSON.stringify(draft)}>Replace Existing Scenes</ApplyConfirmation>
        </>}
        {selectedGeneration.status === 'Applied' && <Button disabled><CheckCircle2 size={11} /> Applied</Button>}
        <form action={generateScenePlanAction.bind(null, projectId, episodeId)}><PendingButton disabled={!canGenerate} label="Generate Again" pendingLabel="Generating…" variant="outline" /></form>
        <Button variant="outline" render={<Link href={basePath} />}>Discard</Button>
      </div>
    </section>}

    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold"><History size={12} />Scene-plan generation history</div>
      <div className="mt-3 space-y-2">
        {generations.length === 0 ? <div className="text-xs text-muted-foreground">No scene-plan generations yet.</div> : generations.map(item => {
          const summary = generationSummary(item)
          const metadata = item.applyMetadata as { mode?: string } | null
          return <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium">{item.status} · {item.provider} / {item.model}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {item.promptVersion} · {new Date(item.createdAt).toLocaleString()} · {summary.sceneCount ?? '—'} scenes · {summary.duration ?? '—'}s · {item.durationMs ?? '—'}ms · {item.totalTokens ? `${item.totalTokens} tokens` : 'usage unavailable'}
              </div>
              {metadata?.mode && <div className="mt-1 text-[10px] text-green-400">Applied mode: {metadata.mode}</div>}
              {item.errorMessage && <div className="mt-1 text-[10px] text-red-400">{item.errorMessage}</div>}
            </div>
            {Boolean(item.output) && <Button size="sm" variant="outline" render={<Link href={`${basePath}&generation=${item.id}`} />}>View Preview</Button>}
          </div>
        })}
      </div>
    </section>
  </div>
}
