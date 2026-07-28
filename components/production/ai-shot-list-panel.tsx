'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import {
  applyShotListAction,
  generateShotListAction,
  updateShotListPreviewAction,
} from '@/app/projects/[projectId]/production/actions'
import {
  persistedShotListSchema,
  toShotListDraft,
  type ShotList,
  type ShotListCharacter,
  type ShotSuggestion,
} from '@/lib/ai/schemas/shot-list'
import type { AIGenerationDto } from '@/lib/ai/types'
import type { CostumeDto } from '@/lib/assets/types'
import type { SceneCharacterDto, SceneDto } from '@/lib/episodes/types'
import {
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  LENSES,
  SCREEN_POSITIONS,
  SHOT_TIMES,
  SHOT_TYPES,
} from '@/lib/production/types'
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

const selectClass = 'mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-xs'

function PendingButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus()
  return <Button type="submit" disabled={isPending}>{isPending ? pending : idle}</Button>
}

function nullIfEmpty(value: string) {
  return value.trim() ? value : null
}

function newCharacter(characterId: string): ShotListCharacter {
  return {
    characterId,
    costumeId: null,
    screenPosition: 'Center',
    pose: null,
    expression: null,
    action: null,
    gazeDirection: null,
    physicalState: null,
  }
}

function newShot(scene: SceneDto): ShotSuggestion {
  return {
    temporaryId: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New Shot',
    description: 'Describe the visual purpose of this shot.',
    shotType: 'Medium',
    cameraAngle: 'Eye Level',
    cameraMovement: 'Static',
    lens: '50mm',
    composition: 'Frame the primary subject clearly.',
    action: 'Define the visual action.',
    dialogueExcerpt: null,
    emotionalIntent: null,
    estimatedDurationSeconds: Math.max(1, Math.min(10, scene.targetDurationSeconds)),
    locationId: scene.locationId,
    timeOfDay: scene.timeOfDay,
    lightingNotes: null,
    generationPrompt: null,
    negativePrompt: null,
    compositionLocked: false,
    characters: [],
  }
}

const errorMessages: Record<string, string> = {
  AI_CONFIGURATION_ERROR: 'AI provider configuration is incomplete.',
  AI_CONTEXT_ERROR: 'The Scene Script, approved characters, or approved location is incomplete.',
  AI_INVALID_OUTPUT: 'The AI response did not match the required Shot List structure.',
  AI_PROVIDER_ERROR: 'The provider temporarily rejected the request.',
  AI_RATE_LIMIT: 'The AI provider rate limit was reached. Try again later.',
  AI_TIMEOUT: 'The AI provider request timed out.',
  AI_UNKNOWN_ERROR: 'The AI task could not be completed.',
  already_applied: 'This Shot List has already been applied.',
  invalid_output: 'The Shot List draft is invalid. Review the highlighted fields.',
  blocking_warnings: 'Fix the blocking Shot List warnings before applying.',
  context_changed: 'The scene or Scene Script changed after this Shot List was generated.',
  scene_archived: 'The selected scene is archived.',
  missing_script: 'The Scene Script is required before generating a Shot List.',
  assets_changed: 'The Shot List is no longer valid because scene assets changed.',
  apply_failed: 'The Shot List could not be applied. Existing Shots were not changed.',
  not_found: 'The scoped Shot List generation could not be found.',
}

export function AIShotListPanel({
  projectId,
  episodeId,
  scene,
  sceneCharacters,
  costumes,
  activeShotCount,
  history,
  selectedGeneration,
  aiConfigured,
  hasPreviousScene,
  hasNextScene,
  notice,
  error,
}: {
  projectId: string
  episodeId: string
  scene: SceneDto
  sceneCharacters: SceneCharacterDto[]
  costumes: CostumeDto[]
  activeShotCount: number
  history: AIGenerationDto[]
  selectedGeneration: AIGenerationDto | null
  aiConfigured: boolean
  hasPreviousScene: boolean
  hasNextScene: boolean
  notice?: string
  error?: string
}) {
  const initialDraft = useMemo(
    () => toShotListDraft(selectedGeneration?.output),
    [selectedGeneration],
  )
  const persisted = persistedShotListSchema.safeParse(selectedGeneration?.output)
  const [draft, setDraft] = useState<ShotList | null>(initialDraft)
  const readOnly = selectedGeneration?.status === 'Applied'
  const approvedCharacters = sceneCharacters.filter(item => (
    item.characterStatus === 'Approved' && !item.characterArchivedAt
  ))
  const approvedCostumes = costumes.filter(item => (
    item.approvalStatus === 'Approved' && !item.archivedAt
  ))
  const generationDisabledReasons = [
    !scene.script?.trim() && 'Scene Script is missing.',
    approvedCharacters.length === 0 && 'Assign at least one approved character.',
    (!scene.locationId || scene.locationStatus !== 'Approved' || scene.locationArchivedAt)
      && 'Assign an approved scene location.',
    scene.targetDurationSeconds < 1 && 'Set a valid scene target duration.',
    !aiConfigured && 'AI provider configuration is incomplete.',
  ].filter(Boolean) as string[]
  const serializedDraft = draft ? JSON.stringify(draft) : ''

  const updateShot = (index: number, values: Partial<ShotSuggestion>) => {
    if (!draft || readOnly) return
    setDraft({
      ...draft,
      shots: draft.shots.map((shot, shotIndex) => (
        shotIndex === index ? { ...shot, ...values } : shot
      )),
    })
  }
  const updateCharacter = (
    shotIndex: number,
    characterIndex: number,
    values: Partial<ShotListCharacter>,
  ) => {
    if (!draft || readOnly) return
    const shot = draft.shots[shotIndex]
    updateShot(shotIndex, {
      characters: shot.characters.map((character, index) => (
        index === characterIndex ? { ...character, ...values } : character
      )),
    })
  }
  const moveShot = (index: number, offset: number) => {
    if (!draft || readOnly) return
    const target = index + offset
    if (target < 0 || target >= draft.shots.length) return
    const shots = [...draft.shots]
    ;[shots[index], shots[target]] = [shots[target], shots[index]]
    setDraft({ ...draft, shots })
  }

  return <section className="rounded-xl border border-amber-500/20 bg-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={14} className="text-amber-400" /> AI Shot List</div>
        <p className="mt-1 text-xs text-muted-foreground">Turn the approved Scene Script into an editable cinematic shot plan.</p>
      </div>
      <form action={generateShotListAction.bind(null, projectId, episodeId, scene.id)}>
        <Button type="submit" disabled={generationDisabledReasons.length > 0}>
          <Sparkles size={11} />{history.length ? 'Generate Another Version' : 'Generate Shot List'}
        </Button>
      </form>
    </div>

    <div className="mt-3 grid gap-2 text-[10px] text-muted-foreground sm:grid-cols-4">
      <span>Script: {scene.script?.trim() ? 'Available' : 'Missing'}</span>
      <span>Characters: {approvedCharacters.length}/{sceneCharacters.length} approved</span>
      <span>Costumes: {approvedCostumes.filter(item => approvedCharacters.some(character => character.characterId === item.characterId)).length} approved</span>
      <span>Location: {scene.locationStatus === 'Approved' ? scene.locationCode : 'Not approved'}</span>
      <span>Target: {scene.targetDurationSeconds}s</span>
      <span>Active shots: {activeShotCount}</span>
      <span>Previous context: {hasPreviousScene ? 'Available' : 'None'}</span>
      <span>Next context: {hasNextScene ? 'Available' : 'None'}</span>
    </div>
    {generationDisabledReasons.length > 0 && <div className="mt-3 rounded-lg bg-amber-500/5 p-3 text-[11px] text-amber-300">{generationDisabledReasons.join(' ')}</div>}
    {notice === 'shot-list-generated' && <div className="mt-3 text-xs text-green-400">Shot List generated. No persistent Shots were created.</div>}
    {notice === 'shot-list-preview-saved' && <div className="mt-3 text-xs text-green-400">Shot List preview saved.</div>}
    {notice === 'shot-list-applied' && <div className="mt-3 text-xs text-green-400">Shot List applied successfully.</div>}
    {error && <div className="mt-3 rounded-lg bg-red-500/5 p-3 text-xs text-red-400">{errorMessages[error] || 'The Shot List action could not be completed.'}</div>}

    {draft && selectedGeneration && <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs">Visual strategy<Textarea value={draft.visualStrategy} disabled={readOnly} onChange={event => setDraft({ ...draft, visualStrategy: event.target.value })} className="mt-1.5" /></label>
        <label className="text-xs">Pacing notes<Textarea value={draft.pacingNotes} disabled={readOnly} onChange={event => setDraft({ ...draft, pacingNotes: event.target.value })} className="mt-1.5" /></label>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <span>{draft.shots.length} shots</span><span>·</span>
        <span>{draft.shots.reduce((total, shot) => total + shot.estimatedDurationSeconds, 0)}s current total</span><span>·</span>
        <span>{selectedGeneration.provider} / {selectedGeneration.model}</span><span>·</span>
        <span>{selectedGeneration.promptVersion}</span><span>·</span>
        <span>{selectedGeneration.durationMs || '—'}ms</span><span>·</span>
        <span>{selectedGeneration.totalTokens || '—'} tokens</span>
      </div>
      {persisted.success && persisted.data.warnings.length > 0 && <div className="space-y-1">{persisted.data.warnings.map((warning, index) => <div key={`${warning.code}-${index}`} className={warning.severity === 'Error' ? 'text-[10px] text-red-400' : 'text-[10px] text-amber-400'}><strong>{warning.severity} · {warning.code}</strong> — {warning.message}</div>)}</div>}

      {draft.shots.map((shot, shotIndex) => <article key={shot.temporaryId} className="rounded-xl border bg-background/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold">Suggested Shot {shotIndex + 1}</div>
          {!readOnly && <div className="flex">
            <Button type="button" size="sm" variant="ghost" onClick={() => moveShot(shotIndex, -1)} disabled={shotIndex === 0}><ArrowUp size={10} /></Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => moveShot(shotIndex, 1)} disabled={shotIndex === draft.shots.length - 1}><ArrowDown size={10} /></Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft({ ...draft, shots: [...draft.shots.slice(0, shotIndex + 1), { ...shot, temporaryId: `shot-${Date.now()}-copy` }, ...draft.shots.slice(shotIndex + 1)] })}><Copy size={10} /></Button>
            <Button type="button" size="sm" variant="ghost" className="text-red-400" disabled={draft.shots.length === 1} onClick={() => setDraft({ ...draft, shots: draft.shots.filter((_, index) => index !== shotIndex) })}><Trash2 size={10} /></Button>
          </div>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs">Title<Input value={shot.title} disabled={readOnly} onChange={event => updateShot(shotIndex, { title: event.target.value })} className="mt-1.5" /></label>
          <label className="text-xs">Duration (seconds)<Input type="number" min={1} max={120} value={shot.estimatedDurationSeconds} disabled={readOnly} onChange={event => updateShot(shotIndex, { estimatedDurationSeconds: Number(event.target.value) })} className="mt-1.5" /></label>
          <label className="text-xs md:col-span-2">Description<Textarea value={shot.description} disabled={readOnly} onChange={event => updateShot(shotIndex, { description: event.target.value })} className="mt-1.5" /></label>
          <label className="text-xs">Shot type<select value={shot.shotType} disabled={readOnly} onChange={event => updateShot(shotIndex, { shotType: event.target.value as ShotSuggestion['shotType'] })} className={selectClass}>{SHOT_TYPES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Camera angle<select value={shot.cameraAngle} disabled={readOnly} onChange={event => updateShot(shotIndex, { cameraAngle: event.target.value as ShotSuggestion['cameraAngle'] })} className={selectClass}>{CAMERA_ANGLES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Camera movement<select value={shot.cameraMovement} disabled={readOnly} onChange={event => updateShot(shotIndex, { cameraMovement: event.target.value as ShotSuggestion['cameraMovement'] })} className={selectClass}>{CAMERA_MOVEMENTS.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Lens<select value={shot.lens} disabled={readOnly} onChange={event => updateShot(shotIndex, { lens: event.target.value as ShotSuggestion['lens'] })} className={selectClass}>{LENSES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs md:col-span-2">Composition<Textarea value={shot.composition} disabled={readOnly} onChange={event => updateShot(shotIndex, { composition: event.target.value })} className="mt-1.5" /></label>
          <label className="text-xs md:col-span-2">Action<Textarea value={shot.action} disabled={readOnly} onChange={event => updateShot(shotIndex, { action: event.target.value })} className="mt-1.5" /></label>
          <label className="text-xs">Dialogue excerpt<Textarea value={shot.dialogueExcerpt || ''} disabled={readOnly} onChange={event => updateShot(shotIndex, { dialogueExcerpt: nullIfEmpty(event.target.value) })} className="mt-1.5" /></label>
          <label className="text-xs">Emotional intent<Textarea value={shot.emotionalIntent || ''} disabled={readOnly} onChange={event => updateShot(shotIndex, { emotionalIntent: nullIfEmpty(event.target.value) })} className="mt-1.5" /></label>
          <label className="text-xs">Time of day<select value={shot.timeOfDay} disabled={readOnly} onChange={event => updateShot(shotIndex, { timeOfDay: event.target.value as ShotSuggestion['timeOfDay'] })} className={selectClass}>{SHOT_TIMES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Lighting notes<Input value={shot.lightingNotes || ''} disabled={readOnly} onChange={event => updateShot(shotIndex, { lightingNotes: nullIfEmpty(event.target.value) })} className="mt-1.5" /></label>
          <label className="text-xs md:col-span-2">Generation prompt<Textarea value={shot.generationPrompt || ''} disabled={readOnly} onChange={event => updateShot(shotIndex, { generationPrompt: nullIfEmpty(event.target.value) })} className="mt-1.5" /></label>
          <label className="text-xs md:col-span-2">Negative prompt<Textarea value={shot.negativePrompt || ''} disabled={readOnly} onChange={event => updateShot(shotIndex, { negativePrompt: nullIfEmpty(event.target.value) })} className="mt-1.5" /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={shot.compositionLocked} disabled={readOnly} onChange={event => updateShot(shotIndex, { compositionLocked: event.target.checked })} /> Lock composition</label>
        </div>

        <div className="mt-4 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">Characters</span>{!readOnly && <Button type="button" size="sm" variant="outline" disabled={approvedCharacters.every(character => shot.characters.some(item => item.characterId === character.characterId))} onClick={() => {
            const available = approvedCharacters.find(character => !shot.characters.some(item => item.characterId === character.characterId))
            if (available) updateShot(shotIndex, { characters: [...shot.characters, newCharacter(available.characterId)] })
          }}><Plus size={10} /> Add Scene Character</Button>}</div>
          <div className="space-y-3">{shot.characters.map((character, characterIndex) => {
            const characterCostumes = approvedCostumes.filter(item => item.characterId === character.characterId)
            return <div key={`${character.characterId}-${characterIndex}`} className="rounded bg-muted/30 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs">Character<select value={character.characterId} disabled={readOnly} onChange={event => updateCharacter(shotIndex, characterIndex, { characterId: event.target.value, costumeId: null })} className={selectClass}>{approvedCharacters.map(item => <option key={item.characterId} value={item.characterId}>{item.characterCode} · {item.characterName}</option>)}</select></label>
                <label className="text-xs">Costume<select value={character.costumeId || ''} disabled={readOnly} onChange={event => updateCharacter(shotIndex, characterIndex, { costumeId: event.target.value || null })} className={selectClass}><option value="">Unassigned</option>{characterCostumes.map(item => <option key={item.id} value={item.id}>{item.assetCode} · {item.name}</option>)}</select></label>
                <label className="text-xs">Screen position<select value={character.screenPosition || ''} disabled={readOnly} onChange={event => updateCharacter(shotIndex, characterIndex, { screenPosition: event.target.value as ShotListCharacter['screenPosition'] || null })} className={selectClass}><option value="">Unspecified</option>{SCREEN_POSITIONS.map(item => <option key={item}>{item}</option>)}</select></label>
                {(['pose', 'expression', 'action', 'gazeDirection', 'physicalState'] as const).map(field => <label key={field} className="text-xs capitalize">{field.replace(/([A-Z])/g, ' $1')}<Input value={character[field] || ''} disabled={readOnly} onChange={event => updateCharacter(shotIndex, characterIndex, { [field]: nullIfEmpty(event.target.value) })} className="mt-1.5" /></label>)}
              </div>
              {!readOnly && <Button type="button" size="sm" variant="ghost" className="mt-2 text-red-400" onClick={() => updateShot(shotIndex, { characters: shot.characters.filter((_, index) => index !== characterIndex) })}>Remove Character</Button>}
            </div>
          })}</div>
        </div>
      </article>)}

      {!readOnly && <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, shots: [...draft.shots, newShot(scene)] })}><Plus size={11} /> Add Shot</Button>}
      <div className="flex flex-wrap gap-2">
        {!readOnly && <form action={updateShotListPreviewAction.bind(null, projectId, episodeId, scene.id, selectedGeneration.id)}>
          <input type="hidden" name="shotList" value={serializedDraft} />
          <PendingButton idle="Save Preview" pending="Saving preview…" />
        </form>}
        {!readOnly && activeShotCount === 0 && <form action={applyShotListAction.bind(null, projectId, episodeId, scene.id, selectedGeneration.id, 'append')}>
          <input type="hidden" name="shotList" value={serializedDraft} />
          <PendingButton idle="Create Shots" pending="Saving and creating…" />
        </form>}
        {!readOnly && activeShotCount > 0 && <Dialog><DialogTrigger render={<Button variant="outline" />}>Apply as New Shots</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Append this Shot List?</DialogTitle><DialogDescription>Current active Shots remain. The visible draft will be saved and appended.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><form action={applyShotListAction.bind(null, projectId, episodeId, scene.id, selectedGeneration.id, 'append')}><input type="hidden" name="shotList" value={serializedDraft} /><PendingButton idle="Append Shots" pending="Saving and appending…" /></form></DialogFooter></DialogContent></Dialog>}
        {!readOnly && activeShotCount > 0 && <Dialog><DialogTrigger render={<Button variant="destructive" />}>Replace Existing Shots</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Replace all active Shots?</DialogTitle><DialogDescription>Current active Shots will be archived. The visible draft will be saved and applied as new Draft Shots. This does not delete historical storyboard jobs.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><form action={applyShotListAction.bind(null, projectId, episodeId, scene.id, selectedGeneration.id, 'replace')}><input type="hidden" name="shotList" value={serializedDraft} /><PendingButton idle="Replace Shots" pending="Saving and replacing…" /></form></DialogFooter></DialogContent></Dialog>}
      </div>
    </div>}

    {history.length > 0 && <div className="mt-5 border-t pt-4"><h3 className="text-xs font-semibold">Shot List history</h3><div className="mt-2 space-y-2">{history.map(item => {
      const output = persistedShotListSchema.safeParse(item.output)
      const metadata = item.applyMetadata as { mode?: string } | null
      return <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 p-3 text-[10px]"><div><strong>{item.status}</strong> · {new Date(item.createdAt).toLocaleString()} · {item.provider}/{item.model} · {item.promptVersion}<div className="mt-1 text-muted-foreground">{output.success ? `${output.data.metadata.shotCount} shots · ${output.data.metadata.totalEstimatedDurationSeconds}s · ${output.data.metadata.warningCount} warnings` : item.errorMessage || 'No preview output'} · {item.durationMs || '—'}ms · {item.totalTokens || '—'} tokens{metadata?.mode ? ` · ${metadata.mode}` : ''}</div></div><Button size="sm" variant="outline" render={<Link href={`/projects/${projectId}/production/episodes/${episodeId}?scene=${scene.id}&shotGeneration=${item.id}`} />}>View Preview</Button></div>
    })}</div></div>}
  </section>
}
