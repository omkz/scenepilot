import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProjectNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-muted-foreground mt-2">This project does not exist or has been archived.</p>
        <Button render={<Link href="/projects" />} className="mt-5">Return to Projects</Button>
      </div>
    </div>
  )
}
