'use client'

import { Trash2 } from 'lucide-react'
import { deleteAssetAction } from '@/app/projects/[projectId]/story-studio/actions'
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
import { Button } from '@/components/ui/button'

interface AssetDeleteDialogProps {
  projectId: string
  assetId: string
  assetName: string
  type: 'character' | 'costume' | 'location'
}

export function AssetDeleteDialog({ projectId, assetId, assetName, type }: AssetDeleteDialogProps) {
  const action = deleteAssetAction.bind(null, projectId, type, assetId)

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300" />}>
        <Trash2 size={11} className="mr-1" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{assetName}”?</DialogTitle>
          <DialogDescription>
            This permanently deletes the asset record. In-use assets are protected and should be archived instead. Asset codes are never reused.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <form action={action}>
            <Button type="submit" variant="destructive">Delete permanently</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
