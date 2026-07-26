import Link from 'next/link'
import { Clapperboard } from 'lucide-react'

export function ProjectsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur flex items-center px-6">
        <Link href="/projects" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Clapperboard size={16} className="text-amber-400" />
          </span>
          <span className="font-bold tracking-tight">ScenePilot</span>
        </Link>
      </header>
      {children}
    </div>
  )
}
