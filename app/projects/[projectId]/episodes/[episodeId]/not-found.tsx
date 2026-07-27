import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function EpisodeNotFound() {
  return <div className="flex flex-1 items-center justify-center p-6 text-center"><div><h1 className="text-lg font-semibold">Episode not found</h1><p className="mt-2 text-xs text-muted-foreground">This episode does not exist in the project or has been archived.</p><Button render={<Link href="../" />} className="mt-4">Return to Episodes</Button></div></div>
}
