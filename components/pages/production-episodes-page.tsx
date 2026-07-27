import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clapperboard, Film, Video } from 'lucide-react'
import type { ProductionEpisodeItem } from '@/lib/production/project-overview'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export function ProductionEpisodesPage({
  projectId,
  items,
  tab,
  approvedEpisodes,
  approvedScenes,
  approvedShots,
  placeholders,
}: {
  projectId: string
  items: ProductionEpisodeItem[]
  tab: 'storyboards' | 'generated-scenes'
  approvedEpisodes: number
  approvedScenes: number
  approvedShots: number
  placeholders: number
}) {
  return <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-6xl p-6">
    <div className="mb-5"><h1 className="text-lg font-bold">Production</h1><p className="mt-1 text-xs text-muted-foreground">Build persistent shot lists and approve storyboards before visual generation.</p></div>
    <div className="mb-5 inline-flex rounded-lg bg-muted p-1"><Link href={`/projects/${projectId}/production?tab=storyboards`} className={cn('rounded-md px-3 py-1.5 text-xs', tab === 'storyboards' && 'bg-card')}>Storyboards</Link><Link href={`/projects/${projectId}/production?tab=generated-scenes`} className={cn('rounded-md px-3 py-1.5 text-xs', tab === 'generated-scenes' && 'bg-card')}>Generated Scenes</Link></div>
    {tab === 'generated-scenes' ? <div className="rounded-2xl border border-dashed p-16 text-center"><Video size={26} className="mx-auto mb-3 text-amber-400" /><h2 className="text-base font-semibold">Visual generation is not connected yet</h2><p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">Approved storyboards will appear here when image and video generation providers are integrated.</p><div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">{[['Approved episodes', approvedEpisodes], ['Approved scenes', approvedScenes], ['Approved shots', approvedShots], ['Placeholders', placeholders]].map(([label, count]) => <div key={String(label)} className="rounded-xl border bg-card p-4"><div className="text-xl font-bold">{count}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>)}</div></div> :
      items.length === 0 ? <div className="rounded-2xl border border-dashed p-16 text-center"><Clapperboard size={24} className="mx-auto mb-3 text-amber-400" /><h2 className="text-sm font-semibold">No episodes are ready for production</h2><p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">Complete the episode scenes, asset assignments, and continuity review before sending an episode to Production.</p><div className="mt-4 flex justify-center gap-2"><Button render={<Link href={`/projects/${projectId}/episodes`} />}>Open Episodes</Button><Button variant="outline" render={<Link href={`/projects/${projectId}/episodes`} />}>Review Continuity Requirements</Button></div></div> :
        <div className="space-y-3">{items.map(({ episode, storyboard }) => <article key={episode.id} className="rounded-xl border bg-card p-4"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted"><Film size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">Episode {String(episode.episodeNumber).padStart(2, '0')} · {episode.title}</h2><span className="rounded-full border px-2 py-0.5 text-[10px]">{episode.status}</span><span className="rounded-full border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">{episode.productionStatus}</span></div><div className="mt-1 text-[11px] text-muted-foreground">{storyboard.totalScenes} scenes · {storyboard.totalShots} shots · {storyboard.approvedShots} approved · Updated {new Date(episode.updatedAt).toLocaleDateString()}</div><div className="mt-2 flex items-center gap-3"><Progress value={storyboard.score} className="h-1 max-w-xs" /><span className="text-[10px]">{storyboard.score}%</span><span className="flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle size={9} />{storyboard.totalErrors}</span><span className="flex items-center gap-1 text-[10px] text-amber-400"><AlertTriangle size={9} />{storyboard.totalWarnings}</span>{episode.storyboardStatus === 'Approved' && <span className="flex items-center gap-1 text-[10px] text-green-400"><CheckCircle2 size={9} />Approved</span>}</div></div><Button size="sm" variant="outline" render={<Link href={`/projects/${projectId}/production/episodes/${episode.id}`} />}>Open Production</Button></div></article>)}</div>}
  </div></div>
}
