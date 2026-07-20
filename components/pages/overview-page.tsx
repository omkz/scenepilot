'use client'

import { cn } from '@/lib/utils'
import {
  ACTIVE_PROJECT,
  EPISODES,
  CONTINUITY_ISSUES,
  GENERATION_JOBS,
  ACTIVITY_FEED,
} from '@/lib/mock-data'
import { SidebarSection } from '@/components/layout/project-sidebar'
import {
  BookOpen,
  Tv2,
  Clapperboard,
  Upload,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Film,
  Video,
  Mic,
  ShieldCheck,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  Users,
  MapPin,
  Shirt,
  CheckSquare,
  Activity,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

const STAGE_ICONS = {
  'script-draft': Film,
  'storyboard-generation': Clapperboard,
  'video-rendering': Video,
  'voice-generation': Mic,
  editing: Film,
  completed: CheckCircle2,
  published: CheckCircle2,
}

const STAGE_LABELS: Record<string, string> = {
  'script-draft': 'Script Draft',
  'storyboard-generation': 'Storyboard Generation',
  'video-rendering': 'Video Rendering',
  'voice-generation': 'Voice Generation',
  editing: 'Editing',
  completed: 'Completed',
  published: 'Published',
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'text-green-400 bg-green-400/10 border-green-400/20',
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  draft: 'text-muted-foreground bg-muted border-border',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const JOB_ICONS = { storyboard: Clapperboard, video: Video, voice: Mic, continuity: ShieldCheck }

interface OverviewPageProps {
  onNavigate: (section: SidebarSection) => void
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const activeEpisodes = EPISODES.slice(0, 3)
  const errors = CONTINUITY_ISSUES.filter(i => i.severity === 'error').length
  const warnings = CONTINUITY_ISSUES.filter(i => i.severity === 'warning').length

  const workflowStages = [
    { id: 'story-studio' as SidebarSection, label: 'Story Studio', icon: <BookOpen size={15} />, pct: ACTIVE_PROJECT.storyProgress, summary: '4 of 5 asset categories approved', action: 'Review Assets', color: 'text-blue-400' },
    { id: 'all-episodes' as SidebarSection, label: 'Episodes', icon: <Tv2 size={15} />, pct: ACTIVE_PROJECT.episodeProgress, summary: '6 of 40 episodes planned', action: 'View Episodes', color: 'text-amber-400' },
    { id: 'storyboards' as SidebarSection, label: 'Production', icon: <Clapperboard size={15} />, pct: ACTIVE_PROJECT.productionProgress, summary: '2 episodes in active production', action: 'Open Production', color: 'text-emerald-400' },
    { id: 'final-episodes' as SidebarSection, label: 'Export', icon: <Upload size={15} />, pct: ACTIVE_PROJECT.exportProgress, summary: '1 episode published', action: 'Go to Export', color: 'text-purple-400' },
  ]

  const readiness = [
    { label: 'Characters approved', value: '3 / 5', ok: false },
    { label: 'Costumes approved', value: '3 / 4', ok: false },
    { label: 'Locations approved', value: '4 / 5', ok: false },
    { label: 'Season plan progress', value: '60%', ok: false },
    { label: 'Episodes planned', value: '6 / 40', ok: false },
    { label: 'Episodes produced', value: '1 / 6', ok: false },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-5">

        {/* Project header */}
        <div className="flex items-start gap-4">
          <div className={cn('w-16 h-20 rounded-lg shrink-0 bg-gradient-to-br', ACTIVE_PROJECT.coverColor, 'flex items-end p-2')}>
            <Film size={16} className="text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground">{ACTIVE_PROJECT.name}</h1>
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-400/10 text-green-400 border-green-400/20">Active</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>{ACTIVE_PROJECT.format}</span>
              <span>·</span>
              <span>{ACTIVE_PROJECT.orientation}</span>
              <span>·</span>
              <span>Season {ACTIVE_PROJECT.currentSeason}</span>
              <span>·</span>
              <span>Updated {ACTIVE_PROJECT.lastUpdated}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                <Plus size={11} className="mr-1" /> Create Episode
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                <Play size={11} className="mr-1" /> Continue Workflow
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                More actions
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{ACTIVE_PROJECT.totalEpisodes}</div>
              <div className="text-[10px] text-muted-foreground">Planned</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-foreground">{ACTIVE_PROJECT.completedEpisodes}</div>
              <div className="text-[10px] text-muted-foreground">Produced</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-amber-400">{errors + warnings}</div>
              <div className="text-[10px] text-muted-foreground">Issues</div>
            </div>
          </div>
        </div>

        {/* Workflow pipeline */}
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2.5 font-medium">Project Workflow</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {workflowStages.map((stage, i) => (
              <div
                key={stage.id}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors group"
                onClick={() => onNavigate(stage.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium', stage.color)}>
                    {stage.icon}
                    {stage.label}
                  </span>
                  {i < 3 && <ChevronRight size={12} className="text-muted-foreground hidden lg:block" />}
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{stage.pct}%</div>
                <Progress value={stage.pct} className="h-1 mb-2" />
                <div className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{stage.summary}</div>
                <button className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  {stage.action} <ArrowRight size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left column: Next action + Episodes */}
          <div className="lg:col-span-2 space-y-5">

            {/* Next recommended action */}
            <div className="bg-card border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} className="text-amber-400" />
                <span className="text-xs font-semibold text-foreground">Next Recommended Action</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">
                Approve the remaining main character and location assets before generating Episode 1.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Tobias Renard (pending)', 'Lira Doss (draft)', 'Signal Relay Station (pending)'].map(req => (
                  <span key={req} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    <AlertTriangle size={9} className="text-amber-400" />
                    {req}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                  onClick={() => onNavigate('assets')}>
                  Review Assets
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-border"
                  onClick={() => onNavigate('storyboards')}>
                  Skip to Production
                </Button>
              </div>
            </div>

            {/* Active Episodes */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Active Episodes</div>
                <button onClick={() => onNavigate('all-episodes')} className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors">
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {activeEpisodes.map(ep => {
                  const Icon = STAGE_ICONS[ep.stage] || Film
                  return (
                    <div key={ep.id} className="bg-card border border-border rounded-xl p-4 hover:border-amber-500/20 transition-colors group cursor-pointer"
                      onClick={() => onNavigate('all-episodes')}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-10 rounded bg-gradient-to-b from-muted to-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                          {String(ep.number).padStart(2, '0')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{ep.title}</span>
                            {ep.continuityWarnings > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                <AlertTriangle size={10} />
                                {ep.continuityWarnings}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Icon size={10} />
                              {STAGE_LABELS[ep.stage]}
                            </span>
                            {ep.duration !== '–' && (
                              <>
                                <span>·</span>
                                <span>{ep.duration}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{ep.lastUpdated}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={ep.progress} className="flex-1 h-1" />
                            <span className="text-[10px] text-muted-foreground shrink-0">{ep.progress}%</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-border shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Readiness */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold">Project Readiness</span>
              </div>
              <div className="space-y-2">
                {readiness.map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{r.label}</span>
                    <span className={cn('text-[11px] font-medium tabular-nums',
                      r.ok ? 'text-green-400' : 'text-foreground'
                    )}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Continuity issues */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold">Continuity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {errors > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-red-500/10 text-red-400 border-red-500/20">
                      {errors} errors
                    </Badge>
                  )}
                  {warnings > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
                      {warnings} warnings
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {CONTINUITY_ISSUES.map(issue => (
                  <div key={issue.id} className={cn(
                    'flex items-start gap-2 p-2.5 rounded-lg text-xs',
                    issue.severity === 'error' ? 'bg-red-500/5 border border-red-500/15' : 'bg-amber-500/5 border border-amber-500/15'
                  )}>
                    <AlertTriangle size={11} className={issue.severity === 'error' ? 'text-red-400 shrink-0 mt-0.5' : 'text-amber-400 shrink-0 mt-0.5'} />
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">{issue.episodeTitle}</div>
                      <p className="text-[11px] text-foreground leading-relaxed">{issue.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-border">
                  Review Issues
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                  <RefreshCw size={10} />
                </Button>
              </div>
            </div>

            {/* Generation jobs */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-amber-400" />
                  <span className="text-xs font-semibold">Generation Queue</span>
                </div>
                <span className="text-[10px] text-amber-400 font-medium">
                  {GENERATION_JOBS.filter(j => j.status === 'running').length} active
                </span>
              </div>
              <div className="space-y-3">
                {GENERATION_JOBS.map(job => {
                  const Icon = JOB_ICONS[job.type]
                  return (
                    <div key={job.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={11} className={job.status === 'running' ? 'text-amber-400' : 'text-muted-foreground'} />
                        <span className="text-[11px] text-foreground flex-1 truncate">{job.label}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{job.episodeTitle}</span>
                      </div>
                      {job.status === 'running' && (
                        <Progress value={job.progress} className="h-1" />
                      )}
                      {job.status === 'queued' && (
                        <div className="text-[10px] text-blue-400">Queued</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs font-semibold mb-3">Recent Activity</div>
              <div className="space-y-2.5">
                {ACTIVITY_FEED.map(item => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={10} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-foreground font-medium">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.detail}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
