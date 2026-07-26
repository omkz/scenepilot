'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ACTIVE_PROJECT,
  EPISODES,
  CONTINUITY_ISSUES,
} from '@/lib/mock-data'
import type { SidebarSection } from '@/lib/navigation'
import { sectionHref } from '@/lib/navigation'
import type { ProjectDto } from '@/lib/projects/types'
import type { AssetReadiness } from '@/lib/assets/readiness'
import {
  BookOpen,
  Tv2,
  Clapperboard,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  Film,
  Video,
  ShieldCheck,
  RefreshCw,
  Play,
  Users,
  MapPin,
  Shirt,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

const STAGE_LABELS: Record<string, string> = {
  'script-draft': 'Script Draft',
  'storyboard-generation': 'Storyboard',
  'video-rendering': 'Generated Scenes',
  'voice-generation': 'Generated Scenes',
  editing: 'Generated Scenes',
  completed: 'Completed',
  published: 'Completed',
}

const STAGE_ICONS: Record<string, typeof Film> = {
  'script-draft': Film,
  'storyboard-generation': Clapperboard,
  'video-rendering': Video,
  'voice-generation': Video,
  editing: Video,
  completed: CheckCircle2,
  published: CheckCircle2,
}

interface OverviewPageProps {
  project: ProjectDto
  assetReadiness: AssetReadiness
}

export function OverviewPage({ project, assetReadiness }: OverviewPageProps) {
  const router = useRouter()
  const onNavigate = (section: SidebarSection) => router.push(sectionHref(project.id, section))
  const activeEpisodes = EPISODES.slice(0, 3)
  const approvedCharacters = assetReadiness.characters.approved
  const approvedCostumes = assetReadiness.costumes.approved
  const approvedLocations = assetReadiness.locations.approved
  const totalAssets = assetReadiness.characters.total + assetReadiness.costumes.total + assetReadiness.locations.total
  const totalApprovedAssets = approvedCharacters + approvedCostumes + approvedLocations
  const inProduction = EPISODES.filter(item => item.productionStatus === 'in-progress').length
  const continuityCount = CONTINUITY_ISSUES.length
  const nextAction = assetReadiness.nextAction

  // Episode and production progress remain mock values until those milestones are persisted.
  const mockWorkflowMetrics = {
    episodeProgress: ACTIVE_PROJECT.episodeProgress,
    productionProgress: ACTIVE_PROJECT.productionProgress,
  }

  const workflowStages = [
    {
      id: 'story-studio' as SidebarSection,
      label: 'Story Studio',
      icon: <BookOpen size={15} />,
      progress: totalAssets === 0 ? 0 : Math.round((totalApprovedAssets / totalAssets) * 100),
      summary: `${totalApprovedAssets} / ${totalAssets} approved reusable assets`,
      color: 'text-blue-400',
    },
    {
      id: 'all-episodes' as SidebarSection,
      label: 'Episodes',
      icon: <Tv2 size={15} />,
      progress: mockWorkflowMetrics.episodeProgress,
      summary: `${EPISODES.length} episodes planned`,
      color: 'text-amber-400',
    },
    {
      id: 'storyboards' as SidebarSection,
      label: 'Production',
      icon: <Clapperboard size={15} />,
      progress: mockWorkflowMetrics.productionProgress,
      summary: `${inProduction} episodes in production`,
      color: 'text-emerald-400',
    },
  ]

  const readiness = [
    { label: 'Characters approved', value: `${approvedCharacters} / ${assetReadiness.characters.total}`, icon: Users },
    { label: 'Costumes approved', value: `${approvedCostumes} / ${assetReadiness.costumes.total}`, icon: Shirt },
    { label: 'Locations approved', value: `${approvedLocations} / ${assetReadiness.locations.total}`, icon: MapPin },
    { label: 'Story bible readiness', value: 'Ready', icon: BookOpen },
    { label: 'Planned episodes', value: String(EPISODES.length), icon: Tv2 },
    { label: 'In production', value: String(inProduction), icon: Clapperboard },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-20 rounded-lg shrink-0 bg-gradient-to-br from-red-900 to-amber-800 flex items-end p-2">
            <Film size={16} className="text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-400/10 text-green-400 border-green-400/20">{project.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
              <span>{project.genre}</span><span>·</span>
              <span>{project.orientation}</span><span>·</span>
              <span>Season {project.currentSeason}</span><span>·</span>
              <span>{project.episodeCount} target episodes</span><span>·</span>
              <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => onNavigate('all-episodes')}>
                <Plus size={11} className="mr-1" /> Create Episode
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-border"
                onClick={() => router.push(`/projects/${project.id}/story-studio?tab=${nextAction.tab}`)}
              >
                <Play size={11} className="mr-1" /> Continue Workflow
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{project.episodeCount}</div>
              <div className="text-[10px] text-muted-foreground">Target Episodes</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-foreground">{inProduction}</div>
              <div className="text-[10px] text-muted-foreground">In Production</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-amber-400">{continuityCount}</div>
              <div className="text-[10px] text-muted-foreground">Issues</div>
            </div>
          </div>
        </div>

        <section>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2.5 font-medium">MVP Workflow</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {workflowStages.map((stage, index) => (
              <button
                key={stage.id}
                onClick={() => onNavigate(stage.id)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-amber-500/30 transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium', stage.color)}>
                    {stage.icon}
                    {stage.label}
                  </span>
                  {index < workflowStages.length - 1 && <ChevronRight size={12} className="text-muted-foreground hidden md:block" />}
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{stage.progress}%</div>
                <Progress value={stage.progress} className="h-1 mb-2" />
                <div className="text-[11px] text-muted-foreground">{stage.summary}</div>
                <span className="mt-3 text-[11px] text-amber-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  Open {stage.label} <ArrowRight size={10} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <section className="bg-card border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} className="text-amber-400" />
                <span className="text-xs font-semibold">Next Recommended Action</span>
              </div>
              <h2 className="text-sm font-semibold text-foreground">{nextAction.title}</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{nextAction.detail}</p>
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                onClick={() => router.push(`/projects/${project.id}/story-studio?tab=${nextAction.tab}`)}
              >
                Open {nextAction.tab === 'story-bible' ? 'Story Bible' : nextAction.tab}
              </Button>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Active Episodes</div>
                <button onClick={() => onNavigate('all-episodes')} className="text-[11px] text-amber-400 hover:text-amber-300">View all →</button>
              </div>
              <div className="space-y-2">
                {activeEpisodes.map(episode => {
                  const Icon = STAGE_ICONS[episode.stage] || Film
                  return (
                    <button
                      key={episode.id}
                      onClick={() => onNavigate('all-episodes')}
                      className="w-full bg-card border border-border rounded-xl p-4 hover:border-amber-500/20 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-10 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {String(episode.number).padStart(2, '0')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{episode.title}</span>
                            {episode.continuityWarnings > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                <AlertTriangle size={10} /> {episode.continuityWarnings}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
                            <Icon size={10} /> {STAGE_LABELS[episode.stage]}
                          </div>
                          <Progress value={episode.progress} className="h-1" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold">MVP Readiness</span>
              </div>
              <div className="space-y-2.5">
                {readiness.map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon size={11} />{item.label}</span>
                      <span className="text-[11px] font-medium">{item.value}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold">Continuity</span>
                </div>
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
                  {continuityCount} issues
                </Badge>
              </div>
              <div className="space-y-2">
                {CONTINUITY_ISSUES.map(issue => (
                  <div key={issue.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">{issue.episodeTitle}</div>
                      <p className="text-[11px] text-foreground leading-relaxed">{issue.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs border-border mt-3" onClick={() => onNavigate('all-episodes')}>
                <RefreshCw size={10} className="mr-1" /> Review in Episodes
              </Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
