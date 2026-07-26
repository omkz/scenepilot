import Link from 'next/link'
import {
  Archive,
  CalendarDays,
  Clock3,
  Languages,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Tv2,
} from 'lucide-react'
import { archiveProjectAction, restoreProjectAction } from '@/app/projects/actions'
import type { ProjectDto } from '@/lib/projects/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog'

const STATUS_STYLES: Record<ProjectDto['status'], string> = {
  Draft: 'text-slate-300 bg-slate-400/10 border-slate-400/20',
  Active: 'text-green-400 bg-green-400/10 border-green-400/20',
  Paused: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Completed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Archived: 'text-muted-foreground bg-muted border-border',
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function ProjectCard({ project }: { project: ProjectDto }) {
  const archived = Boolean(project.archivedAt)

  return (
    <article className="bg-card border border-border rounded-xl overflow-hidden hover:border-amber-500/25 transition-colors">
      <div className="h-1 bg-gradient-to-r from-red-800 via-amber-700 to-transparent" />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold truncate">{project.name}</h2>
              <Badge className={cn('text-[9px] h-4 px-1.5', STATUS_STYLES[project.status])}>{project.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 min-h-10 line-clamp-2">
              {project.description || 'No project description yet.'}
            </p>
          </div>

          <details className="relative">
            <summary className="list-none w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer">
              <MoreHorizontal size={15} />
              <span className="sr-only">Project actions</span>
            </summary>
            <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl">
              {!archived && (
                <>
                  <Link href={`/projects/${project.id}/overview`} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent">
                    <Play size={12} /> Open
                  </Link>
                  <Link href={`/projects/${project.id}/settings`} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent">
                    <Pencil size={12} /> Edit
                  </Link>
                  <form action={archiveProjectAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <button type="submit" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent">
                      <Archive size={12} /> Archive
                    </button>
                  </form>
                </>
              )}
              {archived && (
                <form action={restoreProjectAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <button type="submit" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent">
                    <RotateCcw size={12} /> Restore
                  </button>
                </form>
              )}
              <DeleteProjectDialog projectId={project.id} projectName={project.name} compact />
            </div>
          </details>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><Tv2 size={11} />{project.genre}</span>
          <span className="flex items-center gap-1.5"><Languages size={11} />{project.primaryLanguage}</span>
          <span className="flex items-center gap-1.5"><CalendarDays size={11} />{project.episodeCount} episodes</span>
          <span className="flex items-center gap-1.5"><Clock3 size={11} />{project.episodeDuration}</span>
          <span>{project.orientation}</span>
          <span>Season {project.currentSeason}</span>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <span className="text-[10px] text-muted-foreground">Updated {formatUpdatedAt(project.updatedAt)}</span>
          {archived ? (
            <form action={restoreProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit" size="sm" variant="outline"><RotateCcw size={11} className="mr-1" />Restore</Button>
            </form>
          ) : (
            <Button size="sm" render={<Link href={`/projects/${project.id}/overview`} />}>
              Open Project
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
