'use client'

import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, CheckCircle2, History, LoaderCircle, Sparkles } from 'lucide-react'
import { applyEpisodeOutlineAction, generateEpisodeOutlineAction } from '@/app/projects/[projectId]/episodes/ai-actions'
import type { AIGenerationDto } from '@/lib/ai/types'
import type { PersistedEpisodeOutline } from '@/lib/ai/schemas/episode-outline'
import { Button } from '@/components/ui/button'

const errorMessages: Record<string, string> = {
  AI_CONFIGURATION_ERROR: 'AI provider configuration is incomplete.',
  AI_PROVIDER_ERROR: 'The provider temporarily rejected the request.',
  AI_RATE_LIMIT: 'The AI provider rate limit was reached. Try again later.',
  AI_TIMEOUT: 'The AI provider request timed out.',
  AI_INVALID_OUTPUT: 'The generated outline did not match the required structure.',
  AI_CONTEXT_ERROR: 'Approved characters, locations, and valid episode context are required.',
  AI_UNKNOWN_ERROR: 'The outline could not be generated.',
}

function GenerateButton({ disabled, label = 'Generate Outline' }: { disabled: boolean; label?: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={disabled || pending} className="bg-amber-500 text-black hover:bg-amber-400">{pending ? <LoaderCircle size={12} className="animate-spin" /> : <Sparkles size={12} />}{pending ? 'Generating…' : label}</Button>
}

export interface AIOutlineContext {
  configured: boolean
  approvedCharacters: number
  approvedCostumes: number
  approvedLocations: number
  hasPreviousEpisode: boolean
  targetDurationSeconds: number
  characterCodes: Record<string, string>
  locationCodes: Record<string, string>
}

export function AIOutlinePanel({
  projectId,
  episodeId,
  context,
  generations,
  selectedGeneration,
  selectedOutline,
  aiError,
  notice,
}: {
  projectId: string
  episodeId: string
  context: AIOutlineContext
  generations: AIGenerationDto[]
  selectedGeneration: AIGenerationDto | null
  selectedOutline: PersistedEpisodeOutline | null
  aiError?: string
  notice?: string
}) {
  const canGenerate = context.configured && context.approvedCharacters > 0 && context.approvedLocations > 0 && context.targetDurationSeconds > 0
  const basePath = `/projects/${projectId}/episodes/${episodeId}?tab=outline`
  return <div className="space-y-5">
    <section className="rounded-xl border border-amber-500/20 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={14} className="text-amber-400" />AI Episode Outline</div><p className="mt-1 text-xs text-muted-foreground">Generate a structured episode plan using approved Story Studio assets. Nothing is applied automatically.</p></div><form action={generateEpisodeOutlineAction.bind(null, projectId, episodeId)}><GenerateButton disabled={!canGenerate} /></form></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] md:grid-cols-5">{[
        ['Characters', context.approvedCharacters],
        ['Costumes', context.approvedCostumes],
        ['Locations', context.approvedLocations],
        ['Previous context', context.hasPreviousEpisode ? 'Available' : 'None'],
        ['Target', `${context.targetDurationSeconds}s`],
      ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-muted/20 p-2"><div className="text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div>)}</div>
      {!context.configured && <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400"><AlertTriangle size={13} className="mt-0.5 shrink-0" />AI provider configuration is incomplete. Add the server-side Qwen environment variables to enable generation.</div>}
      {context.approvedCharacters === 0 && <div className="mt-2 text-xs text-amber-400">Approve at least one character before generating.</div>}
      {context.approvedLocations === 0 && <div className="mt-2 text-xs text-amber-400">Approve at least one location before generating.</div>}
      {aiError && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{errorMessages[aiError] || errorMessages.AI_UNKNOWN_ERROR}</div>}
      {notice === 'outline-applied' && <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400"><CheckCircle2 size={12} />Outline applied to the episode. The script and scenes were not changed.</div>}
    </section>

    {selectedGeneration && selectedOutline && <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-amber-400">Generated preview</div><h2 className="mt-1 text-lg font-semibold">{selectedOutline.title}</h2><p className="mt-1 text-xs text-muted-foreground">{selectedOutline.summary}</p></div><div className="text-right text-[10px] text-muted-foreground">{selectedGeneration.provider} · {selectedGeneration.model}<br />{selectedGeneration.promptVersion} · {selectedGeneration.durationMs ?? '—'}ms<br />{selectedGeneration.totalTokens ? `${selectedGeneration.totalTokens} tokens` : 'Usage unavailable'}</div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{[
        ['Opening hook', selectedOutline.openingHook],
        ['Main objective', selectedOutline.mainObjective],
        ['Conflict', selectedOutline.conflict],
        ['Turning point', selectedOutline.turningPoint],
        ['Ending beat', selectedOutline.endingBeat],
        ['Cliffhanger', selectedOutline.cliffhanger],
        ['Emotional arc', selectedOutline.emotionalArc],
        ['Estimated duration', `${selectedOutline.estimatedDurationSeconds}s`],
      ].map(([label, value]) => <div key={label} className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 text-xs">{value}</div></div>)}</div>
      <div className="mt-5"><h3 className="text-xs font-semibold">Suggested scenes</h3><div className="mt-2 space-y-2">{selectedOutline.sceneSuggestions.map((scene, index) => <div key={`${index}-${scene.title}`} className="rounded-lg border p-3"><div className="flex items-center justify-between"><strong className="text-xs">{index + 1}. {scene.title}</strong><span className="text-[10px] text-muted-foreground">{scene.estimatedDurationSeconds}s · {scene.emotionalTone}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{scene.purpose}</p><p className="mt-1 text-[11px]">{scene.summary}</p><div className="mt-2 flex flex-wrap gap-1">{scene.suggestedCharacterIds.map(id => <span key={id} className="rounded bg-muted px-2 py-1 font-mono text-[9px]">{context.characterCodes[id] || id}</span>)}{scene.suggestedLocationId && <span className="rounded bg-muted px-2 py-1 font-mono text-[9px]">{context.locationCodes[scene.suggestedLocationId] || scene.suggestedLocationId}</span>}</div></div>)}</div></div>
      {selectedOutline.assetWarnings.length > 0 && <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><div className="text-xs font-semibold text-amber-400">Removed asset references</div>{selectedOutline.assetWarnings.map((warning, index) => <div key={`${warning.sceneIndex}-${warning.removedValue}-${index}`} className="mt-1 text-[10px] text-amber-300">Scene {warning.sceneIndex + 1}: {warning.message} ({warning.removedValue})</div>)}</div>}
      <div className="mt-5 flex flex-wrap gap-2">{selectedGeneration.status === 'Completed' && <form action={applyEpisodeOutlineAction.bind(null, projectId, episodeId, selectedGeneration.id)}><Button type="submit" className="bg-amber-500 text-black hover:bg-amber-400">Apply to Episode</Button></form>}<form action={generateEpisodeOutlineAction.bind(null, projectId, episodeId)}><GenerateButton disabled={!canGenerate} label="Generate Again" /></form><Button variant="outline" render={<Link href={basePath} />}>Discard</Button></div>
    </section>}

    <section className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-xs font-semibold"><History size={12} />Generation history</div><div className="mt-3 space-y-2">{generations.length === 0 ? <div className="text-xs text-muted-foreground">No outline generations yet.</div> : generations.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1"><div className="text-xs font-medium">{item.status} · {item.provider} / {item.model}</div><div className="mt-1 text-[10px] text-muted-foreground">{item.promptVersion} · {new Date(item.createdAt).toLocaleString()} · {item.durationMs ?? '—'}ms · {item.totalTokens ? `${item.totalTokens} tokens` : 'usage unavailable'}</div>{item.errorMessage && <div className="mt-1 text-[10px] text-red-400">{item.errorMessage}</div>}</div>{Boolean(item.output) && <Button size="sm" variant="outline" render={<Link href={`${basePath}&generation=${item.id}`} />}>View</Button>}</div>)}</div></section>
  </div>
}
