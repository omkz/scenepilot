'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { LoaderCircle, Save } from 'lucide-react'
import { createProjectAction, updateProjectAction, type ProjectActionState } from '@/app/projects/actions'
import {
  EPISODE_DURATIONS,
  PROJECT_GENRES,
  PROJECT_LANGUAGES,
  PROJECT_ORIENTATIONS,
  PROJECT_STATUSES,
  type ProjectDto,
} from '@/lib/projects/types'
import { Button } from '@/components/ui/button'

const inputClassName = 'w-full h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-amber-500/50'

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.[0]) return null
  return <p className="text-[11px] text-red-400 mt-1">{errors[0]}</p>
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-9 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
    >
      {pending ? <LoaderCircle size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
      {pending ? 'Saving…' : editing ? 'Save Changes' : 'Create Project'}
    </Button>
  )
}

interface ProjectFormProps {
  project?: ProjectDto
}

export function ProjectForm({ project }: ProjectFormProps) {
  const action = project
    ? updateProjectAction.bind(null, project.id)
    : createProjectAction
  const [state, formAction] = useActionState<ProjectActionState, FormData>(action, {})
  const editing = Boolean(project)

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className={state.errors
          ? 'rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400'
          : 'rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-xs text-green-400'
        }>
          {state.message}
        </div>
      )}

      <section className="bg-card border border-border rounded-xl p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Basic information</h2>
          <p className="text-[11px] text-muted-foreground mt-1">Define the project identity and primary story language.</p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium">Project name</span>
            <input name="name" defaultValue={project?.name} required maxLength={100} className={`${inputClassName} mt-1.5`} placeholder="The Silent Crown" />
            <FieldError errors={state.errors?.name} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Description</span>
            <textarea name="description" defaultValue={project?.description || ''} maxLength={500} rows={4} className={`${inputClassName} h-auto py-2 mt-1.5 resize-none`} placeholder="A concise premise for the serialized drama." />
            <FieldError errors={state.errors?.description} />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="text-xs font-medium">Genre</span>
              <select name="genre" defaultValue={project?.genre || 'Thriller'} className={`${inputClassName} mt-1.5`}>
                {PROJECT_GENRES.map(value => <option key={value}>{value}</option>)}
              </select>
              <FieldError errors={state.errors?.genre} />
            </label>
            <label>
              <span className="text-xs font-medium">Primary language</span>
              <select name="primaryLanguage" defaultValue={project?.primaryLanguage || 'English'} className={`${inputClassName} mt-1.5`}>
                {PROJECT_LANGUAGES.map(value => <option key={value}>{value}</option>)}
              </select>
              <FieldError errors={state.errors?.primaryLanguage} />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Series format</h2>
          <p className="text-[11px] text-muted-foreground mt-1">Set production targets for the initial short-drama run.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>
            <span className="text-xs font-medium">Target episodes</span>
            <input name="episodeCount" type="number" min={1} max={500} defaultValue={project?.episodeCount || 30} className={`${inputClassName} mt-1.5`} />
            <FieldError errors={state.errors?.episodeCount} />
          </label>
          <label>
            <span className="text-xs font-medium">Average duration</span>
            <select name="episodeDuration" defaultValue={project?.episodeDuration || '1–2 minutes'} className={`${inputClassName} mt-1.5`}>
              {EPISODE_DURATIONS.map(value => <option key={value}>{value}</option>)}
            </select>
            <FieldError errors={state.errors?.episodeDuration} />
          </label>
          <label>
            <span className="text-xs font-medium">Orientation</span>
            <select name="orientation" defaultValue={project?.orientation || 'Vertical 9:16'} className={`${inputClassName} mt-1.5`}>
              {PROJECT_ORIENTATIONS.map(value => <option key={value}>{value}</option>)}
            </select>
            <FieldError errors={state.errors?.orientation} />
          </label>
        </div>
      </section>

      {project && (
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="text-xs font-medium">Status</span>
              <select name="status" defaultValue={project.status} className={`${inputClassName} mt-1.5`}>
                {PROJECT_STATUSES.map(value => <option key={value}>{value}</option>)}
              </select>
              <FieldError errors={state.errors?.status} />
            </label>
            <label>
              <span className="text-xs font-medium">Current season</span>
              <input name="currentSeason" type="number" min={1} defaultValue={project.currentSeason} className={`${inputClassName} mt-1.5`} />
              <FieldError errors={state.errors?.currentSeason} />
            </label>
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" render={<Link href={project ? `/projects/${project.id}/overview` : '/projects'} />}>
          Cancel
        </Button>
        <SubmitButton editing={editing} />
      </div>
    </form>
  )
}
