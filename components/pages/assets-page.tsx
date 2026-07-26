'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'
import { CHARACTERS, LOCATIONS, COSTUMES } from '@/lib/mock-data'
import type { Character } from '@/lib/mock-data'
import { StoryBiblePage } from '@/components/pages/story-bible-page'
import {
  Users, MapPin, Shirt, Box, Mic2, Palette, BookOpen,
  Plus, Search, Import, Sparkles,
  Lock, Unlock, CheckCircle2, Clock, FileEdit, AlertCircle,
  ChevronRight, X, Check,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const STATUS_CONFIG = {
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  draft: { label: 'Draft', icon: FileEdit, color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  rejected: { label: 'Rejected', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
}

const ROLE_COLORS = {
  protagonist: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  antagonist: 'text-red-400 bg-red-400/10 border-red-400/20',
  supporting: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  recurring: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
}

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.color, cfg.bg)}>
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

function CharacterCard({ char, selected, onSelect }: { char: Character; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-amber-500/30',
        selected ? 'border-amber-500/60 ring-1 ring-amber-500/20' : 'border-border'
      )}
    >
      {/* Avatar */}
      <div className={cn('w-full aspect-[3/4] rounded-lg mb-3 flex items-end justify-end p-2 relative', char.avatarColor)}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 rounded-lg" />
        <div className="relative z-10 text-[10px] font-mono text-white/60">{char.id}</div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-semibold text-foreground leading-tight">{char.name}</span>
          <StatusBadge status={char.approvalStatus} />
        </div>
        <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded-full border capitalize', ROLE_COLORS[char.role])}>
          {char.role}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
          <span>{char.costumeCount} costumes</span>
          <span>·</span>
          <span>{char.episodeUsage} eps</span>
        </div>
      </div>
    </div>
  )
}

function LockToggle({ label, locked, onChange }: { label: string; locked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors',
        locked ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/30 border-border hover:border-amber-500/20'
      )}
      onClick={() => onChange(!locked)}
    >
      <span className="text-xs text-foreground">{label}</span>
      {locked
        ? <Lock size={12} className="text-amber-400" />
        : <Unlock size={12} className="text-muted-foreground" />
      }
    </div>
  )
}

function CharacterEditor({ char, onClose }: { char: Character; onClose: () => void }) {
  const [locks, setLocks] = useState(char.locked)
  const [tab, setTab] = useState('overview')

  const updateLock = (key: keyof typeof locks, val: boolean) => {
    setLocks(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="w-96 flex flex-col h-full bg-card border-l border-border shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-sm font-semibold">{char.name}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{char.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={char.approvalStatus} />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className={cn(
          'grid gap-0 h-auto p-1 m-3 mb-0 bg-muted rounded-lg',
          FEATURES.voiceGeneration ? 'grid-cols-4' : 'grid-cols-3'
        )}>
          {[
            'overview',
            'appearance',
            ...(FEATURES.voiceGeneration ? ['voice'] : []),
            'continuity',
          ].map(t => (
            <TabsTrigger key={t} value={t} className="text-[10px] capitalize py-1.5 data-[state=active]:bg-card">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="flex gap-3">
              <div className={cn('w-16 h-20 rounded-lg shrink-0', char.avatarColor)} />
              <div className="space-y-1 flex-1">
                <Field label="Role" value={char.role} capitalize />
                <Field label="Age" value={String(char.age)} />
                <Field label="Episodes" value={String(char.episodeUsage)} />
              </div>
            </div>
            <Field label="Motivation" value={char.motivation} multiline />
            <Field label="Personality" value={char.personality} multiline />
            <Field label="Distinguishing Features" value={char.distinguishingFeatures} multiline />
          </TabsContent>

          <TabsContent value="appearance" className="mt-0 space-y-4">
            <Field label="Physical Appearance" value={char.appearance} multiline />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">Consistency Locks</div>
              <div className="space-y-1.5">
                <LockToggle label="Lock facial identity" locked={locks.facialIdentity} onChange={v => updateLock('facialIdentity', v)} />
                <LockToggle label="Lock skin tone" locked={locks.skinTone} onChange={v => updateLock('skinTone', v)} />
                <LockToggle label="Lock eye color" locked={locks.eyeColor} onChange={v => updateLock('eyeColor', v)} />
                <LockToggle label="Lock hairstyle" locked={locks.hairstyle} onChange={v => updateLock('hairstyle', v)} />
                <LockToggle label="Lock body proportions" locked={locks.bodyProportions} onChange={v => updateLock('bodyProportions', v)} />
                <LockToggle label="Preserve distinguishing features" locked={locks.distinguishingFeatures} onChange={v => updateLock('distinguishingFeatures', v)} />
                <LockToggle label="Prevent auto accessory changes" locked={locks.accessories} onChange={v => updateLock('accessories', v)} />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">Reference Images</div>
              <div className="grid grid-cols-3 gap-2">
                {['Primary', 'Front', 'Side', '¾ View', 'Full Body', '+'].map(label => (
                  <div key={label} className="aspect-square rounded-lg bg-muted border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-amber-500/40 transition-colors">
                    <span className="text-[10px] text-muted-foreground text-center px-1">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-0 space-y-3">
            <Field label="Voice Profile" value="Alto — Controlled, Low Resonance" />
            <Field label="Speaking Pattern" value="Sparse, direct — avoids excess words" multiline />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                Generate Voice Sample
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="continuity" className="mt-0 space-y-3">
            {char.id === 'CHAR-001' ? (
              <>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-foreground">Reference mismatch in Episode 2</div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Maren&apos;s face differs from approved reference {char.id} in two generated shots.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Character knows protocol details that are revealed in a later episode.</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 size={12} />
                No continuity issues for this character.
              </div>
            )}
          </TabsContent>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-2">
          {char.approvalStatus !== 'approved' && (
            <Button size="sm" className="w-full h-8 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-semibold">
              <Check size={12} className="mr-1" /> Approve Character
            </Button>
          )}
          <Button size="sm" variant="outline" className="w-full h-8 text-xs border-border">
            <Sparkles size={11} className="mr-1" /> Generate Reference Images
          </Button>
        </div>
      </Tabs>
    </div>
  )
}

function Field({ label, value, multiline, capitalize }: { label: string; value: string; multiline?: boolean; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div className={cn('text-xs text-foreground leading-relaxed', capitalize && 'capitalize')}>{value}</div>
    </div>
  )
}

function LocationCard({ loc }: { loc: typeof LOCATIONS[0] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-amber-500/20 transition-colors cursor-pointer">
      <div className={cn('w-full h-28 rounded-lg mb-3 flex items-end p-2.5 relative', loc.color)}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 rounded-lg" />
        <div className="relative z-10 flex items-center justify-between w-full">
          <span className="text-[10px] font-mono text-white/60">{loc.id}</span>
          <StatusBadge status={loc.approvalStatus} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground leading-tight">{loc.name}</div>
        <div className="text-[11px] text-muted-foreground">{loc.type} · {loc.episodeUsage} episodes</div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{loc.description}</p>
      </div>
    </div>
  )
}

export function AssetsPage() {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [activeTab, setActiveTab] = useState('characters')
  const assetTabs = [
    { value: 'characters', label: 'Characters', icon: <Users size={12} />, count: CHARACTERS.length },
    { value: 'costumes', label: 'Costumes', icon: <Shirt size={12} />, count: COSTUMES.length },
    { value: 'locations', label: 'Locations', icon: <MapPin size={12} />, count: LOCATIONS.length },
    { value: 'story-bible', label: 'Story Bible', icon: <BookOpen size={12} /> },
    ...(FEATURES.props ? [{ value: 'props', label: 'Props', icon: <Box size={12} />, count: 3 }] : []),
    ...(FEATURES.voiceGeneration ? [{ value: 'voices', label: 'Voices', icon: <Mic2 size={12} />, count: 5 }] : []),
    ...(FEATURES.visualStyle ? [{ value: 'visual-style', label: 'Visual Style', icon: <Palette size={12} />, count: 1 }] : []),
  ]

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Story Studio</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Approve reusable story assets once, then keep them consistent across every episode</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                <Search size={11} className="mr-1" /> Search
              </Button>
              <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                <Plus size={11} className="mr-1" /> Add Asset
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto p-1 bg-muted rounded-lg mb-5 flex flex-wrap gap-0">
              {assetTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-card">
                  {tab.icon}
                  {tab.label}
                  {'count' in tab && <span className="text-[10px] text-muted-foreground ml-0.5">{tab.count}</span>}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="characters" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />{CHARACTERS.filter(c => c.approvalStatus === 'approved').length} approved</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{CHARACTERS.filter(c => c.approvalStatus === 'pending').length} pending</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" />{CHARACTERS.filter(c => c.approvalStatus === 'draft').length} draft</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                  <Sparkles size={11} className="mr-1" /> Generate Initial Cast
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {CHARACTERS.map(char => (
                  <CharacterCard
                    key={char.id}
                    char={char}
                    selected={selectedChar?.id === char.id}
                    onSelect={() => setSelectedChar(prev => prev?.id === char.id ? null : char)}
                  />
                ))}
                <div
                  className="bg-muted/20 border border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors flex flex-col items-center justify-center aspect-[3/4] gap-2"
                  onClick={() => {}}
                >
                  <Plus size={20} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">Add Character</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="costumes" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {COSTUMES.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-amber-500/20 transition-colors cursor-pointer">
                    <div className={cn('w-full h-24 rounded-lg mb-3 flex items-end p-2.5 relative', c.color)}>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 rounded-lg" />
                      <div className="relative z-10 flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono text-white/60">{c.id}</span>
                        <StatusBadge status={c.approvalStatus} />
                      </div>
                    </div>
                    <div className="font-semibold text-sm text-foreground mb-1">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground mb-1.5">{c.characterName}</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{c.description}</p>
                    <div className="text-[10px] text-muted-foreground mt-2">{c.episodes.length} episodes</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="locations" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LOCATIONS.map(loc => <LocationCard key={loc.id} loc={loc} />)}
              </div>
            </TabsContent>

            <TabsContent value="story-bible" className="mt-0">
              <StoryBiblePage embedded />
            </TabsContent>

            <TabsContent value="props" className="mt-0">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Box size={20} className="text-muted-foreground" />
                </div>
                <div className="text-sm font-medium text-foreground mb-1">No props yet</div>
                <p className="text-xs text-muted-foreground max-w-xs">Add props to track objects that appear consistently across scenes and episodes.</p>
                <Button size="sm" className="mt-4 h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                  <Plus size={11} className="mr-1" /> Add Prop
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="voices" className="mt-0">
              <div className="space-y-2">
                {CHARACTERS.map(char => (
                  <div key={char.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-amber-500/20 transition-colors cursor-pointer">
                    <div className={cn('w-8 h-8 rounded-full', char.avatarColor, 'flex items-center justify-center')}>
                      <Mic2 size={12} className="text-white/60" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{char.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {char.id === 'CHAR-001' ? 'Alto — Controlled, Low Resonance' :
                          char.id === 'CHAR-002' ? 'Bass — Clipped, Authoritative' :
                            char.id === 'CHAR-003' ? 'Mezzo — Warm, Slightly Strained' :
                              'Voice profile not set'}
                      </div>
                    </div>
                    <StatusBadge status={char.approvalStatus} />
                    <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                      <Mic2 size={11} className="mr-1" /> Sample
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="visual-style" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Color Palette', 'Lighting Preset', 'Camera Style', 'Texture & Grain'].map(item => (
                  <div key={item} className="bg-card border border-border rounded-xl p-4">
                    <div className="text-sm font-semibold text-foreground mb-2">{item}</div>
                    <div className="w-full h-20 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Click to configure</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Character Editor Panel */}
      {selectedChar && (
        <CharacterEditor char={selectedChar} onClose={() => setSelectedChar(null)} />
      )}
    </div>
  )
}
