'use client'

import { Button } from '@/components/ui/button'

export default function ProductionEpisodeError({ reset }: { reset: () => void }) {
  return <div className="flex flex-1 items-center justify-center p-8 text-center"><div><h1 className="text-lg font-semibold">Unable to load storyboard</h1><p className="mt-2 text-xs text-muted-foreground">The production data could not be loaded.</p><Button onClick={reset} className="mt-4">Try again</Button></div></div>
}
