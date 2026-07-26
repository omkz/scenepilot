import { Archive, CheckCircle2, Clock, FileEdit, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssetStatus } from '@/lib/assets/types'

const STATUS_STYLES: Record<AssetStatus, { icon: typeof Clock; className: string }> = {
  Draft: { icon: FileEdit, className: 'text-muted-foreground bg-muted border-border' },
  Pending: { icon: Clock, className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  Approved: { icon: CheckCircle2, className: 'text-green-400 bg-green-400/10 border-green-400/20' },
  Rejected: { icon: XCircle, className: 'text-red-400 bg-red-400/10 border-red-400/20' },
  Archived: { icon: Archive, className: 'text-muted-foreground bg-muted/50 border-border' },
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const configuration = STATUS_STYLES[status]
  const Icon = configuration.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
      configuration.className,
    )}>
      <Icon size={9} />
      {status}
    </span>
  )
}
