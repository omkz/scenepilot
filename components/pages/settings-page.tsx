import { Archive, AlertTriangle } from 'lucide-react'
import { archiveProjectAction } from '@/app/projects/actions'
import type { ProjectDto } from '@/lib/projects/types'
import { ProjectForm } from '@/components/projects/project-form'
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog'
import { Button } from '@/components/ui/button'

export function SettingsPage({ project, saved = false }: { project: ProjectDto; saved?: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold">Project Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Update the project foundation stored in PostgreSQL.</p>
        </div>

        {saved && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-xs text-green-400">
            Project settings saved.
          </div>
        )}

        <ProjectForm project={project} />

        <section className="mt-8 border border-red-500/20 bg-red-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-red-400" />
            <h2 className="text-sm font-semibold">Danger Zone</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-red-500/10">
            <div>
              <div className="text-xs font-medium">Archive project</div>
              <p className="text-[11px] text-muted-foreground mt-1">Hide this project from the active list. It can be restored later.</p>
            </div>
            <form action={archiveProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit" variant="outline" size="sm"><Archive size={12} className="mr-1" />Archive</Button>
            </form>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
            <div>
              <div className="text-xs font-medium">Delete permanently</div>
              <p className="text-[11px] text-muted-foreground mt-1">Delete this project record permanently. This cannot be undone.</p>
            </div>
            <DeleteProjectDialog projectId={project.id} projectName={project.name} />
          </div>
        </section>
      </div>
    </div>
  )
}
