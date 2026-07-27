'use client'

import { ChevronRight, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SidebarSection } from '@/lib/navigation'

interface AIPanelProps {
  open: boolean
  onClose: () => void
  onNavigate: (section: SidebarSection) => void
  projectName: string
}

const tools = [
  {
    title: 'Episode Outline',
    description: 'Generate a structured episode outline using approved characters and locations.',
  },
  {
    title: 'Scene Planning',
    description: 'Turn an applied episode outline into editable scene suggestions.',
  },
]

export function AIPanel({ open, onClose, onNavigate, projectName }: AIPanelProps) {
  return (
    <aside className={cn(
      'w-72 flex-col h-full bg-card border-l border-border shrink-0 transition-all duration-200',
      open ? 'flex' : 'hidden',
    )}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20">
            <Sparkles size={11} className="text-amber-400" />
          </div>
          <span className="text-xs font-semibold text-foreground">AI Tools</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close AI Tools"
        >
          <X size={14} />
        </button>
      </div>

      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Current project</div>
        <div className="text-xs font-medium text-foreground">{projectName}</div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {tools.map(tool => (
          <article key={tool.title} className="rounded-lg border border-border bg-muted/20 p-3">
            <h3 className="text-xs font-semibold">{tool.title}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{tool.description}</p>
            <button
              onClick={() => onNavigate('all-episodes')}
              className="mt-3 flex items-center gap-1 text-[11px] font-medium text-amber-400 transition-colors hover:text-amber-300"
            >
              Open Episodes
              <ChevronRight size={11} />
            </button>
          </article>
        ))}
        <p className="px-1 pt-2 text-[10px] leading-relaxed text-muted-foreground">
          More AI production tools will appear after their workflows are implemented.
        </p>
      </div>
    </aside>
  )
}
