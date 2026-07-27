import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/db/queries/projects'
import { EpisodeForm } from '@/components/episodes/episode-form'

const durationDefaults: Record<string, number> = {
  '30–60 seconds': 60,
  '1–2 minutes': 120,
  '2–5 minutes': 300,
}

export default async function NewEpisodePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getProjectById(projectId)
  if (!project) notFound()
  return <div className="flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-3xl"><h1 className="text-lg font-bold">Create Episode</h1><p className="mb-6 mt-1 text-xs text-muted-foreground">Create the stable episode record before composing its scenes.</p><EpisodeForm projectId={projectId} defaultDuration={durationDefaults[project.episodeDuration] || 120} /></div></div>
}
