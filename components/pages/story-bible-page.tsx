'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, Edit3, Globe, Users, GitMerge, Clock, BookOpen } from 'lucide-react'

function EditableCard({ title, content, className }: { title: string; content: string; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(content)
  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 group', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-foreground">{title}</div>
        <button
          onClick={() => setEditing(!editing)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          <Edit3 size={12} />
        </button>
      </div>
      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs text-foreground outline-none focus:border-amber-500/50 leading-relaxed resize-none min-h-[80px]"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="h-6 text-[11px] bg-amber-500 hover:bg-amber-400 text-black" onClick={() => setEditing(false)}>Save</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setValue(content); setEditing(false) }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">{value}</p>
      )}
    </div>
  )
}

export function StoryBiblePage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Story Bible</h2>
          <p className="text-xs text-muted-foreground mt-0.5">World-building, lore, and narrative foundations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs border-border">
            <Sparkles size={11} className="mr-1" /> AI Suggestions
          </Button>
          <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Plus size={11} className="mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto p-1 bg-muted rounded-lg mb-5">
          {[
            { value: 'overview', label: 'Overview', icon: <BookOpen size={12} /> },
            { value: 'world', label: 'World', icon: <Globe size={12} /> },
            { value: 'characters', label: 'Characters', icon: <Users size={12} /> },
            { value: 'relationships', label: 'Relationships', icon: <GitMerge size={12} /> },
            { value: 'timeline', label: 'Timeline', icon: <Clock size={12} /> },
            { value: 'lore', label: 'Lore', icon: <BookOpen size={12} /> },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-card">
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <EditableCard title="Premise" content="A former intelligence analyst discovers her missing brother was a test subject in a classified state program that rewrites memory. To expose the truth, she must infiltrate the same system that erased him." />
            <EditableCard title="Genre" content="Serialized thriller. Paranoid conspiracy. Near-future setting with no overt sci-fi elements — the technology is plausible today." />
            <EditableCard title="Themes" content="Institutional betrayal. The cost of loyalty. Whether truth survives when memory cannot be trusted. Identity under surveillance." />
            <EditableCard title="Main Conflict" content="Maren versus Director Vael and the program he built — a system that has now turned its tools toward containing her investigation." />
          </div>
          {/* AI tip */}
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <Sparkles size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">Showrunner AI</div>
              <p className="text-xs text-muted-foreground leading-relaxed">The season midpoint does not currently change the protagonist&apos;s main objective. Consider introducing a revelation in Episode 8 that forces Maren to abandon her original goal.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="world" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableCard title="World Rules" content="The story exists in a present-day city-state with expanded state surveillance infrastructure. No fantastical elements. Technology is real and current. The 'program' is a behavioral conditioning system, not mind control — subtle, deniable, legally defensible." />
            <EditableCard title="The Program" content="Codenamed MERIDIAN. A joint state-intelligence project that maps and modifies behavioral anchors through a combination of pharmacological intervention and targeted psychological conditioning. Officially: a rehabilitation program." />
            <EditableCard title="Factions" content="State Authority — Director Vael's branch. Operates within the law, barely.\nThe Disappeared — former program subjects, most of whom have been resettled under new identities.\nThe Dissenters — small internal resistance. Tobias Renard is one." />
            <EditableCard title="World Tone" content="Cold, institutional. Modern architecture. Quiet bureaucratic menace. Ordinary people doing extraordinary harm through procedural obedience." />
          </div>
        </TabsContent>

        <TabsContent value="characters" className="mt-0">
          <div className="space-y-3">
            {[
              { name: 'Maren Solis', role: 'Protagonist', summary: 'Operates on incomplete information, instinct, and controlled aggression. Has a blind spot for trusting her brother\'s encoded message over her own safety.' },
              { name: 'Director Vael', role: 'Antagonist', summary: 'Believes the program is necessary. Genuinely considers himself a protector of social stability. His threat is not cruelty — it is institutional conviction.' },
              { name: 'Yuna Park', role: 'Supporting', summary: 'Maren\'s emotional counterweight. Grounded where Maren is sharp. Her arc moves from reluctant helper to committed participant.' },
              { name: 'Tobias Renard', role: 'Supporting', summary: 'Former program operative who helped design the conditioning protocols. His guilt is the engine of his arc.' },
              { name: 'Lira Doss', role: 'Wildcard', summary: 'Appears to be helping Maren. May be operating under different instructions. True allegiance is the series\' central mystery.' },
            ].map(c => (
              <div key={c.name} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">{c.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="relationships" className="mt-0">
          <div className="space-y-3">
            {[
              { a: 'Maren', b: 'Yuna', rel: 'Close friends. Maren trusts Yuna more than anyone but rarely says so.', tension: 'Yuna\'s safety vs. Maren\'s recklessness.' },
              { a: 'Maren', b: 'Vael', rel: 'Adversarial. Vael underestimates her until Episode 5.', tension: 'He holds the institutional power; she has nothing to lose.' },
              { a: 'Maren', b: 'Tobias', rel: 'Wary collaboration. She needs his knowledge; he needs absolution.', tension: 'She is not ready to forgive him for his role in the program.' },
              { a: 'Maren', b: 'Lira', rel: 'Carefully transactional. Maren doesn\'t trust Lira but can\'t afford to dismiss her.', tension: 'Lira always knows more than she reveals.' },
              { a: 'Vael', b: 'Tobias', rel: 'Former mentor and protégé. Vael made Tobias\'s career.', tension: 'Tobias\'s defection is the deepest betrayal Vael has experienced.' },
            ].map((r, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">{r.a}</span>
                  <GitMerge size={12} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{r.b}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{r.rel}</p>
                <p className="text-[11px] text-amber-400/80 leading-relaxed">Tension: {r.tension}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <div className="space-y-2">
            {[
              { time: '3 years before S1', event: 'Maren\'s brother Daire enters MERIDIAN as a "volunteer participant."' },
              { time: '2 years before S1', event: 'Daire stops making contact. Maren files a missing person report. Officially closed — insufficient evidence.' },
              { time: '6 months before S1', event: 'Maren resigns from her intelligence analyst position. Begins self-funded investigation.' },
              { time: 'S1 Episode 1', event: 'Maren receives an encoded broadcast that uses a phrase only Daire would know. Active story begins.' },
              { time: 'S1 Episode 5 (planned)', event: 'Yuna is captured. Maren operates alone.' },
              { time: 'S1 Episode 8 (planned)', event: 'Midpoint: Vael reveals that Daire is alive and is now working for the program willingly.' },
              { time: 'S1 Finale (planned)', event: 'Maren must choose between exposing the program publicly or extracting Daire — she cannot do both.' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {i < 6 && <div className="w-px flex-1 bg-border mt-1 mb-1" style={{ minHeight: 20 }} />}
                </div>
                <div className="pb-3 flex-1">
                  <div className="text-[10px] text-amber-400 font-medium mb-0.5">{t.time}</div>
                  <p className="text-xs text-foreground leading-relaxed">{t.event}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lore" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableCard title="Important Secrets" content="Lira Doss was a MERIDIAN subject herself. She does not know Maren knows this.\n\nThe 'encoded signal' was not sent by Daire. It was sent by Tobias to force Maren into action." />
            <EditableCard title="Setup & Payoff" content="EP1: The silver thumb ring → EP12: Maren uses it as proof of identity to Daire.\n\nEP3: Tobias's burn-mark reference → EP9: Full reveal of how he received it during the program." />
            <EditableCard title="Rules the Audience Must Never Know" content="MERIDIAN can only condition, not erase. Daire still has his full memory — he is choosing to stay.\n\nVael has a terminal diagnosis. His urgency to protect the program is also self-preservation of his legacy." />
            <EditableCard title="Planned Reveals" content="EP8 midpoint: Daire is alive and chose to stay.\nEP14: Lira is Vael's daughter.\nEP20 finale: The program was originally Tobias's design, not Vael's." />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
