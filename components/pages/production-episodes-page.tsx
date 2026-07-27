'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Clapperboard, Film, Video } from 'lucide-react'
import type { EpisodeOverviewItem } from '@/lib/episodes/project-overview'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function ProductionEpisodesPage({ projectId, items }: { projectId: string; items: EpisodeOverviewItem[] }) {
  const [view, setView] = useState<'storyboards' | 'generated'>('storyboards')
  const eligible = items.filter(item => ['Ready for Production', 'In Production', 'Completed', 'Published'].includes(item.episode.productionStatus))
  return <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-6xl p-6">
    <div className="mb-5"><h1 className="text-lg font-bold">Production</h1><p className="mt-1 text-xs text-muted-foreground">Episodes appear here only after passing readiness checks.</p></div>
    <div className="mb-5 inline-flex rounded-lg bg-muted p-1"><button onClick={() => setView('storyboards')} className={cn('rounded-md px-3 py-1.5 text-xs', view === 'storyboards' && 'bg-card')}>Storyboards</button><button onClick={() => setView('generated')} className={cn('rounded-md px-3 py-1.5 text-xs', view === 'generated' && 'bg-card')}>Generated Scenes</button></div>
    {eligible.length === 0 ? <div className="rounded-2xl border border-dashed p-16 text-center"><Clapperboard size={24} className="mx-auto mb-3 text-amber-400" /><h2 className="text-sm font-semibold">No episodes ready for production</h2><p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">Complete scene assignments and continuity checks, then send an eligible episode to Production.</p><Button render={<Link href={`/projects/${projectId}/episodes`} />} className="mt-4">Open Episodes</Button></div> : <div className="space-y-3">{eligible.map(item => <article key={item.episode.id} className="rounded-xl border bg-card p-4"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">{view === 'storyboards' ? <Film size={18} /> : <Video size={18} />}</div><div className="flex-1"><h2 className="text-sm font-semibold">Episode {String(item.episode.episodeNumber).padStart(2, '0')} · {item.episode.title}</h2><div className="mt-1 text-[11px] text-muted-foreground">{item.episode.productionStatus} · {item.sceneCount} scenes · Readiness {item.readinessScore}%</div><div className="mt-2 text-xs text-muted-foreground">{view === 'storyboards' ? 'Storyboard not generated.' : 'Generated scenes unavailable.'}</div></div><Button size="sm" variant="outline" render={<Link href={`/projects/${projectId}/episodes/${item.episode.id}?tab=scenes`} />}>Open Episode</Button></div></article>)}</div>}
  </div></div>
}
