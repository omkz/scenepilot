'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Archive, Clock, Film, Plus, Search, Users } from 'lucide-react'
import { archiveEpisodeAction, restoreEpisodeAction } from '@/app/projects/[projectId]/episodes/actions'
import type { EpisodeDto } from '@/lib/episodes/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EpisodeDeleteDialog } from '@/components/episodes/episode-delete-dialog'

export interface EpisodeListItem {
  episode: EpisodeDto
  sceneCount: number
  characterCount: number
  warningCount: number
}

type Filter = 'all' | 'draft' | 'ready' | 'in-production' | 'completed'

export function EpisodesPage({ projectId, items, archived }: { projectId: string; items: EpisodeListItem[]; archived: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => items.filter(({ episode }) => {
    if (search.trim() && !`${episode.title} ${episode.episodeNumber}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'draft') return ['Draft', 'In Review'].includes(episode.status)
    if (filter === 'ready') return ['Ready', 'Approved'].includes(episode.status) && episode.productionStatus === 'Not Started'
    if (filter === 'in-production') return ['Ready for Production', 'In Production'].includes(episode.productionStatus)
    if (filter === 'completed') return ['Completed', 'Published'].includes(episode.productionStatus)
    return true
  }), [filter, items, search])

  return (
    <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><h1 className="text-lg font-bold">Episodes</h1><p className="mt-1 text-xs text-muted-foreground">Plan episodes, compose scenes, and validate continuity before production.</p></div>
        <div className="flex gap-2">
          <Button variant={archived ? 'secondary' : 'outline'} render={<Link href={archived ? `/projects/${projectId}/episodes` : `/projects/${projectId}/episodes?archived=1`} />}><Archive size={12} /> {archived ? 'View active' : 'View archived'}</Button>
          {!archived && <Button render={<Link href={`/projects/${projectId}/episodes/new`} />} className="bg-amber-500 text-black hover:bg-amber-400"><Plus size={12} /> Create Episode</Button>}
        </div>
      </div>
      {!archived && <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3"><Search size={12} /><input value={search} onChange={event => setSearch(event.target.value)} className="h-9 flex-1 bg-transparent text-xs outline-none" placeholder="Search episodes…" /></div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">{(['all', 'draft', 'ready', 'in-production', 'completed'] as Filter[]).map(value => <button key={value} onClick={() => setFilter(value)} className={cn('rounded-md px-3 py-1.5 text-[11px] capitalize text-muted-foreground', filter === value && 'bg-card text-foreground')}>{value.replace('-', ' ')}</button>)}</div>
      </div>}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-20 text-center">
          <Film size={24} className="mx-auto mb-3 text-amber-400" /><h2 className="text-base font-semibold">{archived ? 'No archived episodes' : 'Plan your first episode'}</h2>
          <p className="mx-auto mt-2 max-w-lg text-xs text-muted-foreground">{archived ? 'Archived episodes will appear here.' : 'Create an episode outline, divide it into scenes, and assign approved story assets before starting production.'}</p>
          {!archived && <div className="mt-5 flex justify-center gap-2"><Button render={<Link href={`/projects/${projectId}/episodes/new`} />} className="bg-amber-500 text-black hover:bg-amber-400">Create Episode</Button><Button variant="outline" render={<Link href={`/projects/${projectId}/story-studio`} />}>Open Story Studio</Button></div>}
        </div>
      ) : <div className="space-y-3">{filtered.map(({ episode, sceneCount, characterCount, warningCount }) => (
        <article key={episode.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">{String(episode.episodeNumber).padStart(2, '0')}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">Episode {String(episode.episodeNumber).padStart(2, '0')} · {episode.title}</h2><span className="rounded-full border px-1.5 py-0.5 text-[10px]">{episode.status}</span><span className="rounded-full border border-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">{episode.productionStatus}</span></div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{episode.summary || 'No summary yet.'}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Clock size={10} />{episode.targetDurationSeconds}s</span><span>{sceneCount} scenes</span><span className="flex items-center gap-1"><Users size={10} />{characterCount} characters</span><span>{warningCount} continuity issues</span><span>Updated {new Date(episode.updatedAt).toLocaleDateString()}</span></div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            {!archived ? <><Button size="sm" render={<Link href={`/projects/${projectId}/episodes/${episode.id}`} />}>Open</Button><form action={archiveEpisodeAction.bind(null, projectId, episode.id)}><Button type="submit" size="sm" variant="ghost" className="w-full">Archive</Button></form></> : <form action={restoreEpisodeAction.bind(null, projectId, episode.id)}><Button type="submit" size="sm" variant="outline">Restore</Button></form>}
            <EpisodeDeleteDialog projectId={projectId} episode={episode} />
          </div>
        </div></article>
      ))}</div>}
    </div></div>
  )
}
