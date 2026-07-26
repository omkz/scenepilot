'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'
import type { SidebarSection } from '@/lib/navigation'
import {
  CHARACTERS,
  COSTUMES,
  EPISODES,
  LOCATIONS,
  SCENES,
  SHOTS,
  VOICE_LINES,
  GENERATION_JOBS,
  type Shot,
  type VoiceLine,
} from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Film, Video, Mic, Scissors, Play, Pause, RefreshCw, Lock, Unlock,
  Sparkles, CheckCircle2, Clock, AlertCircle, Zap, Plus, Download,
  ChevronDown, Eye, Settings, Layers, ListVideo, Square, MapPin, Users, Shirt, AlertTriangle
} from 'lucide-react'

const STATUS_ICON = {
  completed: <CheckCircle2 size={12} className="text-green-400" />,
  'in-progress': <RefreshCw size={12} className="text-amber-400 animate-spin" />,
  waiting: <Clock size={12} className="text-muted-foreground" />,
  failed: <AlertCircle size={12} className="text-destructive" />,
  'not-started': <Square size={12} className="text-muted-foreground" />,
}

const STATUS_COLORS = {
  completed: 'text-green-400 bg-green-400/10 border-green-400/20',
  'in-progress': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  waiting: 'text-muted-foreground bg-muted/40 border-border',
  failed: 'text-destructive bg-destructive/10 border-destructive/20',
  'not-started': 'text-muted-foreground bg-muted/40 border-border',
}

function getWaveformHeight(lineId: string, index: number) {
  const seed = lineId.charCodeAt(lineId.length - 1)
  return 18 + ((seed * 17 + index * 37) % 82)
}

function ShotCard({ shot }: { shot: Shot }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden group hover:border-border/80 transition-colors">
      {/* Thumbnail placeholder */}
      <div className="aspect-[9/16] bg-muted relative flex items-center justify-center">
        <div className="text-center">
          <Film size={20} className="text-muted-foreground/40 mx-auto mb-2" />
          <span className="text-[10px] text-muted-foreground/60">Shot {String(shot.number).padStart(2, '0')}</span>
        </div>
        {/* Status overlay */}
        <div className={cn('absolute top-2 right-2 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STATUS_COLORS[shot.generationStatus])}>
          {STATUS_ICON[shot.generationStatus]}
          <span className="capitalize">{shot.generationStatus.replace('-', ' ')}</span>
        </div>
        {shot.locked && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center">
            <Lock size={10} className="text-amber-400" />
          </div>
        )}
        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <Play size={11} className="text-white ml-0.5" />
          </button>
          <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <RefreshCw size={11} className="text-white" />
          </button>
          <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <Eye size={11} className="text-white" />
          </button>
        </div>
      </div>
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground">{shot.framing}</span>
          <span className="text-[10px] text-muted-foreground">{shot.duration}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{shot.promptPreview}</p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-muted-foreground truncate">{shot.locationName}</span>
          <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {shot.locked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {[shot.characterId, shot.costumeId, shot.locationId].map(reference => (
            <span key={reference} className="text-[8px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground">{reference}</span>
          ))}
        </div>
        {shot.id === 'SHOT-003' && (
          <div className="flex items-start gap-1 text-[9px] text-amber-400 pt-1">
            <AlertTriangle size={9} className="shrink-0 mt-0.5" />
            Face differs from approved {shot.characterId} reference.
          </div>
        )}
      </div>
    </div>
  )
}

function VoiceLineRow({ line }: { line: VoiceLine }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors">
      <button
        onClick={() => setPlaying(p => !p)}
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors',
          line.audioStatus === 'completed'
            ? 'bg-green-400/10 hover:bg-green-400/20 text-green-400'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        )}
      >
        {playing ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{line.characterName}</span>
          <span className="text-[10px] text-muted-foreground">{line.voiceProfile}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border ml-auto shrink-0', STATUS_COLORS[line.audioStatus])}>
            {line.audioStatus.replace('-', ' ')}
          </span>
        </div>
        {/* Waveform placeholder */}
        <div className="flex items-center gap-0.5 mb-1.5 h-6">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-full',
                line.audioStatus === 'completed' ? 'bg-green-400/40' :
                  line.audioStatus === 'in-progress' ? 'bg-amber-400/40' : 'bg-muted'
              )}
              style={{ height: `${getWaveformHeight(line.id, i)}%`, minHeight: 2 }}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">&ldquo;{line.text}&rdquo;</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">Emotion: {line.emotion}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <RefreshCw size={11} />
        </button>
        <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Download size={11} />
        </button>
      </div>
    </div>
  )
}

function StoryboardsTab() {
  const [selectedEp, setSelectedEp] = useState(EPISODES[0].id)
  const episodeScenes = SCENES.filter(scene => scene.episodeId === selectedEp)
  const [selectedScene, setSelectedScene] = useState(SCENES[0].id)
  const shots = SHOTS.filter(shot => shot.episodeId === selectedEp && shot.sceneId === selectedScene)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border overflow-x-auto shrink-0">
        <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          Episode
          <select
            value={selectedEp}
            onChange={event => {
              const episodeId = event.target.value
              setSelectedEp(episodeId)
              setSelectedScene(SCENES.find(scene => scene.episodeId === episodeId)?.id || '')
            }}
            className="h-7 px-2 bg-muted border border-border rounded-md text-foreground outline-none"
          >
            {EPISODES.map(episode => <option key={episode.id} value={episode.id}>Ep {episode.number}: {episode.title}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          Scene
          <select
            value={selectedScene}
            onChange={event => setSelectedScene(event.target.value)}
            className="h-7 px-2 bg-muted border border-border rounded-md text-foreground outline-none max-w-56"
          >
            {episodeScenes.map(scene => <option key={scene.id} value={scene.id}>Scene {scene.number}: {scene.title}</option>)}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs border-border">
            <Layers size={11} className="mr-1" /> View Mode
          </Button>
          <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Sparkles size={11} className="mr-1" /> Generate All
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Approved references</span>
          <Badge variant="outline" className="text-[10px]"><Users size={10} className="mr-1" />CHAR-001</Badge>
          <Badge variant="outline" className="text-[10px]"><Shirt size={10} className="mr-1" />COSTUME-001</Badge>
          <Badge variant="outline" className="text-[10px]"><MapPin size={10} className="mr-1" />LOCATION-004</Badge>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {shots.map(shot => (
            <ShotCard key={shot.id} shot={shot} />
          ))}
          {/* Placeholder cards */}
          {Array.from({ length: Math.max(0, 8 - shots.length) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="bg-card border border-dashed border-border rounded-xl overflow-hidden">
              <div className="aspect-[9/16] flex items-center justify-center">
                <Plus size={16} className="text-muted-foreground/30" />
              </div>
              <div className="p-2.5">
                <div className="text-[10px] text-muted-foreground/50 text-center">Add shot</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GeneratedScenesTab() {
  const [selectedEp, setSelectedEp] = useState(EPISODES[0].id)
  const scenes = SCENES.filter(scene => scene.episodeId === selectedEp)

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold">Generated Scenes</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Review scene outputs against approved story assets before marking them complete.</p>
        </div>
        <select
          value={selectedEp}
          onChange={event => setSelectedEp(event.target.value)}
          className="h-7 px-2 text-xs bg-muted border border-border rounded-md text-foreground outline-none"
        >
          {EPISODES.map(episode => <option key={episode.id} value={episode.id}>Ep {episode.number}: {episode.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scenes.map((scene, index) => {
          const character = CHARACTERS.find(item => item.name === scene.characters[0])
          const costume = COSTUMES.find(item => item.id === scene.costumes[0])
          const location = LOCATIONS.find(item => item.id === scene.locationId)
          const status = index < 2 ? 'Completed' : index === 2 ? 'Generating' : 'Ready'

          return (
            <div key={scene.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="h-44 bg-black/50 flex items-center justify-center relative">
                <Video size={28} className="text-muted-foreground/30" />
                <div className="absolute top-3 left-3 text-[10px] px-2 py-1 rounded bg-black/60 text-white/70">
                  Ep {EPISODES.find(item => item.id === scene.episodeId)?.number} · Scene {scene.number}
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] px-2 py-1 rounded bg-black/60 text-white/70">{scene.duration}</div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{scene.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{scene.purpose}</div>
                  </div>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border',
                    status === 'Completed'
                      ? 'text-green-400 bg-green-400/10 border-green-400/20'
                      : status === 'Generating'
                        ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                        : 'text-muted-foreground bg-muted border-border'
                  )}>{status}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {character && <Badge variant="outline" className="text-[9px] font-mono">{character.id}</Badge>}
                  {costume && <Badge variant="outline" className="text-[9px] font-mono">{costume.id}</Badge>}
                  {location && <Badge variant="outline" className="text-[9px] font-mono">{location.id}</Badge>}
                </div>
                {(scene.warnings > 0 || index === 1) && (
                  <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">
                      {scene.warnings > 0
                        ? 'Costume does not match the approved episode timeline.'
                        : 'Location appearance differs from the approved asset.'}
                    </p>
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full h-7 text-xs border-border mt-3">
                  <RefreshCw size={11} className="mr-1" /> Retry Scene
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VideoTab() {
  const ep = EPISODES[0]
  const shots = SHOTS.filter(s => s.episodeId === ep.id)

  return (
    <div className="h-full flex gap-0 overflow-hidden">
      {/* Main preview area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center bg-black/60 relative">
          <div className="w-40 aspect-[9/16] bg-zinc-900 rounded-lg border border-border/50 flex items-center justify-center relative overflow-hidden">
            <Video size={28} className="text-muted-foreground/30" />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 w-1/3" />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-white/50">00:02</span>
                <span className="text-[9px] text-white/50">00:06</span>
              </div>
            </div>
          </div>
          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 px-4 py-2 rounded-full border border-border/50">
            <button className="text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={13} /></button>
            <button className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center transition-colors">
              <Play size={13} className="text-black ml-0.5" />
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors"><Download size={13} /></button>
          </div>
        </div>

        {/* Shot timeline */}
        <div className="shrink-0 bg-card border-t border-border p-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {shots.map((shot, i) => (
              <div
                key={shot.id}
                className={cn(
                  'shrink-0 flex flex-col items-center gap-1 cursor-pointer group',
                  i === 0 ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                )}
              >
                <div className={cn(
                  'w-12 aspect-[9/16] rounded bg-muted border flex items-center justify-center',
                  i === 0 ? 'border-amber-500' : 'border-border'
                )}>
                  <Film size={10} className="text-muted-foreground/40" />
                </div>
                <span className="text-[9px] text-muted-foreground">{shot.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — shot inspector */}
      <div className="w-64 border-l border-border flex flex-col overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border">
          <div className="text-xs font-semibold mb-0.5">Shot 01</div>
          <div className="text-[11px] text-muted-foreground">Wide establishing · 0:05</div>
        </div>
        <div className="p-3 space-y-3 flex-1">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Generation Status</div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-400" />
              <span className="text-xs text-foreground">Completed</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Prompt Preview</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{SHOTS[0]?.promptPreview}</p>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Characters</div>
            <span className="text-xs text-foreground">{SHOTS[0]?.characterName}</span>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Location</div>
            <span className="text-xs text-foreground">{SHOTS[0]?.locationName}</span>
          </div>
        </div>
        <div className="p-3 border-t border-border space-y-2">
          <Button size="sm" className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <RefreshCw size={11} className="mr-1" /> Regenerate
          </Button>
          <Button size="sm" variant="outline" className="w-full h-7 text-xs border-border">
            <Lock size={11} className="mr-1" /> Lock Shot
          </Button>
        </div>
      </div>
    </div>
  )
}

function VoiceTab() {
  const lines = VOICE_LINES.filter(v => v.episodeId === 'EP-001')
  const completed = lines.filter(v => v.audioStatus === 'completed').length

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{lines.length} voice lines · {completed}/{lines.length} generated</span>
          <div className="flex items-center gap-2 w-32">
            <Progress value={(completed / lines.length) * 100} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round((completed / lines.length) * 100)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs border-border">
            <Download size={11} className="mr-1" /> Export All
          </Button>
          <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Sparkles size={11} className="mr-1" /> Generate Remaining
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {lines.map(line => (
          <VoiceLineRow key={line.id} line={line} />
        ))}
      </div>
    </div>
  )
}

function EditorTab() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Scissors size={24} className="text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground mb-1">Episode Editor</div>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Assemble generated video shots and voice lines into a final episode. Complete storyboard and voice generation first.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" className="h-8 text-xs border-border">
          <ListVideo size={12} className="mr-1.5" /> Review Assets
        </Button>
        <Button size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          <Zap size={12} className="mr-1.5" /> Auto Assemble
        </Button>
      </div>
    </div>
  )
}

type ProductionView = 'storyboards' | 'generated-scenes' | 'video' | 'voice' | 'editor'

interface ProductionPageProps {
  view: ProductionView
  onNavigate?: (section: SidebarSection) => void
}

export function ProductionPage({ view, onNavigate }: ProductionPageProps) {
  const activeView = view
  const activeJobs = GENERATION_JOBS.filter(j => j.status === 'running')
  const tabs: { id: ProductionView; label: string; icon: React.ReactNode }[] = [
    { id: 'storyboards', label: 'Storyboards', icon: <Film size={12} /> },
    { id: 'generated-scenes', label: 'Generated Scenes', icon: <Video size={12} /> },
    ...(FEATURES.voiceGeneration ? [{ id: 'voice' as const, label: 'Voice', icon: <Mic size={12} /> }] : []),
    ...(FEATURES.videoEditor ? [{ id: 'editor' as const, label: 'Editor', icon: <Scissors size={12} /> }] : []),
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Active jobs bar */}
      {FEATURES.advancedGenerationQueue && activeJobs.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-amber-500/5 shrink-0 overflow-x-auto">
          <Zap size={12} className="text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-400 font-medium shrink-0">
            {activeJobs.length} job{activeJobs.length > 1 ? 's' : ''} running
          </span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {activeJobs.map(job => (
              <div key={job.id} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1 shrink-0">
                <RefreshCw size={10} className="text-amber-400 animate-spin" />
                <span className="text-[11px] text-foreground">{job.label}: {job.episodeTitle}</span>
                <div className="w-16 h-1 bg-amber-400/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
                <span className="text-[10px] text-amber-400 tabular-nums">{job.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onNavigate?.(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
              activeView === tab.id
                ? 'border-amber-400 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={activeView === tab.id ? 'text-amber-400' : ''}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === 'storyboards' && <StoryboardsTab />}
        {activeView === 'generated-scenes' && <GeneratedScenesTab />}
        {activeView === 'video' && <VideoTab />}
        {activeView === 'voice' && <VoiceTab />}
        {activeView === 'editor' && <EditorTab />}
      </div>
    </div>
  )
}
