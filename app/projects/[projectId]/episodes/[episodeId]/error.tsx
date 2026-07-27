'use client'

import { Button } from '@/components/ui/button'

export default function EpisodeError({ reset }: { reset: () => void }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center"><div><h1 className="text-lg font-semibold">Unable to load episode</h1><p className="mt-2 text-xs text-muted-foreground">The episode workspace could not load its database records.</p><Button onClick={reset} className="mt-4">Try again</Button></div></div>
}
