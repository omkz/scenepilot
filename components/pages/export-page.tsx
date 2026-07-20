'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { EPISODES } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  FileCheck, Share2, Languages, History, Download, CheckCircle2,
  Clock, Film, Play, Plus, RefreshCw, ExternalLink, Smartphone,
  Monitor, ChevronRight, Copy, Zap, Globe
} from 'lucide-react'

type ExportView = 'final-episodes' | 'social-versions' | 'subtitles' | 'export-history'

const EXPORT_FORMATS = [
  { id: 'mp4-9-16', label: 'MP4 · 9:16', icon: <Smartphone size={12} />, desc: 'TikTok, Reels, Shorts' },
  { id: 'mp4-16-9', label: 'MP4 · 16:9', icon: <Monitor size={12} />, desc: 'YouTube, Web' },
  { id: 'mp4-1-1', label: 'MP4 · 1:1', icon: <Globe size={12} />, desc: 'Instagram Feed' },
]

const EXPORT_HISTORY = [
  { id: 'EXP-001', episode: 'Ep 01: The Signal', format: '9:16', resolution: '1080x1920', size: '124 MB', exportedAt: '2h ago', status: 'completed' as const },
  { id: 'EXP-002', episode: 'Ep 01: The Signal', format: '1:1', resolution: '1080x1080', size: '98 MB', exportedAt: '2h ago', status: 'completed' as const },
  { id: 'EXP-003', episode: 'Ep 02: Beneath the Grid', format: '9:16', resolution: '1080x1920', size: '–', exportedAt: 'In progress', status: 'in-progress' as const },
]

const SUBTITLE_LANGUAGES = [
  { lang: 'English', code: 'EN', generated: true, lines: 48 },
  { lang: 'Spanish', code: 'ES', generated: true, lines: 48 },
  { lang: 'Mandarin', code: 'ZH', generated: false, lines: 0 },
  { lang: 'Japanese', code: 'JA', generated: false, lines: 0 },
  { lang: 'Portuguese', code: 'PT', generated: false, lines: 0 },
  { lang: 'French', code: 'FR', generated: false, lines: 0 },
]

function FinalEpisodesTab() {
  const [selectedEp, setSelectedEp] = useState(EPISODES[0].id)
  const [selectedFormat, setSelectedFormat] = useState('mp4-9-16')
  const completedEps = EPISODES.filter(ep => ep.stage === 'completed' || ep.stage === 'published' || ep.productionStatus === 'in-progress')

  return (
    <div className="h-full flex overflow-hidden">
      {/* Episode list */}
      <div className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Ready to Export</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {completedEps.map(ep => (
            <button
              key={ep.id}
              onClick={() => setSelectedEp(ep.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left transition-colors',
                selectedEp === ep.id ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'hover:bg-muted/30'
              )}
            >
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {String(ep.number).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{ep.title}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-muted-foreground capitalize">{ep.productionStatus.replace('-', ' ')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Export config */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-xl">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Ep 01: The Signal
            </h3>
            <p className="text-xs text-muted-foreground">Select format and export settings before generating the final file.</p>
          </div>

          {/* Format selector */}
          <div className="mb-5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">Output Format</div>
            <div className="grid grid-cols-3 gap-2">
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors',
                    selectedFormat === fmt.id
                      ? 'border-amber-500/50 bg-amber-500/8 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground'
                  )}
                >
                  <span className={selectedFormat === fmt.id ? 'text-amber-400' : ''}>{fmt.icon}</span>
                  <span className="text-xs font-medium">{fmt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality settings */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Quality Settings</div>
            {[
              { label: 'Resolution', value: '1080 × 1920' },
              { label: 'Frame Rate', value: '30 fps' },
              { label: 'Bitrate', value: '8 Mbps' },
              { label: 'Subtitles', value: 'Embedded (EN)' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-xs text-foreground font-medium">{s.value}</span>
              </div>
            ))}
          </div>

          <Button size="sm" className="w-full h-9 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Download size={13} className="mr-2" /> Export Episode
          </Button>
        </div>
      </div>
    </div>
  )
}

function SocialVersionsTab() {
  const PLATFORMS = [
    { name: 'TikTok', format: '9:16', maxDuration: '10 min', color: 'bg-zinc-800' },
    { name: 'Instagram Reels', format: '9:16', maxDuration: '90 sec', color: 'bg-rose-900/50' },
    { name: 'YouTube Shorts', format: '9:16', maxDuration: '60 sec', color: 'bg-red-900/50' },
    { name: 'Instagram Feed', format: '1:1', maxDuration: '60 sec', color: 'bg-pink-900/50' },
    { name: 'YouTube', format: '16:9', maxDuration: 'Unlimited', color: 'bg-red-900/50' },
  ]

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="max-w-2xl">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Social Versions</h3>
          <p className="text-xs text-muted-foreground">Create platform-optimized cuts with auto-trimming, hook intros, and captions.</p>
        </div>
        <div className="space-y-2">
          {PLATFORMS.map(p => (
            <div key={p.name} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', p.color)}>
                <Film size={14} className="text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">{p.format} · Max {p.maxDuration}</div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs border-border shrink-0">
                <Zap size={11} className="mr-1" /> Generate
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubtitlesTab() {
  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="max-w-2xl">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Subtitles & Localization</h3>
          <p className="text-xs text-muted-foreground">Generate and manage subtitles across languages. AI translates from the source script.</p>
        </div>
        <div className="space-y-2">
          {SUBTITLE_LANGUAGES.map(lang => (
            <div key={lang.code} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {lang.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground">{lang.lang}</div>
                <div className="text-[11px] text-muted-foreground">
                  {lang.generated ? `${lang.lines} lines generated` : 'Not generated'}
                </div>
              </div>
              {lang.generated ? (
                <div className="flex items-center gap-2 shrink-0">
                  <CheckCircle2 size={13} className="text-green-400" />
                  <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                    <Download size={11} className="mr-1" /> SRT
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs border-border shrink-0">
                  <Languages size={11} className="mr-1" /> Generate
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExportHistoryTab() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground">Export History</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {['Episode', 'Format', 'Resolution', 'Size', 'Exported', 'Status', ''].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EXPORT_HISTORY.map(item => (
            <tr key={item.id} className="border-b border-border hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 text-xs text-foreground">{item.episode}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{item.format}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{item.resolution}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{item.size}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{item.exportedAt}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                  item.status === 'completed'
                    ? 'text-green-400 bg-green-400/10 border-green-400/20'
                    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                )}>
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {item.status === 'completed' && (
                  <div className="flex items-center gap-1">
                    <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <Download size={11} />
                    </button>
                    <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <Copy size={11} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ExportPageProps {
  view: ExportView
}

export function ExportPage({ view }: ExportPageProps) {
  const [activeView, setActiveView] = useState<ExportView>(view)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 border-b border-border">
        {([
          { id: 'final-episodes', label: 'Final Episodes', icon: <FileCheck size={12} /> },
          { id: 'social-versions', label: 'Social Versions', icon: <Share2 size={12} /> },
          { id: 'subtitles', label: 'Subtitles', icon: <Languages size={12} /> },
          { id: 'export-history', label: 'Export History', icon: <History size={12} /> },
        ] as { id: ExportView; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
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
        {activeView === 'final-episodes' && <FinalEpisodesTab />}
        {activeView === 'social-versions' && <SocialVersionsTab />}
        {activeView === 'subtitles' && <SubtitlesTab />}
        {activeView === 'export-history' && <ExportHistoryTab />}
      </div>
    </div>
  )
}
