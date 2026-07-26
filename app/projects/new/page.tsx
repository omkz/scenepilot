import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProjectsShell } from '@/components/projects/projects-shell'
import { ProjectForm } from '@/components/projects/project-form'

export default function NewProjectPage() {
  return (
    <ProjectsShell>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5">
          <ChevronLeft size={12} /> Back to Projects
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Project</h1>
          <p className="text-sm text-muted-foreground mt-1">Set the foundation for a new serialized short drama.</p>
        </div>
        <ProjectForm />
      </main>
    </ProjectsShell>
  )
}
