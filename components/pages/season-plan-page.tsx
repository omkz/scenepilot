'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SEASON_EPISODE_PLAN } from '@/lib/mock-data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles, Plus, GripVertical, ChevronDown,
  CheckCircle2, Clock, FileEdit, TrendingUp, User2, Zap,
} from 'lucide-react'

const STATUS_CONFIG = {
  approved: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', icon: CheckCircle2 },
  pending: { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: Clock },
  draft: { color: 'text-muted-foreground', bg: 'bg-muted border-border', icon: FileEdit },
  rejected: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: FileEdit },
}

const ARC_BEATS = [
  { label: 'Beginning State', value: 'Maren is isolated, self-funded, and has hit dead ends. Yuna is her only ally. She has evidence but no access.' },
  { label: 'Inciting Incident', value: 'An encoded broadcast leads her to the MERIDIAN program and Director Vael.' },
  { label: 'Rising Action', value: 'Maren infiltrates the system layer by layer — each success brings a greater risk and a closer tail from Vael\'s team.' },
  { label: 'Midpoint Reversal', value: 'Yuna is captured. Daire is revealed to be alive and inside the program willingly. Maren\'s mission changes.' },
  { label: 'Final Crisis', value: 'Maren must choose: expose the program publicly, or extract Daire. She cannot do both.' },
  { label: 'Finale Outcome', value: 'Open ending. Maren releases a partial data package. Daire is gone. Vael is under review but not arrested. Season 2 is set up.' },
]

export function SeasonPlanPage() {
  const [episodes] = useState(SEASON_EPISODE_PLAN)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Season Plan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Season 1 · 40 target episodes · 8 planned</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs border-border">
            <Sparkles size={11} className="mr-1" /> Generate Plan
          </Button>
          <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Plus size={11} className="mr-1" /> Add Episode
          </Button>
        </div>
      </div>

      <Tabs defaultValue="season-arc">
        <TabsList className="h-auto p-1 bg-muted rounded-lg mb-5">
          {[
            { value: 'season-arc', label: 'Season Arc', icon: <TrendingUp size={12} /> },
            { value: 'character-arcs', label: 'Character Arcs', icon: <User2 size={12} /> },
            { value: 'episode-plan', label: 'Episode Plan', icon: <Zap size={12} /> },
            { value: 'turning-points', label: 'Turning Points', icon: <Zap size={12} /> },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-card">
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="season-arc" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {ARC_BEATS.map((beat, i) => (
              <div key={beat.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{beat.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{beat.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-semibold text-foreground mb-3">Season Structure</div>
            <div className="flex items-center gap-0 h-8">
              {[
                { label: 'Setup', pct: 20, color: 'bg-blue-500/40' },
                { label: 'Complication', pct: 30, color: 'bg-amber-500/40' },
                { label: 'Escalation', pct: 25, color: 'bg-orange-500/40' },
                { label: 'Crisis', pct: 15, color: 'bg-red-500/40' },
                { label: 'Resolution', pct: 10, color: 'bg-green-500/40' },
              ].map(s => (
                <div
                  key={s.label}
                  className={cn('h-full flex items-center justify-center text-[10px] font-medium text-foreground/70 first:rounded-l-lg last:rounded-r-lg', s.color)}
                  style={{ width: `${s.pct}%` }}
                >
                  <span className="hidden sm:block">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="character-arcs" className="mt-0">
          <div className="space-y-4">
            {[
              { name: 'Maren Solis', start: 'Isolated, focused only on exposing the truth', mid: 'Loses Yuna. Discovers truth is more complicated than she assumed.', end: 'Chooses a partial truth over total exposure. First time she concedes a trade-off.' },
              { name: 'Yuna Park', start: 'Reluctant — helps Maren out of loyalty, not belief', mid: 'Becomes a genuine believer in what they\'re doing. Makes a sacrifice for the mission.', end: 'Captured. Her arc completes when Maren receives her hidden message.' },
              { name: 'Tobias Renard', start: 'Guilt-ridden, passive. Has been hiding for years.', mid: 'Forced back into action. His knowledge is the key to the program\'s weakness.', end: 'Full confession. His arc ends in exposure — both the program\'s and his own role in it.' },
              { name: 'Director Vael', start: 'Unchallenged. Views Maren as a manageable nuisance.', mid: 'Escalates. Realizes Maren has more than he thought.', end: 'Exposed but not finished — the institution survives him.' },
            ].map(arc => (
              <div key={arc.name} className="bg-card border border-border rounded-xl p-4">
                <div className="font-semibold text-sm text-foreground mb-3">{arc.name}</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Beginning State', value: arc.start, color: 'border-blue-500/30 bg-blue-500/5' },
                    { label: 'Midpoint', value: arc.mid, color: 'border-amber-500/30 bg-amber-500/5' },
                    { label: 'End State', value: arc.end, color: 'border-green-500/30 bg-green-500/5' },
                  ].map(p => (
                    <div key={p.label} className={cn('rounded-lg border p-3', p.color)}>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{p.label}</div>
                      <p className="text-xs text-foreground leading-relaxed">{p.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="episode-plan" className="mt-0">
          <div className="space-y-2">
            {episodes.map((ep, i) => {
              const cfg = STATUS_CONFIG[ep.planningStatus]
              const Icon = cfg.icon
              return (
                <div key={ep.number} className="bg-card border border-border rounded-xl px-4 py-3 group hover:border-amber-500/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <GripVertical size={14} className="text-muted-foreground mt-1 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {String(ep.number).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{ep.workingTitle}</span>
                        <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.color, cfg.bg)}>
                          <Icon size={9} />
                          {ep.planningStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{ep.mainBeat}</p>
                      <div className="flex items-start gap-4 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Characters: </span>
                          <span className="text-foreground">{ep.characters.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground mb-1">Cliffhanger</div>
                      <p className="text-[11px] text-foreground max-w-48 text-right leading-relaxed">{ep.cliffhanger}</p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="border border-dashed border-border rounded-xl px-4 py-3 flex items-center justify-center cursor-pointer hover:border-amber-500/30 transition-colors"
              onClick={() => {}}>
              <Plus size={13} className="text-muted-foreground mr-1.5" />
              <span className="text-xs text-muted-foreground">Add episode to plan</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="turning-points" className="mt-0">
          <div className="space-y-3">
            {[
              { ep: 'Episode 1', label: 'The Signal', type: 'Inciting Incident', description: 'Maren receives the encoded broadcast. The story begins in earnest.' },
              { ep: 'Episode 3', label: 'Contact Betrayal', type: 'First Obstacle', description: 'The trusted contact is a double agent. Maren\'s network is compromised.' },
              { ep: 'Episode 5', label: 'Yuna Captured', type: 'Rising Pressure', description: 'Maren loses her closest ally. She must continue alone.' },
              { ep: 'Episode 8', label: 'Daire Is Alive', type: 'Midpoint Reversal', description: 'Vael reveals that Daire is alive and inside the program willingly. Everything Maren assumed is now in question.' },
              { ep: 'Episode 12', label: 'The Ring', type: 'Setup Pays Off', description: 'Maren uses the silver thumb ring as proof of identity. Setup from Episode 1.' },
              { ep: 'Episode 20', label: 'Final Choice', type: 'Climax', description: 'Maren must choose between exposing the program or saving Daire.' },
            ].map((tp, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                <div className="text-center shrink-0 w-16">
                  <div className="text-xs font-bold text-amber-400">{tp.ep}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{tp.type}</div>
                </div>
                <div className="w-px bg-border self-stretch shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">{tp.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
