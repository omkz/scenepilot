import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProductionEpisodeNotFound() {
  return <div className="flex flex-1 items-center justify-center p-8 text-center"><div><h1 className="text-lg font-semibold">Production episode not found</h1><p className="mt-2 text-xs text-muted-foreground">The episode is unavailable, archived, outside this project, or not ready for Production.</p><Button render={<Link href="../../" />} className="mt-4">Back to Production</Button></div></div>
}
