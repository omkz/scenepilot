'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GENERATION_JOBS } from '@/lib/mock-data'
import { X, Pause, XCircle, Activity, Film, Video, Mic, ShieldCheck } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const JOB_ICONS = {
  storyboard: Film,
  video: Video,
  voice: Mic,
  continuity: ShieldCheck,
}

const STATUS_COLORS = {
  running: 'text-amber-400',
  queued: 'text-blue-400',
  paused: 'text-muted-foreground',
  completed: 'text-green-400',
  failed: 'text-destructive',
}

interface QueuePanelProps {
  open: boolean
  onClose: () => void
}

export function QueuePanel({ open, onClose }: QueuePanelProps) {
  const [jobs, setJobs] = useState(GENERATION_JOBS)

  const pauseJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: j.status === 'paused' ? 'running' : 'paused' as const } : j))
  }

  const cancelJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  if (!open) return null

  return (
    <div className="absolute right-0 top-11 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-400" />
          <span className="text-xs font-semibold">Generation Queue</span>
          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-amber-500/30">
            {jobs.filter(j => j.status === 'running').length} active
          </Badge>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Jobs */}
      <div className="max-h-80 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">No active generation jobs</div>
        ) : (
          jobs.map(job => {
            const Icon = JOB_ICONS[job.type]
            return (
              <div key={job.id} className="px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={12} className={STATUS_COLORS[job.status]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground truncate">{job.label}</span>
                      <span className={cn('text-[10px] font-medium capitalize shrink-0', STATUS_COLORS[job.status])}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-1.5">
                      {job.episodeTitle} · Started {job.startedAt}
                    </div>
                    {job.status !== 'queued' && (
                      <div className="flex items-center gap-2">
                        <Progress value={job.progress} className="flex-1 h-1" />
                        <span className="text-[10px] text-muted-foreground shrink-0">{job.progress}%</span>
                      </div>
                    )}
                    {job.status === 'queued' && (
                      <div className="text-[10px] text-muted-foreground">Waiting for available slot...</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {job.status !== 'queued' && (
                      <button
                        onClick={() => pauseJob(job.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={job.status === 'paused' ? 'Resume' : 'Pause'}
                      >
                        <Pause size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Cancel"
                    >
                      <XCircle size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border">
        <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
          View full queue →
        </button>
      </div>
    </div>
  )
}
