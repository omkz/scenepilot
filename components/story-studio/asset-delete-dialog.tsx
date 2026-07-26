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
  blocked?: boolean
}

export function AssetDeleteDialog({ projectId, assetId, assetName, type, blocked = false }: AssetDeleteDialogProps) {
  const action = deleteAssetAction.bind(null, projectId, type, assetId)

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300" />}>
        <Trash2 size={11} className="mr-1" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{blocked ? `Archive “${assetName}” instead?` : `Delete “${assetName}”?`}</DialogTitle>
          <DialogDescription>
            {blocked
              ? 'This character has costume records and cannot be permanently deleted. Archive the character to preserve those relationships.'
              : 'This permanently deletes the asset record. Asset codes are never reused. This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          {!blocked && (
            <form action={action}>
              <Button type="submit" variant="destructive">Delete permanently</Button>
            </form>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
