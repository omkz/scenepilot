'use client'

import { deleteEpisodeAction } from '@/app/projects/[projectId]/episodes/actions'
import type { EpisodeDto } from '@/lib/episodes/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function EpisodeDeleteDialog({ projectId, episode }: { projectId: string; episode: EpisodeDto }) {
  return <Dialog><DialogTrigger render={<Button size="sm" variant="ghost" className="text-red-400" />}>Delete</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete Episode {String(episode.episodeNumber).padStart(2, '0')}?</DialogTitle><DialogDescription>This permanently deletes the episode, all scenes, and all assignments. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><form action={deleteEpisodeAction.bind(null, projectId, episode.id)}><Button type="submit" variant="destructive">Delete permanently</Button></form></DialogFooter></DialogContent></Dialog>
}
