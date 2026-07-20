'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ACTIVE_PROJECT } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Settings2, Tv2, Sliders, Users, Bell, Lock, Cpu,
  ChevronRight, Save, Trash2, AlertTriangle, CheckCircle2
} from 'lucide-react'

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground mb-0.5">{label}</div>
        {description && <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function TextInput({ value, placeholder }: { value?: string; placeholder?: string }) {
  return (
    <input
      defaultValue={value}
      placeholder={placeholder}
      className="h-7 px-2.5 text-xs bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring w-52"
    />
  )
}

function Select({ value, options }: { value: string; options: string[] }) {
  return (
    <select
      defaultValue={value}
      className="h-7 px-2.5 text-xs bg-muted border border-border rounded-md text-foreground outline-none focus:ring-1 focus:ring-ring w-52 cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

function Toggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled)
  return (
    <button
      onClick={() => setOn(p => !p)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors shrink-0',
        on ? 'bg-amber-500' : 'bg-muted border border-border'
      )}
    >
      <div className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
        on ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: <Settings2 size={13} /> },
  { id: 'format', label: 'Format & Style', icon: <Tv2 size={13} /> },
  { id: 'generation', label: 'AI Generation', icon: <Cpu size={13} /> },
  { id: 'team', label: 'Team & Access', icon: <Users size={13} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={13} /> },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={13} /> },
]

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general')

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r border-border flex flex-col shrink-0 py-3">
        {SETTINGS_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2 text-xs transition-colors',
              activeSection === s.id
                ? 'text-foreground bg-accent font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              s.id === 'danger' && activeSection !== 'danger' && 'text-destructive/70 hover:text-destructive'
            )}
          >
            <span className={cn(
              activeSection === s.id ? 'text-amber-400' : '',
              s.id === 'danger' ? 'text-destructive/70' : ''
            )}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg">
          {activeSection === 'general' && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4">General Settings</h2>
              <div className="bg-card border border-border rounded-xl px-5">
                <Field label="Project Name" description="The display name shown throughout ScenePilot.">
                  <TextInput value={ACTIVE_PROJECT.name} />
                </Field>
                <Field label="Project Status" description="Active projects appear in your main workspace.">
                  <Select value="Active" options={['Active', 'Draft', 'Archived']} />
                </Field>
                <Field label="Current Season" description="Season number for episode numbering.">
                  <TextInput value={String(ACTIVE_PROJECT.currentSeason)} />
                </Field>
                <Field label="Default Language" description="Script and subtitle generation language.">
                  <Select value="English" options={['English', 'Spanish', 'French', 'Mandarin', 'Japanese']} />
                </Field>
              </div>
            </div>
          )}

          {activeSection === 'format' && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4">Format & Style</h2>
              <div className="bg-card border border-border rounded-xl px-5">
                <Field label="Content Format" description="The narrative structure for this project.">
                  <Select value="Serialized Short Drama" options={['Serialized Short Drama', 'Anthology', 'Mini Series', 'Web Comic']} />
                </Field>
                <Field label="Orientation" description="Primary output aspect ratio.">
                  <Select value="Vertical 9:16" options={['Vertical 9:16', 'Horizontal 16:9', 'Square 1:1']} />
                </Field>
                <Field label="Target Episode Duration" description="Used for pacing guidance in script generation.">
                  <Select value="8–10 minutes" options={['3–5 minutes', '5–8 minutes', '8–10 minutes', '10–15 minutes']} />
                </Field>
                <Field label="Visual Style" description="Base aesthetic applied during storyboard generation.">
                  <Select value="Cinematic Realism" options={['Cinematic Realism', 'Stylized Drama', 'Dark Neo-Noir', 'Elevated Genre']} />
                </Field>
              </div>
            </div>
          )}

          {activeSection === 'generation' && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4">AI Generation</h2>
              <div className="bg-card border border-border rounded-xl px-5">
                <Field label="Auto Continuity Check" description="Run continuity checks after each scene is approved.">
                  <Toggle enabled={true} />
                </Field>
                <Field label="Auto Generate Storyboard" description="Begin storyboard generation when script is approved.">
                  <Toggle enabled={false} />
                </Field>
                <Field label="Voice Auto-Match" description="Automatically match characters to voice profiles.">
                  <Toggle enabled={true} />
                </Field>
                <Field label="Scene Generation Quality" description="Higher quality uses more credits per scene.">
                  <Select value="High" options={['Standard', 'High', 'Ultra']} />
                </Field>
                <Field label="Parallel Job Limit" description="Max simultaneous generation jobs.">
                  <Select value="3 jobs" options={['1 job', '2 jobs', '3 jobs', '5 jobs', 'Unlimited']} />
                </Field>
              </div>
            </div>
          )}

          {activeSection === 'team' && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4">Team & Access</h2>
              <div className="bg-card border border-border rounded-xl px-5 mb-4">
                {[
                  { name: 'Kira Lee', email: 'kira@studio.io', role: 'Owner', initials: 'KL', color: 'bg-blue-700' },
                  { name: 'Pablo Reyes', email: 'pablo@studio.io', role: 'Editor', initials: 'PR', color: 'bg-emerald-700' },
                  { name: 'Sasha M.', email: 'sasha@studio.io', role: 'Viewer', initials: 'SM', color: 'bg-rose-700' },
                ].map(member => (
                  <div key={member.email} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', member.color)}>
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground">{member.name}</div>
                      <div className="text-[10px] text-muted-foreground">{member.email}</div>
                    </div>
                    <Select value={member.role} options={['Owner', 'Editor', 'Viewer']} />
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs border-border">
                <Users size={11} className="mr-1" /> Invite Member
              </Button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4">Notifications</h2>
              <div className="bg-card border border-border rounded-xl px-5">
                <Field label="Generation Complete" description="Notify when a storyboard, video, or voice job finishes.">
                  <Toggle enabled={true} />
                </Field>
                <Field label="Continuity Warnings" description="Alert when new continuity issues are detected.">
                  <Toggle enabled={true} />
                </Field>
                <Field label="Team Activity" description="Notify when team members make changes.">
                  <Toggle enabled={false} />
                </Field>
                <Field label="Weekly Report" description="Receive a weekly production progress summary.">
                  <Toggle enabled={true} />
                </Field>
              </div>
            </div>
          )}

          {activeSection === 'danger' && (
            <div>
              <h2 className="text-sm font-bold text-destructive mb-4">Danger Zone</h2>
              <div className="space-y-3">
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <div className="text-xs font-semibold text-foreground mb-0.5">Archive Project</div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">Move this project to archived status. All data is preserved. You can restore it at any time.</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                    Archive Project
                  </Button>
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <div className="text-xs font-semibold text-foreground mb-0.5">Delete Project</div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">Permanently delete this project and all associated episodes, assets, and generated content. This cannot be undone.</p>
                  <Button size="sm" variant="destructive" className="h-7 text-xs">
                    <Trash2 size={11} className="mr-1" /> Delete Project
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeSection !== 'danger' && activeSection !== 'team' && (
            <div className="mt-5 flex items-center gap-3">
              <Button size="sm" className="h-8 text-xs px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                <Save size={12} className="mr-1.5" /> Save Changes
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
