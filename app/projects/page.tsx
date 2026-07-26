import Link from 'next/link'
import { Archive, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { listProjects } from '@/lib/db/queries/projects'
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/projects/types'
import { ProjectsShell } from '@/components/projects/projects-shell'
import { ProjectCard } from '@/components/projects/project-card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface ProjectsPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    archived?: string
  }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams
  const archived = params.archived === '1'
  const status = PROJECT_STATUSES.includes(params.status as ProjectStatus)
    ? params.status as ProjectStatus
    : undefined
  const projects = await listProjects({
    archiveView: archived ? 'archived' : 'active',
    search: params.q,
    status,
  })

  return (
    <ProjectsShell>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">Build and manage serialized short-drama productions.</p>
          </div>
          <Button render={<Link href="/projects/new" />} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Plus size={14} className="mr-1.5" /> New Project
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <form className="flex flex-1 gap-2">
            {archived && <input type="hidden" name="archived" value="1" />}
            <div className="flex flex-1 items-center gap-2 bg-card border border-border rounded-lg px-3">
              <Search size={13} className="text-muted-foreground" />
              <input name="q" defaultValue={params.q} placeholder="Search projects…" className="h-9 flex-1 bg-transparent text-xs outline-none" />
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3">
              <SlidersHorizontal size={13} className="text-muted-foreground" />
              <select name="status" defaultValue={status || ''} className="h-9 bg-transparent text-xs outline-none">
                <option value="">All statuses</option>
                {PROJECT_STATUSES.map(value => <option key={value}>{value}</option>)}
              </select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
          <Button variant={archived ? 'secondary' : 'outline'} render={<Link href={archived ? '/projects' : '/projects?archived=1'} />}>
            <Archive size={13} className="mr-1.5" />
            {archived ? 'View active' : 'View archived'}
          </Button>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(project => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-2xl py-20 px-6 text-center bg-card/30">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={20} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">{archived ? 'No archived projects' : 'Create your first short drama'}</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
              {archived
                ? 'Archived projects will appear here and can be restored at any time.'
                : 'Set up the story format, episode count, and production orientation before creating characters and episodes.'}
            </p>
            {!archived && (
              <Button render={<Link href="/projects/new" />} className="mt-5 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                Create Project
              </Button>
            )}
          </div>
        )}
      </main>
    </ProjectsShell>
  )
}
