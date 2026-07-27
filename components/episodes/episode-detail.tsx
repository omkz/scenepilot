'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AlertTriangle, Archive, ArrowDown, ArrowUp, CheckCircle2, MapPin, RefreshCw, Send, Trash2 } from 'lucide-react'
import {
  archiveSceneAction,
  deleteSceneAction,
  moveSceneAction,
  removeAssignmentAction,
  restoreSceneAction,
  sendToProductionAction,
  setEpisodeStatusAction,
  setSceneStatusAction,
  updateEpisodeAction,
  type EpisodeActionState,
} from '@/app/projects/[projectId]/episodes/actions'
import type { CharacterDto, CostumeDto, LocationDto } from '@/lib/assets/types'
import type { ContinuityIssue } from '@/lib/continuity/types'
import { EPISODE_TABS, type EpisodeDto, type EpisodeTab, type SceneCharacterDto, type SceneDto } from '@/lib/episodes/types'
import type { EpisodeReadiness } from '@/lib/episodes/readiness'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { EpisodeForm } from '@/components/episodes/episode-form'
import { AssignmentFormSheet, SceneFormSheet } from '@/components/episodes/scene-forms'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const tabPath = (projectId: string, episodeId: string, tab: EpisodeTab) => `/projects/${projectId}/episodes/${episodeId}?tab=${tab}`

function ScriptForm({ projectId, episode }: { projectId: string; episode: EpisodeDto }) {
  const [state, action] = useActionState<EpisodeActionState, FormData>(updateEpisodeAction.bind(null, projectId, episode.id), {})
  const words = episode.script?.trim() ? episode.script.trim().split(/\s+/).length : 0
  return <form action={action} className="space-y-3">
    <input type="hidden" name="title" value={episode.title} /><input type="hidden" name="summary" value={episode.summary || ''} /><input type="hidden" name="outline" value={episode.outline || ''} /><input type="hidden" name="cliffhanger" value={episode.cliffhanger || ''} /><input type="hidden" name="targetDurationSeconds" value={episode.targetDurationSeconds} /><input type="hidden" name="status" value={episode.status} /><input type="hidden" name="productionStatus" value={episode.productionStatus} /><input type="hidden" name="returnTab" value="script" />
    {state.message && <div className="text-xs text-red-400">{state.message}</div>}
    <Textarea name="script" defaultValue={episode.script || ''} maxLength={50000} className="min-h-[420px] font-mono text-xs leading-relaxed" />
    <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{words} words · Updated {new Date(episode.updatedAt).toLocaleString()}</span><Button type="submit">Save Script</Button></div>
  </form>
}

function SceneDeleteDialog({ projectId, episodeId, scene }: { projectId: string; episodeId: string; scene: SceneDto }) {
  return <Dialog><DialogTrigger render={<Button size="sm" variant="ghost" className="text-red-400" />}><Trash2 size={11} /></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete {scene.title}?</DialogTitle><DialogDescription>This permanently deletes the scene and its character assignments. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><form action={deleteSceneAction.bind(null, projectId, episodeId, scene.id)}><Button type="submit" variant="destructive">Delete scene</Button></form></DialogFooter></DialogContent></Dialog>
}

export function EpisodeDetail({
  projectId,
  episode,
  activeTab,
  scenes,
  archivedScenes,
  assignments,
  characters,
  costumes,
  locations,
  issues,
  readiness,
  error,
}: {
  projectId: string
  episode: EpisodeDto
  activeTab: EpisodeTab
  scenes: SceneDto[]
  archivedScenes: SceneDto[]
  assignments: SceneCharacterDto[]
  characters: CharacterDto[]
  costumes: CostumeDto[]
  locations: LocationDto[]
  issues: ContinuityIssue[]
  readiness: EpisodeReadiness
  error?: string
}) {
  const uniqueCharacters = new Set(assignments.map(item => item.characterId)).size
  const uniqueLocations = new Set(scenes.map(scene => scene.locationId).filter(Boolean)).size
  const sceneName = new Map(scenes.map(scene => [scene.id, scene.title]))
  const assetGroups = [
    ['Characters', [...new Map(assignments.map(item => [item.characterId, {
      name: item.characterName,
      code: item.characterCode,
      status: item.characterStatus,
      scenes: assignments.filter(value => value.characterId === item.characterId).map(value => sceneName.get(value.sceneId)).filter(Boolean),
    }])).values()]],
    ['Costumes', [...new Map(assignments.filter(item => item.costumeId).map(item => [item.costumeId, {
      name: item.costumeName,
      code: item.costumeCode,
      status: item.costumeStatus,
      scenes: assignments.filter(value => value.costumeId === item.costumeId).map(value => sceneName.get(value.sceneId)).filter(Boolean),
    }])).values()]],
    ['Locations', [...new Map(scenes.filter(scene => scene.locationId).map(scene => [scene.locationId, {
      name: scene.locationName,
      code: scene.locationCode,
      status: scene.locationStatus,
      scenes: scenes.filter(value => value.locationId === scene.locationId).map(value => value.title),
    }])).values()]],
  ] as const
  return <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-7xl p-6">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div><div className="text-[10px] uppercase tracking-wider text-amber-400">Episode {String(episode.episodeNumber).padStart(2, '0')}</div><h1 className="text-xl font-bold">{episode.title}</h1><p className="mt-1 max-w-3xl text-xs text-muted-foreground">{episode.summary || 'No episode summary yet.'}</p></div>
      <div className="flex gap-2"><Button variant="outline" render={<Link href={tabPath(projectId, episode.id, 'continuity')} />}><RefreshCw size={12} /> Run Continuity Check</Button><form action={sendToProductionAction.bind(null, projectId, episode.id)}><Button type="submit" disabled={!readiness.readyForProduction} className="bg-amber-500 text-black hover:bg-amber-400"><Send size={12} /> Send to Production</Button></form></div>
    </div>
    {error === 'not-ready' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">Episode is not ready: {readiness.blockingIssues.join('; ')}.</div>}
    <nav className="mb-5 flex flex-wrap gap-1 rounded-lg bg-muted p-1">{EPISODE_TABS.map(tab => <Link key={tab} href={tabPath(projectId, episode.id, tab)} className={cn('rounded-md px-3 py-1.5 text-xs capitalize text-muted-foreground', activeTab === tab && 'bg-card text-foreground')}>{tab}{tab === 'continuity' && issues.length > 0 ? ` (${issues.length})` : ''}</Link>)}</nav>

    {activeTab === 'overview' && <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border bg-card p-4"><div className="text-[10px] text-muted-foreground">Readiness</div><div className="text-2xl font-bold text-amber-400">{readiness.score}%</div><Progress value={readiness.score} className="mt-2 h-1" /></div>{[['Scenes', scenes.length], ['Characters', uniqueCharacters], ['Locations', uniqueLocations]].map(([label, count]) => <div key={String(label)} className="rounded-xl border bg-card p-4"><div className="text-[10px] text-muted-foreground">{label}</div><div className="text-2xl font-bold">{count}</div></div>)}</div>
      <div className="grid gap-4 md:grid-cols-2"><section className="rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">Episode status</h2><div className="mt-3 flex flex-wrap gap-2">{['Draft', 'Ready', 'In Review', 'Approved'].map(status => <form key={status} action={setEpisodeStatusAction.bind(null, projectId, episode.id, status)}><Button type="submit" size="sm" variant={episode.status === status ? 'default' : 'outline'}>{status}</Button></form>)}</div><div className="mt-4 text-xs text-muted-foreground">Production: {episode.productionStatus}</div></section><section className="rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">Duration coverage</h2><div className="mt-2 text-2xl font-bold">{readiness.totalSceneDuration}s / {episode.targetDurationSeconds}s</div><p className="mt-2 text-xs text-muted-foreground">{readiness.blockingIssues.length ? readiness.blockingIssues.join(' · ') : 'All production readiness requirements are satisfied.'}</p></section></div>
    </div>}

    {activeTab === 'outline' && <div className="mx-auto max-w-3xl"><EpisodeForm projectId={projectId} episode={episode} defaultDuration={episode.targetDurationSeconds} returnTab="outline" /></div>}
    {activeTab === 'script' && <ScriptForm projectId={projectId} episode={episode} />}

    {activeTab === 'scenes' && <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Scene order</h2><SceneFormSheet projectId={projectId} episodeId={episode.id} locations={locations} /></div>{scenes.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">No scenes yet.</div> : scenes.map((scene, index) => <div key={scene.id} className="rounded-lg border bg-card p-3"><div className="flex items-start gap-2"><div className="rounded bg-muted px-2 py-1 text-[10px] font-bold">{index + 1}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{scene.title}</div><div className="mt-1 text-[10px] text-muted-foreground">{scene.targetDurationSeconds}s · {scene.locationName || 'No location'} · {scene.characterCount} cast</div></div></div><div className="mt-2 flex"><form action={moveSceneAction.bind(null, projectId, episode.id, scene.id, 'up')}><Button type="submit" size="sm" variant="ghost" disabled={index === 0}><ArrowUp size={10} /></Button></form><form action={moveSceneAction.bind(null, projectId, episode.id, scene.id, 'down')}><Button type="submit" size="sm" variant="ghost" disabled={index === scenes.length - 1}><ArrowDown size={10} /></Button></form></div></div>)}</aside>
      <main className="space-y-4">{scenes.map(scene => {
        const sceneAssignments = assignments.filter(item => item.sceneId === scene.id)
        const sceneIssues = issues.filter(item => item.sceneId === scene.id)
        return <article key={scene.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] text-amber-400">Scene {scene.sceneNumber} · Position {scene.position}</div><h2 className="text-sm font-semibold">{scene.title}</h2><div className="mt-1 text-[11px] text-muted-foreground">{scene.emotionalTone || 'No emotional tone'} · {scene.timeOfDay} · {scene.targetDurationSeconds}s</div></div><div className="flex"><SceneFormSheet projectId={projectId} episodeId={episode.id} locations={locations} scene={scene} /><form action={archiveSceneAction.bind(null, projectId, episode.id, scene.id)}><Button type="submit" size="sm" variant="ghost" title="Archive scene"><Archive size={11} /></Button></form><SceneDeleteDialog projectId={projectId} episodeId={episode.id} scene={scene} /></div></div>
          <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs"><MapPin size={11} className="mr-1 inline" />{scene.locationName || 'No location assigned'} {scene.locationStatus ? `· ${scene.locationStatus}` : ''}</div>
          <div className="mt-4 flex items-center justify-between"><h3 className="text-xs font-semibold">Characters</h3>{characters.length > 0 && <AssignmentFormSheet projectId={projectId} episodeId={episode.id} sceneId={scene.id} characters={characters} costumes={costumes} />}</div>
          <div className="mt-2 space-y-2">{sceneAssignments.length === 0 ? <div className="text-xs text-muted-foreground">No characters assigned.</div> : sceneAssignments.map(assignment => <div key={assignment.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="flex-1"><div className="text-xs font-semibold">{assignment.characterName} <span className="font-mono text-[10px] text-amber-400">{assignment.characterCode}</span> <span className="text-[10px] text-muted-foreground">· {assignment.characterStatus}</span></div><div className="mt-1 text-[11px] text-muted-foreground">{assignment.costumeName ? `${assignment.costumeName} · ${assignment.costumeCode} · ${assignment.costumeCondition} · ${assignment.costumeStatus}` : 'No costume'} · {assignment.emotionalState || 'No emotional state'} · {assignment.physicalState || 'No physical state'}</div></div><AssignmentFormSheet projectId={projectId} episodeId={episode.id} sceneId={scene.id} characters={characters} costumes={costumes} assignment={assignment} /><form action={removeAssignmentAction.bind(null, projectId, episode.id, scene.id, assignment.id)}><Button type="submit" size="sm" variant="ghost" className="text-red-400">Remove</Button></form></div>)}</div>
          {sceneIssues.length > 0 && <div className="mt-3 text-[11px] text-amber-400"><AlertTriangle size={10} className="mr-1 inline" />{sceneIssues.length} continuity issue{sceneIssues.length === 1 ? '' : 's'}</div>}
          <div className="mt-3 flex gap-2">{['Draft', 'Ready', 'Continuity Review', 'Approved'].map(status => <form key={status} action={setSceneStatusAction.bind(null, projectId, episode.id, scene.id, status)}><Button type="submit" size="sm" variant={scene.status === status ? 'default' : 'outline'}>{status}</Button></form>)}</div>
        </article>
      })}
      {archivedScenes.length > 0 && <section className="rounded-xl border border-dashed p-4"><h2 className="text-xs font-semibold">Archived scenes</h2><div className="mt-3 space-y-2">{archivedScenes.map(scene => <div key={scene.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3"><div><div className="text-xs font-medium">{scene.title}</div><div className="text-[10px] text-muted-foreground">Scene {scene.sceneNumber} · Archived</div></div><div className="flex gap-2"><form action={restoreSceneAction.bind(null, projectId, episode.id, scene.id)}><Button type="submit" size="sm" variant="outline">Restore</Button></form><SceneDeleteDialog projectId={projectId} episodeId={episode.id} scene={scene} /></div></div>)}</div></section>}
      </main>
    </div>}

    {activeTab === 'assets' && <div className="grid gap-4 md:grid-cols-3">{assetGroups.map(([label, values]) => <section key={label} className="rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">{label}</h2><div className="mt-3 space-y-2">{values.length === 0 ? <p className="text-xs text-muted-foreground">None used.</p> : values.map(value => <div key={String(value.code)} className="rounded-lg border p-2"><div className="text-xs">{value.name}</div><div className="font-mono text-[10px] text-amber-400">{value.code} · {value.status}</div><div className="mt-1 text-[10px] text-muted-foreground">{value.scenes.length} scene usage{value.scenes.length === 1 ? '' : 's'} · {value.scenes.join(', ')}</div></div>)}</div></section>)}</div>}

    {activeTab === 'continuity' && <div className="space-y-5">{(['Error', 'Warning', 'Info'] as const).map(severity => {
      const grouped = issues.filter(issue => issue.severity === severity)
      return <section key={severity}><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">{severity === 'Error' ? <AlertTriangle size={13} className="text-red-400" /> : severity === 'Warning' ? <AlertTriangle size={13} className="text-amber-400" /> : <CheckCircle2 size={13} className="text-blue-400" />}{severity}s ({grouped.length})</h2><div className="space-y-2">{grouped.length === 0 ? <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">No {severity.toLowerCase()} issues.</div> : grouped.map(issue => <div key={issue.id} className="rounded-xl border bg-card p-4"><div className="text-xs font-semibold">{issue.title}</div><p className="mt-1 text-xs text-muted-foreground">{issue.description}</p><div className="mt-2 text-[10px] text-amber-400">{issue.ruleCode}{issue.suggestedAction ? ` · ${issue.suggestedAction}` : ''}</div>{issue.sceneId && <Button size="sm" variant="outline" render={<Link href={tabPath(projectId, episode.id, 'scenes')} />} className="mt-3">Open Scene</Button>}</div>)}</div></section>
    })}</div>}
  </div></div>
}
