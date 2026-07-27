'use client'

import Link from 'next/link'
import { AlertTriangle, BookOpen, CheckCircle2, Clapperboard, Film, MapPin, Plus, Shirt, TrendingUp, Tv2, Users, Zap } from 'lucide-react'
import type { AssetReadiness } from '@/lib/assets/readiness'
import type { ProjectEpisodeOverview } from '@/lib/episodes/project-overview'
import type { ProjectDto } from '@/lib/projects/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export function OverviewPage({ project, assetReadiness, episodeOverview }: { project: ProjectDto; assetReadiness: AssetReadiness; episodeOverview: ProjectEpisodeOverview }) {
  const approvedAssets = assetReadiness.characters.approved + assetReadiness.costumes.approved + assetReadiness.locations.approved
  const totalAssets = assetReadiness.characters.total + assetReadiness.costumes.total + assetReadiness.locations.total
  const assetFoundationReady = assetReadiness.nextAction.tab === 'story-bible'
  const firstEpisode = episodeOverview.items[0]

  const nextAction = !assetFoundationReady
    ? { title: assetReadiness.nextAction.title, detail: assetReadiness.nextAction.detail, href: `/projects/${project.id}/story-studio?tab=${assetReadiness.nextAction.tab}`, label: 'Open Story Studio' }
    : episodeOverview.total === 0
      ? { title: 'Create Episode 1', detail: 'The reusable asset foundation is ready. Start planning the first serialized episode.', href: `/projects/${project.id}/episodes/new`, label: 'Create Episode' }
      : firstEpisode?.sceneCount === 0
        ? { title: 'Add scenes to Episode 1', detail: 'Divide the episode into production-ready scene beats.', href: `/projects/${project.id}/episodes/${firstEpisode.episode.id}?tab=scenes`, label: 'Add Scenes' }
        : episodeOverview.errors > 0
          ? { title: 'Resolve continuity errors', detail: 'Blocking continuity errors must be resolved before production.', href: `/projects/${project.id}/episodes/${firstEpisode.episode.id}?tab=continuity`, label: 'Review Continuity' }
          : episodeOverview.items.some(item => item.episode.productionStatus === 'Ready for Production' && item.totalShots === 0)
            ? { title: 'Create the first shot list', detail: 'A production-ready episode needs ordered storyboard shots.', href: `/projects/${project.id}/production`, label: 'Open Production' }
            : episodeOverview.storyboardErrors > 0
              ? { title: 'Resolve storyboard errors', detail: 'Fix blocking shot and asset consistency issues.', href: `/projects/${project.id}/production`, label: 'Review Storyboard' }
              : episodeOverview.items.some(item => item.storyboardReady && item.episode.storyboardStatus !== 'Approved')
                ? { title: 'Approve the storyboard', detail: 'Every scene has complete, approved shot coverage.', href: `/projects/${project.id}/production`, label: 'Approve Storyboard' }
          : episodeOverview.items.some(item => item.readyForProduction && item.episode.productionStatus === 'Not Started')
            ? { title: 'Send a ready episode to Production', detail: 'Scene composition and continuity requirements are satisfied.', href: `/projects/${project.id}/episodes/${firstEpisode.episode.id}`, label: 'Review Readiness' }
            : episodeOverview.inProduction > 0
              ? { title: 'Open Production', detail: 'Continue with episodes already in the production queue.', href: `/projects/${project.id}/production`, label: 'Open Production' }
              : { title: 'Complete scene asset assignments', detail: 'Assign locations, characters, and costumes to every active scene.', href: `/projects/${project.id}/episodes/${firstEpisode.episode.id}?tab=scenes`, label: 'Open Scenes' }

  const workflow = [
    { label: 'Story Studio', icon: BookOpen, progress: totalAssets ? Math.round(approvedAssets / totalAssets * 100) : 0, summary: `${approvedAssets} / ${totalAssets} approved assets`, href: `/projects/${project.id}/story-studio` },
    { label: 'Episodes', icon: Tv2, progress: Math.min(100, Math.round(episodeOverview.total / project.episodeCount * 100)), summary: `${episodeOverview.total} / ${project.episodeCount} episodes created`, href: `/projects/${project.id}/episodes` },
    { label: 'Production', icon: Clapperboard, progress: episodeOverview.total ? Math.round(episodeOverview.storyboardsApproved / episodeOverview.total * 100) : 0, summary: `${episodeOverview.storyboardsStarted} started · ${episodeOverview.storyboardsApproved} approved`, href: `/projects/${project.id}/production` },
  ]

  const readiness = [
    ['Characters approved', `${assetReadiness.characters.approved} / ${assetReadiness.characters.total}`, Users],
    ['Costumes approved', `${assetReadiness.costumes.approved} / ${assetReadiness.costumes.total}`, Shirt],
    ['Locations approved', `${assetReadiness.locations.approved} / ${assetReadiness.locations.total}`, MapPin],
    ['Episodes created', String(episodeOverview.total), Tv2],
    ['Draft episodes', String(episodeOverview.draft), Film],
    ['Ready episodes', String(episodeOverview.ready), TrendingUp],
    ['In production', String(episodeOverview.inProduction), Clapperboard],
    ['Storyboards started', String(episodeOverview.storyboardsStarted), Clapperboard],
    ['Storyboards approved', String(episodeOverview.storyboardsApproved), CheckCircle2],
  ] as const

  return <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-6xl space-y-5 p-6">
    <header className="flex items-start gap-4"><div className="flex h-20 w-16 items-end rounded-lg bg-gradient-to-br from-red-900 to-amber-800 p-2"><Film size={16} /></div><div className="flex-1"><div className="flex items-center gap-2"><h1 className="text-xl font-bold">{project.name}</h1><Badge className="bg-green-400/10 text-green-400">{project.status}</Badge></div><div className="mt-1 text-xs text-muted-foreground">{project.genre} · {project.orientation} · Season {project.currentSeason} · {project.episodeCount} target episodes</div><div className="mt-3 flex gap-2"><Button render={<Link href={`/projects/${project.id}/episodes/new`} />} className="bg-amber-500 text-black hover:bg-amber-400"><Plus size={11} /> Create Episode</Button><Button variant="outline" render={<Link href={nextAction.href} />}>Continue Workflow</Button></div></div><div className="hidden text-right lg:block"><div className="text-2xl font-bold text-amber-400">{episodeOverview.errors + episodeOverview.warnings}</div><div className="text-[10px] text-muted-foreground">Continuity issues</div></div></header>

    <section><div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">MVP Workflow</div><div className="grid gap-3 md:grid-cols-3">{workflow.map(item => { const Icon = item.icon; return <Link key={item.label} href={item.href} className="rounded-xl border bg-card p-4 hover:border-amber-500/30"><div className="flex items-center gap-2 text-xs font-semibold"><Icon size={14} />{item.label}</div><div className="mt-3 text-2xl font-bold">{item.progress}%</div><Progress value={item.progress} className="my-2 h-1" /><div className="text-[11px] text-muted-foreground">{item.summary}</div></Link> })}</div></section>

    <div className="grid gap-5 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2">
      <section className="rounded-xl border border-amber-500/30 bg-card p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Zap size={13} className="text-amber-400" />Next Recommended Action</div><h2 className="text-sm font-semibold">{nextAction.title}</h2><p className="mb-4 mt-1 text-xs text-muted-foreground">{nextAction.detail}</p><Button render={<Link href={nextAction.href} />} className="bg-amber-500 text-black hover:bg-amber-400">{nextAction.label}</Button></section>
      <section><div className="mb-2 flex items-center justify-between"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Episodes</div><Link href={`/projects/${project.id}/episodes`} className="text-[11px] text-amber-400">View all →</Link></div><div className="space-y-2">{episodeOverview.items.slice(0, 3).length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">No episodes created yet.</div> : episodeOverview.items.slice(0, 3).map(item => <Link key={item.episode.id} href={`/projects/${project.id}/episodes/${item.episode.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-amber-500/20"><div className="rounded bg-muted px-3 py-2 text-xs font-bold">{String(item.episode.episodeNumber).padStart(2, '0')}</div><div className="flex-1"><div className="text-sm font-medium">{item.episode.title}</div><div className="mt-1 text-[11px] text-muted-foreground">{item.sceneCount} scenes · Readiness {item.readinessScore}% · {item.episode.productionStatus}</div></div>{item.errorCount + item.warningCount > 0 && <span className="flex items-center gap-1 text-[10px] text-amber-400"><AlertTriangle size={10} />{item.errorCount + item.warningCount}</span>}</Link>)}</div></section>
    </div><div className="space-y-5">
      <section className="rounded-xl border bg-card p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold"><TrendingUp size={13} />MVP Readiness</div><div className="space-y-2.5">{readiness.map(([label, value, Icon]) => <div key={label} className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon size={11} />{label}</span><span className="text-[11px] font-medium">{value}</span></div>)}</div></section>
      <section className="rounded-xl border bg-card p-4"><div className="text-xs font-semibold">Continuity</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-red-500/5 p-3"><div className="text-xl font-bold text-red-400">{episodeOverview.errors}</div><div className="text-[10px] text-muted-foreground">Errors</div></div><div className="rounded-lg bg-amber-500/5 p-3"><div className="text-xl font-bold text-amber-400">{episodeOverview.warnings}</div><div className="text-[10px] text-muted-foreground">Warnings</div></div></div><Button variant="outline" render={<Link href={`/projects/${project.id}/episodes`} />} className="mt-3 w-full">Review Episodes</Button></section>
    </div></div>
  </div></div>
}
