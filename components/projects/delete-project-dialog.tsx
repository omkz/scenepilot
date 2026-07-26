'use client'

import { Trash2 } from 'lucide-react'
import { deleteProjectAction } from '@/app/projects/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DeleteProjectDialogProps {
  projectId: string
  projectName: string
  compact?: boolean
}

export function DeleteProjectDialog({ projectId, projectName, compact = false }: DeleteProjectDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={compact
        ? <button className="w-full text-left px-2 py-1.5 text-xs rounded-md text-red-400 hover:bg-red-500/10" />
        : <Button variant="destructive" size="sm" />
      }>
        <Trash2 size={12} className="mr-1.5 inline" />
        Delete permanently
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{projectName}”?</DialogTitle>
          <DialogDescription>
            This permanently deletes the project record. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <form action={deleteProjectAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <Button type="submit" variant="destructive">Delete permanently</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
