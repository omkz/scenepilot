'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CHARACTERS, COSTUMES, EPISODES, SCENES, type Episode, type Scene } from '@/lib/mock-data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Plus, Search, Filter, GripVertical, AlertTriangle, CheckCircle2,
  Clock, FileEdit, Film, Video, Clapperboard, Mic, AlertCircle,
  ChevronRight, X, MapPin, Users, Shirt, Zap, RefreshCw, Sparkles,
} from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  'script-draft': 'Script Draft',
  'storyboard-generation': 'Storyboard',
  'video-rendering': 'Generated Scenes',
  'voice-generation': 'Generated Scenes',
  editing: 'Generated Scenes',
  completed: 'Completed',
  published: 'Completed',
}

const STAGE_COLORS: Record<string, string> = {
  'script-draft': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'storyboard-generation': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'video-rendering': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'voice-generation': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  editing: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  completed: 'text-green-400 bg-green-400/10 border-green-400/20',
  published: 'text-green-400 bg-green-400/10 border-green-400/20',
}

const PRODUCTION_PIPELINE = ['Outline', 'Script', 'Scenes', 'Storyboard', 'Generated Scenes', 'Completed']

function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={cn('inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STAGE_COLORS[stage])}>
      {STAGE_LABELS[stage] || stage}
    </span>
  )
}

function EpisodeRow({ ep, selected, onSelect }: { ep: Episode; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors',
        selected ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'hover:bg-muted/30'
      )}
    >
      <GripVertical size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
        {String(ep.number).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground truncate">{ep.title}</span>
          {ep.continuityWarnings > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 shrink-0">
              <AlertTriangle size={10} />
              {ep.continuityWarnings}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StageBadge stage={ep.stage} />
          {ep.duration !== '–' && (
            <span className="text-[11px] text-muted-foreground">{ep.duration}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-2 w-24">
          <Progress value={ep.progress} className="h-1 flex-1" />
          <span className="text-[10px] text-muted-foreground tabular-nums">{ep.progress}%</span>
        </div>
        <span className="text-[10px] text-muted-foreground hidden lg:block">{ep.lastUpdated}</span>
        <ChevronRight size={13} className="text-muted-foreground" />
      </div>
    </div>
  )
}

function SceneRow({ scene, selected, onSelect }: { scene: Scene; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors',
        selected ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'hover:bg-muted/30'
      )}
    >
      <GripVertical size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0 cursor-grab" />
      <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">
        {scene.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">{scene.title}</span>
          {scene.warnings > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 shrink-0">
              <AlertTriangle size={10} />
              {scene.warnings}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin size={10} />{scene.locationName}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Users size={10} />{scene.characters.join(', ')}</span>
          <span>·</span>
          <span>{scene.duration}</span>
        </div>
      </div>
      <div className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 mt-0.5',
        scene.status === 'approved' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
          'text-muted-foreground bg-muted border-border'
      )}>
        {scene.status}
      </div>
    </div>
  )
}

function SceneInspector({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  return (
    <div className="w-80 flex flex-col bg-card border-l border-border shrink-0 h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
        <div>
          <div className="text-sm font-semibold">Scene {scene.number}</div>
          <div className="text-xs text-muted-foreground">{scene.title}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <Field label="Story Purpose" value={scene.purpose} />
        <Field label="Emotional Tone" value={scene.emotionalTone} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time of Day" value={scene.timeOfDay} />
          <Field label="Duration" value={scene.duration} />
        </div>
        <Field label="Location" value={scene.locationName} />
        <Field label="Production Status" value={scene.status === 'approved' ? 'Ready for production' : 'Draft'} />
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Characters</div>
          <div className="flex flex-wrap gap-1.5">
            {scene.characters.map(c => (
              <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Costumes</div>
          <div className="flex flex-wrap gap-1.5">
            {scene.costumes.map(c => (
              <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">{c}</span>
            ))}
          </div>
        </div>
        <Field label="Dialogue Summary" value={scene.dialogueSummary} />
        {scene.warnings > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">Costume COSTUME-001 does not match the approved episode timeline.</p>
          </div>
        )}
        <div className="space-y-2 pt-2">
          <Button size="sm" className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Clapperboard size={11} className="mr-1" /> Send to Production
          </Button>
          <Button size="sm" variant="outline" className="w-full h-7 text-xs border-border">
            <Sparkles size={11} className="mr-1" /> Rewrite Scene
          </Button>
          <Button size="sm" variant="outline" className="w-full h-7 text-xs border-border">
            <RefreshCw size={11} className="mr-1" /> Run Continuity Check
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</div>
      <p className="text-xs text-foreground leading-relaxed">{value}</p>
    </div>
  )
}

function PipelineProgress({ stage }: { stage: string }) {
  const idx = PRODUCTION_PIPELINE.indexOf(
    stage === 'script-draft' ? 'Script' :
      stage === 'storyboard-generation' ? 'Storyboard' :
        stage === 'video-rendering' || stage === 'voice-generation' || stage === 'editing' ? 'Generated Scenes' :
          stage === 'completed' || stage === 'published' ? 'Completed' : 'Outline'
  )

  return (
    <div className="flex items-center gap-0 w-full">
      {PRODUCTION_PIPELINE.map((step, i) => {
        const isCompleted = i < idx
        const isActive = i === idx
        return (
          <div key={step} className="flex-1 flex flex-col items-center">
            <div className={cn(
              'w-full h-1.5 mb-1',
              i === 0 ? 'rounded-l-full' : '',
              i === PRODUCTION_PIPELINE.length - 1 ? 'rounded-r-full' : '',
              isCompleted ? 'bg-green-400' :
                isActive ? 'bg-amber-400' : 'bg-muted'
            )} />
            <span className={cn('text-[9px] hidden sm:block',
              isCompleted ? 'text-green-400' :
                isActive ? 'text-amber-400' : 'text-muted-foreground'
            )}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

type EpisodeFilter = 'all' | 'draft' | 'ready' | 'in-production' | 'completed'

const EPISODE_FILTERS: { id: EpisodeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'ready', label: 'Ready' },
  { id: 'in-production', label: 'In Production' },
  { id: 'completed', label: 'Completed' },
]

function matchesEpisodeFilter(episode: Episode, filter: EpisodeFilter) {
  if (filter === 'draft') return episode.storyStatus === 'draft' || episode.storyStatus === 'pending'
  if (filter === 'ready') return episode.storyStatus === 'approved' && episode.productionStatus === 'not-started'
  if (filter === 'in-production') return episode.productionStatus === 'in-progress'
  if (filter === 'completed') {
    return episode.productionStatus === 'completed' || episode.stage === 'completed' || episode.stage === 'published'
  }
  return true
}

export function EpisodesPage() {
  const [selectedEp, setSelectedEp] = useState<Episode | null>(EPISODES[0])
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [epTab, setEpTab] = useState('scenes')
  const [filter, setFilter] = useState<EpisodeFilter>('all')

  const filteredEpisodes = EPISODES.filter(episode => matchesEpisodeFilter(episode, filter))

  const handleFilterChange = (nextFilter: EpisodeFilter) => {
    setFilter(nextFilter)
    const firstMatch = EPISODES.find(episode => matchesEpisodeFilter(episode, nextFilter)) || null
    setSelectedEp(firstMatch)
    setSelectedScene(null)
  }

  const epScenes = SCENES.filter(s => s.episodeId === selectedEp?.id)

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Episode list */}
      <div className="w-64 flex flex-col border-r border-border shrink-0">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-2.5 py-1.5">
            <Search size={12} className="text-muted-foreground" />
            <input className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground" placeholder="Find episode..." />
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {EPISODE_FILTERS.map(item => (
              <button
                key={item.id}
                onClick={() => handleFilterChange(item.id)}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] border transition-colors',
                  filter === item.id
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredEpisodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Film size={24} className="text-muted-foreground mb-2" />
              <div className="text-xs font-medium text-foreground mb-1">No episodes</div>
              <p className="text-[11px] text-muted-foreground">Episodes in this category will appear here.</p>
            </div>
          ) : (
            filteredEpisodes.map(ep => (
              <EpisodeRow
                key={ep.id}
                ep={ep}
                selected={selectedEp?.id === ep.id}
                onSelect={() => { setSelectedEp(ep); setSelectedScene(null) }}
              />
            ))
          )}
        </div>
        <div className="p-3 border-t border-border">
          <Button size="sm" className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Plus size={11} className="mr-1" /> Create Episode
          </Button>
        </div>
      </div>

      {/* Episode editor */}
      {selectedEp ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Episode header */}
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-foreground">
                    Ep {selectedEp.number}: {selectedEp.title}
                  </span>
                  <StageBadge stage={selectedEp.stage} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{selectedEp.synopsis}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                  <RefreshCw size={11} className="mr-1" /> Continuity Check
                </Button>
                <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                  <Clapperboard size={11} className="mr-1" /> Generate Storyboard
                </Button>
              </div>
            </div>
            {/* Pipeline */}
            <div className="mt-3">
              <PipelineProgress stage={selectedEp.stage} />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={epTab} onValueChange={setEpTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-3 shrink-0">
              <TabsList className="h-auto p-1 bg-muted rounded-lg">
                {['overview', 'outline', 'script', 'scenes', 'assets', 'continuity'].map(t => (
                  <TabsTrigger key={t} value={t} className="text-xs capitalize px-3 py-1.5 data-[state=active]:bg-card">
                    {t}
                    {t === 'continuity' && selectedEp.continuityWarnings > 0 && (
                      <span className="ml-1.5 w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center">
                        {selectedEp.continuityWarnings}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="scenes" className="mt-0 h-full overflow-hidden flex">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{epScenes.length} scenes · {selectedEp.duration}</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                        <Sparkles size={11} className="mr-1" /> Generate Scene
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                        <Plus size={11} /> Add
                      </Button>
                    </div>
                  </div>
                  {epScenes.map(scene => (
                    <SceneRow
                      key={scene.id}
                      scene={scene}
                      selected={selectedScene?.id === scene.id}
                      onSelect={() => setSelectedScene(prev => prev?.id === scene.id ? null : scene)}
                    />
                  ))}
                </div>
                {selectedScene && (
                  <SceneInspector scene={selectedScene} onClose={() => setSelectedScene(null)} />
                )}
              </TabsContent>

              <TabsContent value="overview" className="mt-0 p-4 overflow-y-auto h-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Duration', value: selectedEp.duration },
                    { label: 'Scenes', value: String(epScenes.length) },
                    { label: 'Characters', value: String(selectedEp.mainCharacters.length) },
                    { label: 'Continuity', value: selectedEp.continuityWarnings > 0 ? `${selectedEp.continuityWarnings} warnings` : 'Clear' },
                  ].map(m => (
                    <div key={m.label} className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-xl font-bold text-foreground">{m.value}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-xs font-semibold mb-2">Synopsis</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedEp.synopsis}</p>
                </div>
              </TabsContent>

              <TabsContent value="outline" className="mt-0 p-4 overflow-y-auto h-full">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-xs font-semibold mb-3">Episode Outline</div>
                  <div className="space-y-3">
                    {epScenes.map((scene, i) => (
                      <div key={scene.id} className="flex items-start gap-3">
                        <span className="text-[11px] font-bold text-amber-400 mt-0.5 shrink-0 w-4">{i + 1}.</span>
                        <div>
                          <div className="text-xs font-medium text-foreground">{scene.title}</div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{scene.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="script" className="mt-0 p-4 overflow-y-auto h-full">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-semibold">Script</div>
                    <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                      <Sparkles size={11} className="mr-1" /> Generate Script
                    </Button>
                  </div>
                  <div className="font-mono text-xs space-y-4 text-foreground">
                    <div className="text-center">
                      <div className="font-bold uppercase">{selectedEp.title.toUpperCase()}</div>
                      <div className="text-muted-foreground">Episode {selectedEp.number}</div>
                    </div>
                    {epScenes.slice(0, 2).map(scene => (
                      <div key={scene.id} className="space-y-2">
                        <div className="font-bold text-amber-400">{`INT. ${scene.locationName.toUpperCase()} - ${scene.timeOfDay.toUpperCase()}`}</div>
                        <p className="text-muted-foreground leading-relaxed">{scene.dialogueSummary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="assets" className="mt-0 p-4 overflow-y-auto h-full">
                <div className="space-y-3">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-semibold mb-3 flex items-center gap-1.5"><Users size={13} />Characters</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CHARACTERS.filter(character => selectedEp.mainCharacters.includes(character.id)).map(character => (
                        <div key={character.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <div className="w-7 h-7 rounded-full bg-rose-800 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-foreground truncate">{character.name}</div>
                            <div className="text-[9px] font-mono text-muted-foreground">{character.id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-semibold mb-3 flex items-center gap-1.5"><Shirt size={13} />Assigned Costumes</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COSTUMES.filter(costume => costume.episodes.includes(selectedEp.id)).map(costume => (
                        <div key={costume.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-foreground">{costume.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{costume.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-semibold mb-3 flex items-center gap-1.5"><MapPin size={13} />Locations</div>
                    <div className="space-y-2">
                      {epScenes.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                          <span className="text-foreground">{s.locationName}</span>
                          <span className="text-muted-foreground">Scene {s.number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="continuity" className="mt-0 p-4 overflow-y-auto h-full">
                {selectedEp.continuityWarnings === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 size={28} className="text-green-400 mb-2" />
                    <div className="text-sm font-medium text-foreground">No continuity issues</div>
                    <p className="text-xs text-muted-foreground mt-1">This episode passed all continuity checks.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{selectedEp.continuityWarnings} issue{selectedEp.continuityWarnings > 1 ? 's' : ''} detected</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                        <RefreshCw size={11} className="mr-1" /> Re-check
                      </Button>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-foreground mb-1">Costume mismatch in Scene 3</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Maren&apos;s jacket switches from dark navy to black between Scene 2 and Scene 3. Costume COSTUME-001 must remain consistent.</p>
                      </div>
                    </div>
                    {selectedEp.continuityWarnings > 1 && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-medium text-foreground mb-1">Story knowledge revealed too early</div>
                          <p className="text-xs text-muted-foreground leading-relaxed">Maren references MERIDIAN protocol details before Tobias reveals them in a later episode.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Film size={32} className="text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium text-foreground">Select an episode</div>
            <p className="text-xs text-muted-foreground mt-1">Choose an episode from the list to open the editor.</p>
          </div>
        </div>
      )}
    </div>
  )
}
