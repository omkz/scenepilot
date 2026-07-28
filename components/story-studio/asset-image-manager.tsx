'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { ArrowLeft, ArrowRight, ImageIcon, LoaderCircle, Star, Trash2, Upload } from 'lucide-react'
import {
  deleteAssetImageAction,
  prepareAssetImageUploadAction,
  reorderAssetImagesAction,
  setAssetImageAsMasterAction,
  updateAssetImageMetadataAction,
} from '@/app/projects/[projectId]/story-studio/asset-image-actions'
import type { AssetImageDto, AssetType } from '@/lib/assets/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const copy = {
  character: {
    guidance: 'Upload visual inspiration for this character. Use the Master Portrait to lock the character’s face and identity across future costumes and storyboard shots.',
    master: 'Character Master Portrait',
    recommendation: 'Portrait or chest-up, clear face, neutral expression, simple background, and minimal dramatic lighting.',
  },
  costume: {
    guidance: 'Upload clothing or armor inspiration. The Master Costume Reference should show the selected character wearing this costume from head to toe.',
    master: 'Costume Master Full Body',
    recommendation: 'Full body, recognizable linked character, visible outfit and important accessories, neutral pose, and uncropped feet.',
  },
  location: {
    guidance: 'Upload environment inspiration. The Master Location Reference should establish the architecture, spatial identity, atmosphere, and recurring landmarks of this place.',
    master: 'Location Master Establishing View',
    recommendation: 'Establishing view with clear architecture and landmarks, without a dominant close-up character.',
  },
} as const

const resultMessages: Record<string, string> = {
  not_found: 'The image or asset could not be found.',
  invalid_file: 'The selected file is empty or invalid.',
  file_too_large: 'Images must be 10 MB or smaller.',
  unsupported_type: 'Use a JPEG, PNG, or WebP image.',
  image_limit_reached: 'This asset already has five inspiration images.',
  asset_archived: 'Archived assets cannot receive new images.',
  cross_project_reference: 'The image does not belong to this project asset.',
  storage_unavailable: 'Image storage is not configured.',
  upload_failed: 'The image upload could not be completed.',
  delete_failed: 'The image record was removed, but storage cleanup needs retrying.',
}

export function AssetImageManager({
  projectId,
  assetType,
  assetId,
  images,
  storageConfigured,
}: {
  projectId: string
  assetType: AssetType
  assetId: string
  images: AssetImageDto[]
  storageConfigured: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sourceNote, setSourceNote] = useState('')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const master = images.find(image => image.imageRole === 'Master Reference')
  const inspiration = images.filter(image => image.imageRole !== 'Master Reference')
  const details = copy[assetType]

  const refreshResult = (result: { ok: boolean; reason?: string }) => {
    if (!result.ok) setMessage(resultMessages[result.reason || ''] || 'The image action failed.')
    else setMessage('Visual references updated.')
    router.refresh()
  }

  const uploadImage = async () => {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    if (!storageConfigured) {
      setMessage(resultMessages.storage_unavailable)
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const prepared = await prepareAssetImageUploadAction({
        projectId,
        assetType,
        assetId,
        originalFilename: file.name,
        sourceNote,
      })
      if (!prepared.ok) {
        setMessage(resultMessages[prepared.reason] || 'The upload could not be prepared.')
        return
      }
      await upload(prepared.pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/asset-images/upload',
        clientPayload: prepared.clientPayload,
        contentType: file.type,
        multipart: true,
      })
      setMessage('Upload completed. The reference is being verified and saved.')
      setSourceNote('')
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } catch {
      setMessage(resultMessages.upload_failed)
    } finally {
      setUploading(false)
    }
  }

  const reorder = (imageId: string, offset: number) => {
    const index = images.findIndex(image => image.id === imageId)
    const target = index + offset
    if (index < 0 || target < 0 || target >= images.length) return
    const ids = images.map(image => image.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    startTransition(async () => {
      const result = await reorderAssetImagesAction(projectId, assetType, assetId, ids)
      refreshResult(result)
    })
  }

  return <section className="space-y-4 border-t px-4 pb-6 pt-5">
    <div>
      <h3 className="text-sm font-semibold">Visual References</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{details.guidance}</p>
    </div>

    <div className="rounded-xl border bg-muted/10 p-3">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Master Reference</div>
      {master ? <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Image
          src={master.storageUrl}
          alt={details.master}
          width={master.width || 560}
          height={master.height || 560}
          unoptimized
          className={cn(
            'h-36 w-full rounded-lg border bg-black/20',
            assetType === 'costume' ? 'object-contain' : 'object-cover',
          )}
        />
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400"><Star size={11} /> {details.master}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">{details.recommendation}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">{master.originalFilename || 'Uploaded image'} · {Math.round(master.sizeBytes / 1024)} KB</p>
          <Button type="button" size="sm" variant="ghost" className="mt-2 text-red-400" disabled={pending} onClick={() => startTransition(async () => {
            const result = await deleteAssetImageAction(projectId, assetType, assetId, master.id)
            refreshResult(result)
          })}><Trash2 size={10} /> Remove Master</Button>
        </div>
      </div> : <div className="flex h-28 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"><ImageIcon size={14} className="mr-2" /> No master reference</div>}
    </div>

    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Inspiration Images</div>
        <span className="text-[10px] text-muted-foreground">{inspiration.length} / 5 inspiration images</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || !storageConfigured} />
        <Input value={sourceNote} onChange={event => setSourceNote(event.target.value)} maxLength={500} placeholder="Optional source note" disabled={uploading} />
      </div>
      <Button type="button" size="sm" variant="outline" onClick={uploadImage} disabled={uploading || !storageConfigured} className="mt-2">
        {uploading ? <LoaderCircle size={11} className="animate-spin" /> : <Upload size={11} />}
        {uploading ? 'Uploading…' : 'Upload Inspiration'}
      </Button>
      {!storageConfigured && <p className="mt-2 text-[11px] text-amber-400">Configure BLOB_READ_WRITE_TOKEN to enable uploads.</p>}
    </div>

    {inspiration.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {inspiration.map(image => <div key={image.id} className="rounded-lg border bg-muted/10 p-2">
        <Image
          src={image.storageUrl}
          alt={image.sourceNote || 'Asset inspiration'}
          width={image.width || 448}
          height={image.height || 448}
          unoptimized
          className={cn(
            'h-28 w-full rounded-md bg-black/20',
            assetType === 'costume' ? 'object-contain' : 'object-cover',
          )}
        />
        <div className="mt-2 truncate text-[10px] text-muted-foreground">{image.originalFilename || image.imageRole}</div>
        <form action={async formData => {
          await updateAssetImageMetadataAction(projectId, assetType, assetId, image.id, formData)
          router.refresh()
        }} className="mt-2">
          <Input name="sourceNote" defaultValue={image.sourceNote || ''} maxLength={500} placeholder="Source note" className="h-7 text-[10px]" />
          <input type="hidden" name="sourceUrl" value={image.sourceUrl || ''} />
          <Button type="submit" size="sm" variant="ghost" className="mt-1 h-6 text-[10px]">Save note</Button>
        </form>
        <div className="mt-1 flex flex-wrap">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5" disabled={pending} onClick={() => reorder(image.id, -1)}><ArrowLeft size={10} /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5" disabled={pending} onClick={() => reorder(image.id, 1)}><ArrowRight size={10} /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 text-amber-400" disabled={pending} onClick={() => startTransition(async () => {
            const result = await setAssetImageAsMasterAction(projectId, assetType, assetId, image.id)
            refreshResult(result)
          })}><Star size={10} /> Master</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 text-red-400" disabled={pending} onClick={() => startTransition(async () => {
            const result = await deleteAssetImageAction(projectId, assetType, assetId, image.id)
            refreshResult(result)
          })}><Trash2 size={10} /></Button>
        </div>
      </div>)}
    </div>}
    {message && <p className="text-[11px] text-muted-foreground">{message}</p>}
  </section>
}
