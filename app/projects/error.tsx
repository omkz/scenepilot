'use client'

import { Button } from '@/components/ui/button'

export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Unable to load projects</h1>
        <p className="text-sm text-muted-foreground mt-2">Check the PostgreSQL connection and try again.</p>
        <Button onClick={reset} className="mt-5">Try again</Button>
      </div>
    </div>
  )
}
