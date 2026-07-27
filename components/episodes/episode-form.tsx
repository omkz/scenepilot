'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { LoaderCircle, Save } from 'lucide-react'
import { createEpisodeAction, updateEpisodeAction, type EpisodeActionState } from '@/app/projects/[projectId]/episodes/actions'
import { EPISODE_STATUSES, type EpisodeDto, type EpisodeTab } from '@/lib/episodes/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const ErrorText = ({ errors }: { errors?: string[] }) => errors?.[0] ? <p className="mt-1 text-[11px] text-red-400">{errors[0]}</p> : null
function Submit() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending} className="bg-amber-500 text-black hover:bg-amber-400">{pending ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />} {pending ? 'Saving…' : 'Save Episode'}</Button> }

export function EpisodeForm({ projectId, episode, defaultDuration, returnTab = 'overview' }: { projectId: string; episode?: EpisodeDto; defaultDuration: number; returnTab?: EpisodeTab }) {
  const action = episode ? updateEpisodeAction.bind(null, projectId, episode.id) : createEpisodeAction.bind(null, projectId)
  const [state, formAction] = useActionState<EpisodeActionState, FormData>(action, {})
  return <form action={formAction} className="space-y-5">
    <input type="hidden" name="productionStatus" value={episode?.productionStatus || 'Not Started'} /><input type="hidden" name="returnTab" value={returnTab} />
    {state.message && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{state.message}</div>}
    <label className="block"><span className="text-xs font-medium">Title</span><Input name="title" defaultValue={episode?.title} maxLength={150} required className="mt-1.5" /><ErrorText errors={state.errors?.title} /></label>
    <label className="block"><span className="text-xs font-medium">Summary</span><Textarea name="summary" defaultValue={episode?.summary || ''} maxLength={2000} className="mt-1.5 min-h-24" /></label>
    <div className="grid grid-cols-2 gap-4"><label><span className="text-xs font-medium">Target duration (seconds)</span><Input name="targetDurationSeconds" type="number" min={15} max={600} defaultValue={episode?.targetDurationSeconds || defaultDuration} className="mt-1.5" /><ErrorText errors={state.errors?.targetDurationSeconds} /></label><label><span className="text-xs font-medium">Story status</span><select name="status" defaultValue={episode?.status || 'Draft'} className="mt-1.5 h-8 w-full rounded-lg border border-border bg-card px-2 text-sm">{EPISODE_STATUSES.filter(value => value !== 'Archived').map(value => <option key={value}>{value}</option>)}</select></label></div>
    <label className="block"><span className="text-xs font-medium">Outline</span><Textarea name="outline" defaultValue={episode?.outline || ''} maxLength={10000} className="mt-1.5 min-h-32" /></label>
    <label className="block"><span className="text-xs font-medium">Cliffhanger</span><Textarea name="cliffhanger" defaultValue={episode?.cliffhanger || ''} maxLength={2000} className="mt-1.5 min-h-20" /></label>
    <input type="hidden" name="script" value={episode?.script || ''} />
    <div className="flex justify-end gap-2"><Button variant="outline" render={<Link href={episode ? `/projects/${projectId}/episodes/${episode.id}` : `/projects/${projectId}/episodes`} />}>Cancel</Button><Submit /></div>
  </form>
}
