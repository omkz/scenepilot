'use client'

import { cn } from '@/lib/utils'
import { AI_SUGGESTIONS } from '@/lib/mock-data'
import { SidebarSection } from './project-sidebar'
import { Sparkles, X, ChevronRight, Cpu, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AIPanelProps {
  open: boolean
  onClose: () => void
  onNavigate: (section: SidebarSection) => void
}

const SECTION_MAP: Record<string, SidebarSection> = {
  'story-studio': 'story-studio',
  episodes: 'all-episodes',
  production: 'storyboards',
}

export function AIPanel({ open, onClose, onNavigate }: AIPanelProps) {
  return (
    <div className={cn(
      'w-72 flex flex-col h-full bg-card border-l border-border shrink-0 transition-all duration-200',
      open ? 'flex' : 'hidden'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
            <Sparkles size={11} className="text-amber-400" />
          </div>
          <span className="text-xs font-semibold text-foreground">Showrunner AI</span>
          <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500/15 text-amber-400 border-amber-500/30">
            Active
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Context summary */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Current Context</div>
        <div className="text-xs text-foreground font-medium">Crimson Signal</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">6 episodes planned · 2 in production</div>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb size={11} className="text-amber-400" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Recommendations</span>
        </div>

        {AI_SUGGESTIONS.map((s, i) => (
          <div
            key={s.id}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5 hover:border-amber-500/30 transition-colors"
          >
            <p className="text-xs text-foreground leading-relaxed">{s.message}</p>
            <button
              onClick={() => onNavigate(SECTION_MAP[s.href] || 'overview')}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              {s.action}
              <ChevronRight size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2">
          <Cpu size={12} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Ask the Showrunner AI..."
            className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  )
}
