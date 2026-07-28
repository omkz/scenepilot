'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, Archive, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Clapperboard, Copy, Film, Lock, MapPin, RefreshCw, Sparkles, Trash2, Unlock, Users } from 'lucide-react'
import {
  approveStoryboardAction,
  archiveShotAction,
  buildShotPromptAction,
  createBasicShotListAction,
  createStoryboardPlaceholderAction,
  deleteShotAction,
  duplicateShotAction,
  generateShotVideoAction,
  generateStoryboardImageAction,
  inheritSceneLocationAction,
  moveShotAction,
  removeShotCharacterAction,
  restoreShotAction,
  setCompositionLockAction,
  setShotApprovalAction,
} from '@/app/projects/[projectId]/production/actions'
import type { CostumeDto, ImageAIStatusDto, LocationDto } from '@/lib/assets/types'
import type { AIGenerationDto } from '@/lib/ai/types'
import type { ShotIssue } from '@/lib/continuity/check-shot'
import type { EpisodeDto, SceneCharacterDto, SceneDto } from '@/lib/episodes/types'
import type { EpisodeStoryboardReadiness } from '@/lib/production/readiness'
import type { ShotCharacterDto, ShotDto, StoryboardJobDto } from '@/lib/production/types'
import { cn } from '@/lib/utils'
import { AddSceneCharactersSheet, ShotCharacterSheet, ShotFormSheet } from '@/components/production/shot-forms'
import { AIShotListPanel } from '@/components/production/ai-shot-list-panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

const href = (projectId: string, episodeId: string, sceneId?: string) =>
  `/projects/${projectId}/production/episodes/${episodeId}${sceneId ? `?scene=${sceneId}` : ''}`

function ShotDeleteDialog({ projectId, episodeId, shot }: { projectId: string; episodeId: string; shot: ShotDto }) {
  return <Dialog><DialogTrigger render={<Button size="sm" variant="ghost" className="text-red-400" />}><Trash2 size={11} /></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete {shot.title}?</DialogTitle><DialogDescription>This permanently deletes the shot, its character directions, and placeholder jobs. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><form action={deleteShotAction.bind(null, projectId, episodeId, shot.id)}><Button type="submit" variant="destructive">Delete shot</Button></form></DialogFooter></DialogContent></Dialog>
}

interface StoryboardImageOutput {
  kind: 'Storyboard Image'
  storageUrl: string
  generationProvider: string
  generationModel: string
}

interface ShotVideoOutput {
  kind: 'Shot Video'
  storageUrl: string
  generationProvider: string
  generationModel: string
  resolution: string
  durationSeconds: number
}

interface VideoAIStatus {
  configured: boolean
  provider: 'wan'
  model: string
  resolution: '720P' | '1080P'
  pollIntervalSeconds: number
}

function storyboardImageOutput(job: StoryboardJobDto | undefined) {
  if (!job || job.status !== 'Completed' || job.jobType !== 'Storyboard Image') return null
  const output = job.outputPlaceholder as Partial<StoryboardImageOutput> | null
  if (
    output?.kind !== 'Storyboard Image'
    || typeof output.storageUrl !== 'string'
    || typeof output.generationProvider !== 'string'
    || typeof output.generationModel !== 'string'
  ) return null
  return output as StoryboardImageOutput
}

function shotVideoOutput(job: StoryboardJobDto | undefined) {
  if (!job || job.status !== 'Completed' || job.jobType !== 'Shot Video') return null
  const output = job.outputPlaceholder as Partial<ShotVideoOutput> | null
  if (
    output?.kind !== 'Shot Video'
    || typeof output.storageUrl !== 'string'
    || typeof output.generationProvider !== 'string'
    || typeof output.generationModel !== 'string'
  ) return null
  return {
    ...output,
    resolution: typeof output.resolution === 'string' ? output.resolution : '720P',
    durationSeconds: typeof output.durationSeconds === 'number' ? output.durationSeconds : 5,
  } as ShotVideoOutput
}

function StoryboardImageSubmitButton({
  configured,
  regenerate,
}: {
  configured: boolean
  regenerate: boolean
}) {
  const { pending } = useFormStatus()
  return <Button
    type="submit"
    size="sm"
    disabled={!configured || pending}
    className="bg-amber-500 text-black hover:bg-amber-400"
  >
    <Sparkles size={10} />
    {pending
      ? 'Generating Image…'
      : regenerate
        ? 'Regenerate Storyboard Image'
        : 'Generate Storyboard Image'}
  </Button>
}

function ShotVideoSubmitButton({
  configured,
  hasKeyframe,
  hasVideo,
  active,
}: {
  configured: boolean
  hasKeyframe: boolean
  hasVideo: boolean
  active: boolean
}) {
  const { pending } = useFormStatus()
  return <Button
    type="submit"
    size="sm"
    disabled={!configured || pending || active}
    className="bg-amber-500 text-black hover:bg-amber-400"
  >
    <Film size={10} />
    {pending
      ? hasKeyframe ? 'Starting Video…' : 'Preparing Keyframe…'
      : active
        ? 'Generating Video…'
        : hasVideo
          ? 'Regenerate Video'
          : 'Generate Video'}
  </Button>
}

function ShotVideoPreview({
  projectId,
  latestJob,
  completedJob,
  pollIntervalSeconds,
  shotTitle,
}: {
  projectId: string
  latestJob?: StoryboardJobDto
  completedJob?: StoryboardJobDto
  pollIntervalSeconds: number
  shotTitle: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(latestJob?.status || 'Idle')
  const [progress, setProgress] = useState(latestJob?.progress || 0)
  const [errorMessage, setErrorMessage] = useState(latestJob?.errorMessage || null)
  const [videoUrl, setVideoUrl] = useState(
    shotVideoOutput(latestJob)?.storageUrl
      || shotVideoOutput(completedJob)?.storageUrl
      || null,
  )
  const output = shotVideoOutput(latestJob) || shotVideoOutput(completedJob)
  const active = Boolean(
    latestJob && ['Queued', 'Submitted', 'Running'].includes(latestJob.status),
  )

  useEffect(() => {
    if (!latestJob || !active) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/production/video-jobs/${latestJob.id}`,
          { cache: 'no-store' },
        )
        const result = await response.json() as {
          status: string
          progress: number
          videoUrl: string | null
          errorMessage: string | null
        }
        if (cancelled) return
        setStatus(result.status)
        setProgress(result.progress)
        setErrorMessage(result.errorMessage)
        if (result.videoUrl) setVideoUrl(result.videoUrl)
        if (result.status === 'Completed' || result.status === 'Failed') {
          router.refresh()
          return
        }
      } catch {
        if (!cancelled) setErrorMessage('Unable to refresh video generation status.')
      }
      if (!cancelled) timer = setTimeout(poll, pollIntervalSeconds * 1_000)
    }
    timer = setTimeout(poll, 500)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [active, latestJob, pollIntervalSeconds, projectId, router])

  return <div className="overflow-hidden rounded-lg border bg-black">
    {videoUrl
      ? <video
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video h-full min-h-40 w-full rounded-lg object-cover"
        />
      : <div className="flex aspect-video min-h-40 items-center justify-center bg-gradient-to-br from-slate-950 via-amber-950/40 to-slate-900 p-4 text-center">
          <div><Film size={22} className="mx-auto text-amber-400" /><div className="mt-2 text-[10px] text-white/50">{shotTitle}</div><div className="mt-1 text-[9px] text-white/30">VIDEO PREVIEW</div></div>
        </div>}
    {(active || status === 'Failed') && <div className="border-t bg-card px-3 py-2">
      <div className="flex items-center justify-between text-[9px] text-muted-foreground"><span>{progress >= 90 ? 'Saving Video…' : status === 'Submitted' ? 'Starting Video…' : status === 'Running' ? 'Generating Video…' : status}</span><span>{progress}%</span></div>
      <Progress value={progress} className="mt-1 h-1" />
      {errorMessage && <div className="mt-2 text-[9px] text-red-400">{errorMessage}</div>}
    </div>}
    {output && <div className="border-t bg-card px-3 py-2 text-[9px] text-muted-foreground">
      {output.generationProvider === 'wan' ? 'Wan' : output.generationProvider} · {output.generationModel} · {output.resolution} · {output.durationSeconds} seconds
    </div>}
  </div>
}

export function StoryboardWorkspace({
  projectId,
  episode,
  scenes,
  selectedScene,
  readiness,
  sceneCharacters,
  costumes,
  locations,
  shotAssignments,
  issues,
  jobs,
  archivedShots,
  shotListHistory,
  selectedShotGeneration,
  aiConfigured,
  imageAIStatus,
  videoAIStatus,
  selectedShotId,
  notice,
  error,
}: {
  projectId: string
  episode: EpisodeDto
  scenes: SceneDto[]
  selectedScene: SceneDto
  readiness: EpisodeStoryboardReadiness
  sceneCharacters: SceneCharacterDto[]
  costumes: CostumeDto[]
  locations: LocationDto[]
  shotAssignments: ShotCharacterDto[]
  issues: ShotIssue[]
  jobs: StoryboardJobDto[]
  archivedShots: ShotDto[]
  shotListHistory: AIGenerationDto[]
  selectedShotGeneration: AIGenerationDto | null
  aiConfigured: boolean
  imageAIStatus: ImageAIStatusDto
  videoAIStatus: VideoAIStatus
  selectedShotId?: string
  notice?: string
  error?: string
}) {
  const scrolledShot = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedShotId || scrolledShot.current === selectedShotId) return
    const element = document.getElementById(`shot-${selectedShotId}`)
    if (!element) return
    scrolledShot.current = selectedShotId
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const url = new URL(window.location.href)
    url.searchParams.delete('selectedShot')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
  }, [selectedShotId])
  const sceneReadiness = readiness.scenes.find(item => item.scene.id === selectedScene.id)
  const shots = sceneReadiness?.shots || []
  const approvalBlocked = !readiness.readyForApproval
  return <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-[1500px] p-5">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div><Link href={`/projects/${projectId}/production`} className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><ArrowLeft size={11} /> Back to Production</Link><div className="text-[10px] uppercase tracking-wider text-amber-400">Episode {String(episode.episodeNumber).padStart(2, '0')}</div><h1 className="text-xl font-bold">{episode.title}</h1><div className="mt-1 text-xs text-muted-foreground">{episode.productionStatus} · Storyboard {episode.storyboardStatus} · {readiness.totalShots} shots · {readiness.totalErrors} errors</div></div>
      <div className="w-full max-w-sm rounded-xl border bg-card p-3"><div className="flex items-center justify-between text-xs"><span>Storyboard completion</span><strong>{readiness.score}%</strong></div><Progress value={readiness.score} className="my-2 h-1" /><form action={approveStoryboardAction.bind(null, projectId, episode.id)}><Button type="submit" disabled={approvalBlocked || episode.storyboardStatus === 'Approved'} className="w-full bg-amber-500 text-black hover:bg-amber-400"><CheckCircle2 size={12} />{episode.storyboardStatus === 'Approved' ? 'Storyboard Approved' : 'Approve Storyboard'}</Button></form></div>
    </header>
    {error === 'storyboard-not-ready' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">Storyboard cannot be approved until every scene has approved, complete shots with valid durations and no errors.</div>}
    {error === 'shot-not-ready' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">Shot cannot be approved until it has a description or action, location, valid scene characters and costumes, and no blocking errors.</div>}
    {notice === 'storyboard-image-generated' && <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400">Storyboard image generated successfully.</div>}
    {error === 'storyboard-image-not-configured' && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">Image AI configuration is incomplete.</div>}
    {error === 'storyboard-image-missing-master' && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">Required Character, Costume, or Location Master References are missing.</div>}
    {error === 'storyboard-image-invalid-assets' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">Storyboard assets must be active, approved, correctly assigned, and project-scoped.</div>}
    {error === 'storyboard-image-timeout' && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">Storyboard image generation took too long. You can try again.</div>}
    {error === 'storyboard-image-failed' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">The storyboard image could not be generated. Existing storyboard data was not changed.</div>}
    {notice === 'video-generation-started' && <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400">Video generation started. ScenePilot will save the finished MP4 automatically.</div>}
    {error === 'video-ai-not-configured' && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">Image and video AI configuration is incomplete.</div>}
    {error === 'video-keyframe-failed' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">The storyboard keyframe could not be prepared. Check the approved Master References.</div>}
    {error === 'video-invalid-assets' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">Video generation requires active, approved, correctly assigned shot assets.</div>}
    {error === 'video-submit-failed' && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">The video task could not be submitted. Existing media was not changed.</div>}
    {error === 'video-generation-already-running' && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">Video generation is already running for this shot.</div>}
    {(!imageAIStatus.configured || !videoAIStatus.configured) && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">Image and video AI configuration is incomplete.</div>}

    <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
      <aside className="space-y-2"><div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Scene navigator</div>{readiness.scenes.map(item => <Link key={item.scene.id} href={href(projectId, episode.id, item.scene.id)} className={cn('block rounded-xl border bg-card p-3 hover:border-amber-500/30', item.scene.id === selectedScene.id && 'border-amber-500/40')}><div className="flex items-center justify-between"><div className="text-xs font-semibold">Scene {item.scene.sceneNumber} · {item.scene.title}</div>{item.ready ? <CheckCircle2 size={12} className="text-green-400" /> : <AlertTriangle size={12} className="text-amber-400" />}</div><div className="mt-2 text-[10px] text-muted-foreground">{item.scene.targetDurationSeconds}s · {item.totalShots} shots · {item.approvedShots} approved</div><Progress value={item.score} className="mt-2 h-1" /><div className="mt-1 text-[10px] text-muted-foreground">{item.errors} errors · {item.warnings} warnings</div></Link>)}</aside>

      <main className="space-y-4">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><div className="text-[10px] text-amber-400">Scene {selectedScene.sceneNumber}</div><h2 className="text-sm font-semibold">{selectedScene.title}</h2><div className="mt-1 text-[11px] text-muted-foreground">{selectedScene.targetDurationSeconds}s target · {selectedScene.locationCode || 'No location'} · {sceneCharacters.length} scene characters</div></div><div className="flex gap-2">{shots.length === 0 && <form action={createBasicShotListAction.bind(null, projectId, episode.id, selectedScene.id)}><Button type="submit" variant="outline"><Clapperboard size={11} /> Create Basic Shot List</Button></form>}<ShotFormSheet projectId={projectId} episodeId={episode.id} scene={selectedScene} locations={locations} /></div></section>

        <AIShotListPanel
          projectId={projectId}
          episodeId={episode.id}
          scene={selectedScene}
          sceneCharacters={sceneCharacters}
          costumes={costumes}
          activeShotCount={shots.length}
          history={shotListHistory}
          selectedGeneration={selectedShotGeneration}
          aiConfigured={aiConfigured}
          hasPreviousScene={scenes.findIndex(item => item.id === selectedScene.id) > 0}
          hasNextScene={scenes.findIndex(item => item.id === selectedScene.id) < scenes.length - 1}
          notice={notice}
          error={error}
        />

        {shots.length === 0 ? <div className="rounded-2xl border border-dashed p-16 text-center"><Film size={24} className="mx-auto mb-3 text-amber-400" /><h3 className="text-sm font-semibold">No shots in this scene</h3><p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">Create a shot manually or start with three deterministic draft shots.</p></div> : shots.map((shot, index) => {
          const assignments = shotAssignments.filter(item => item.shotId === shot.id)
          const shotIssues = issues.filter(item => item.shotId === shot.id)
          const placeholderJob = jobs.find(item => item.shotId === shot.id && item.jobType === 'Storyboard Placeholder' && item.status === 'Completed')
          const imageJobs = jobs.filter(item => item.shotId === shot.id && item.jobType === 'Storyboard Image')
          const imageJob = imageJobs[0]
          const completedImageJob = imageJobs.find(item => item.status === 'Completed')
          const storyboardImage = storyboardImageOutput(completedImageJob)
          const videoJobs = jobs.filter(item => item.shotId === shot.id && item.jobType === 'Shot Video')
          const latestVideoJob = videoJobs[0]
          const completedVideoJob = videoJobs.find(item => item.status === 'Completed')
          const completedVideo = shotVideoOutput(completedVideoJob)
          const latestVideoInput = latestVideoJob?.inputSnapshot as Record<string, unknown> | undefined
          const motionPrompt = typeof latestVideoInput?.prompt === 'string'
            ? latestVideoInput.prompt
            : null
          const videoActive = Boolean(
            latestVideoJob && ['Queued', 'Submitted', 'Running'].includes(latestVideoJob.status),
          )
          return <article id={`shot-${shot.id}`} key={shot.id} className={cn('rounded-xl border bg-card p-4', selectedShotId === shot.id && 'border-amber-400 bg-amber-500/5')}>
            <div className="grid gap-4 xl:grid-cols-[230px_1fr]">
              <ShotVideoPreview
                projectId={projectId}
                latestJob={latestVideoJob}
                completedJob={completedVideoJob}
                pollIntervalSeconds={videoAIStatus.pollIntervalSeconds}
                shotTitle={shot.title}
              />
              <div>
                <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] text-amber-400">Scene {selectedScene.sceneNumber} · Shot {String(shot.shotNumber).padStart(2, '0')} · Position {shot.position}</div><h3 className="text-sm font-semibold">{shot.title}</h3><div className="mt-1 text-[11px] text-muted-foreground">{shot.locationCode || 'No location'} · {shot.targetDurationSeconds}s · {assignments.length} characters</div></div><div className="flex flex-wrap justify-end"><ShotFormSheet projectId={projectId} episodeId={episode.id} scene={selectedScene} locations={locations} shot={shot} /><form action={duplicateShotAction.bind(null, projectId, episode.id, shot.id)}><Button type="submit" size="sm" variant="ghost" title="Duplicate"><Copy size={11} /></Button></form><form action={archiveShotAction.bind(null, projectId, episode.id, shot.id)}><Button type="submit" size="sm" variant="ghost" title="Archive"><Archive size={11} /></Button></form><ShotDeleteDialog projectId={projectId} episodeId={episode.id} shot={shot} /></div></div>
                <p className="mt-3 text-xs text-muted-foreground">{shot.description || shot.action || 'No shot description yet.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]"><span className="rounded-full border px-2 py-1">{shot.status}</span><span className="rounded-full border px-2 py-1">{shot.approvalStatus}</span><span className={cn('rounded-full border px-2 py-1', shotIssues.some(item => item.severity === 'Error') ? 'text-red-400' : shotIssues.length ? 'text-amber-400' : 'text-green-400')}>{shotIssues.length} issues</span></div>
                <div className="mt-4 rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold">Shot characters</div><div className="flex gap-2">{sceneCharacters.length > 0 && <AddSceneCharactersSheet projectId={projectId} episodeId={episode.id} shotId={shot.id} sceneCharacters={sceneCharacters} />}<ShotCharacterSheet projectId={projectId} episodeId={episode.id} shotId={shot.id} sceneCharacters={sceneCharacters} costumes={costumes} /></div></div><div className="mt-2 space-y-2">{assignments.length === 0 ? <div className="text-[11px] text-muted-foreground">No characters assigned.</div> : assignments.map(item => <div key={item.id} className="flex items-center gap-2 rounded bg-muted/30 p-2"><div className="flex-1 text-[11px]"><strong>{item.characterCode} · {item.characterName}</strong> <span className="text-muted-foreground">· {item.characterStatus}</span><div className="text-muted-foreground">{item.costumeCode || 'No costume'} · {item.costumeName || 'Unassigned'} · {item.screenPosition || 'Position unspecified'} · {item.expression || 'Expression unspecified'}</div></div><ShotCharacterSheet projectId={projectId} episodeId={episode.id} shotId={shot.id} sceneCharacters={sceneCharacters} costumes={costumes} assignment={item} /><form action={removeShotCharacterAction.bind(null, projectId, episode.id, shot.id, item.id)}><Button type="submit" size="sm" variant="ghost" className="text-red-400">Remove</Button></form></div>)}</div></div>
                {shotIssues.length > 0 && <div className="mt-3 space-y-1">{shotIssues.map(item => <div key={item.id} className={cn('rounded px-2 py-1.5 text-[10px]', item.severity === 'Error' ? 'bg-red-500/5 text-red-400' : item.severity === 'Warning' ? 'bg-amber-500/5 text-amber-400' : 'bg-blue-500/5 text-blue-400')}><strong>{item.ruleCode}</strong> · {item.description}{item.suggestedAction ? ` · ${item.suggestedAction}` : ''}</div>)}</div>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={generateShotVideoAction.bind(null, projectId, episode.id, shot.id)}>
                    <ShotVideoSubmitButton
                      configured={imageAIStatus.configured && videoAIStatus.configured}
                      hasKeyframe={Boolean(storyboardImage)}
                      hasVideo={Boolean(completedVideo)}
                      active={videoActive}
                    />
                  </form>
                  <form action={moveShotAction.bind(null, projectId, episode.id, selectedScene.id, shot.id, 'up')}><Button type="submit" size="sm" variant="outline" disabled={index === 0}><ArrowUp size={10} /></Button></form>
                  <form action={moveShotAction.bind(null, projectId, episode.id, selectedScene.id, shot.id, 'down')}><Button type="submit" size="sm" variant="outline" disabled={index === shots.length - 1}><ArrowDown size={10} /></Button></form>
                  <form action={setShotApprovalAction.bind(null, projectId, episode.id, shot.id, shot.approvalStatus === 'Approved' ? 'Draft' : 'Approved')}><Button type="submit" size="sm" variant="outline">{shot.approvalStatus === 'Approved' ? 'Unapprove' : 'Approve'}</Button></form>
                  <form action={inheritSceneLocationAction.bind(null, projectId, episode.id, shot.id)}><Button type="submit" size="sm" variant="outline"><MapPin size={10} /> Inherit Scene Location</Button></form>
                </div>
                <details className="mt-4 rounded-lg border bg-muted/10 p-3">
                  <summary className="cursor-pointer text-[11px] font-semibold">Advanced Settings</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]">
                    <div>
                      {storyboardImage
                        ? <div className="overflow-hidden rounded-lg border bg-black">
                            <img src={storyboardImage.storageUrl} alt={`Keyframe for ${shot.title}`} className="aspect-video w-full object-contain" />
                            <div className="border-t bg-card px-2 py-1.5 text-[9px] text-muted-foreground">Qwen · {storyboardImage.generationModel} · Keyframe</div>
                          </div>
                        : <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed text-[9px] text-muted-foreground">{placeholderJob ? 'Development placeholder only' : 'No keyframe generated'}</div>}
                    </div>
                    <div className="space-y-2 text-[10px] text-muted-foreground">
                      <div><strong className="text-foreground">Camera:</strong> {shot.shotType} · {shot.cameraAngle} · {shot.cameraMovement} · {shot.lens}</div>
                      <div><strong className="text-foreground">Composition:</strong> {shot.composition || 'Not specified'}</div>
                      <div><strong className="text-foreground">Lighting:</strong> {shot.lightingNotes || 'Not specified'}</div>
                      <div><strong className="text-foreground">Negative prompt:</strong> {shot.negativePrompt || 'Default provider safety prompt'}</div>
                      <div><strong className="text-foreground">Motion prompt:</strong> {motionPrompt || 'Generated automatically when video generation starts'}</div>
                      <div><strong className="text-foreground">Composition lock:</strong> {shot.compositionLocked ? 'Locked' : 'Unlocked'}</div>
                      <div><strong className="text-foreground">Video provider:</strong> Wan · {videoAIStatus.model} · {videoAIStatus.resolution}</div>
                    </div>
                  </div>
                  {imageJob?.status === 'Failed' && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">{imageJob.errorMessage || 'Storyboard image generation failed safely.'}</div>}
                  {shot.generationPrompt && <div className="mt-3 rounded-lg bg-muted/30 p-3"><div className="flex items-center justify-between"><div className="text-[10px] font-semibold">Deterministic prompt context</div><Button type="button" size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(shot.generationPrompt || '')}><Copy size={10} /> Copy Prompt</Button></div><pre className="mt-2 max-h-28 overflow-hidden whitespace-pre-wrap text-[9px] text-muted-foreground">{shot.generationPrompt}</pre></div>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={generateStoryboardImageAction.bind(null, projectId, episode.id, shot.id)}><StoryboardImageSubmitButton configured={imageAIStatus.configured} regenerate={Boolean(storyboardImage)} /></form>
                    <form action={buildShotPromptAction.bind(null, projectId, episode.id, shot.id)}><Button type="submit" size="sm" variant="outline"><RefreshCw size={10} /> Build Prompt</Button></form>
                    <form action={setCompositionLockAction.bind(null, projectId, episode.id, shot.id, !shot.compositionLocked)}><Button type="submit" size="sm" variant="outline">{shot.compositionLocked ? <Unlock size={10} /> : <Lock size={10} />}{shot.compositionLocked ? 'Unlock' : 'Lock Composition'}</Button></form>
                    <form action={createStoryboardPlaceholderAction.bind(null, projectId, episode.id, shot.id)}><Button type="submit" size="sm" variant="ghost">Create Placeholder (development)</Button></form>
                  </div>
                </details>
              </div>
            </div>
          </article>
        })}
        {archivedShots.length > 0 && <section className="rounded-xl border border-dashed p-4"><h3 className="text-xs font-semibold">Archived shots</h3><div className="mt-2 space-y-2">{archivedShots.filter(item => item.sceneId === selectedScene.id).map(shot => <div key={shot.id} className="flex items-center justify-between rounded bg-muted/30 p-3 text-xs"><span>Shot {shot.shotNumber} · {shot.title}</span><div className="flex"><form action={restoreShotAction.bind(null, projectId, episode.id, shot.id)}><Button type="submit" size="sm" variant="outline">Restore</Button></form><ShotDeleteDialog projectId={projectId} episodeId={episode.id} shot={shot} /></div></div>)}</div></section>}
      </main>
    </div>
  </div></div>
}
