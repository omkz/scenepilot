'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { ArrowLeft, ArrowRight, ImageIcon, LoaderCircle, Sparkles, Star, Trash2, Upload } from 'lucide-react'
import {
  deleteAssetImageAction,
  generateAssetConceptsAction,
  listAssetImagesAction,
  prepareAssetImageUploadAction,
  reorderAssetImagesAction,
  setAssetImageAsMasterAction,
  updateAssetImageMetadataAction,
} from '@/app/projects/[projectId]/story-studio/asset-image-actions'
import type {
  AssetImageDto,
  AssetStorageStatusDto,
  AssetType,
  ImageAIStatusDto,
} from '@/lib/assets/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const copy = {
  character: {
    guidance: 'Upload visual inspiration for this character. Use the Character Master Reference to lock the character’s face, posture, cultural identity, social presence, and foundational appearance across costumes and storyboard shots.',
    master: 'Character Master Reference',
    recommendation: 'Cinematic three-quarter character concept framed from the thighs or knees upward, with a clear face, visible posture, identity-defining accessories, and restrained foundational clothing.',
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
  storage_unavailable: 'Image storage is not configured correctly.',
  upload_failed: 'The image upload could not be completed.',
}

const defaultStorageStatus: AssetStorageStatusDto = {
  configured: false,
  driver: 'local',
  uploadMode: 'server',
}

const defaultImageAIStatus: ImageAIStatusDto = {
  configured: false,
  provider: 'qwen',
  model: 'qwen-image-2.0-pro',
  candidateCount: 4,
}

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

function ImagePreview({
  src,
  alt,
  width,
  height,
  imageClassName,
}: {
  src: string
  alt: string
  width: number
  height: number
  imageClassName: string
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={<button type="button" className="block w-full cursor-zoom-in overflow-hidden rounded-lg" />}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          unoptimized
          className={imageClassName}
        />
      </DialogTrigger>
      <DialogContent className="!max-w-[min(94vw,80rem)] bg-black/95 p-3">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Larger preview of the stored visual reference.
        </DialogDescription>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          unoptimized
          className="max-h-[86vh] w-full rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}

export function AssetImageManager({
  projectId,
  assetType,
  assetId,
  images,
  storageStatus = defaultStorageStatus,
  imageAIStatus = defaultImageAIStatus,
  linkedCharacterHasMaster,
}: {
  projectId: string
  assetType: AssetType
  assetId: string
  images: AssetImageDto[]
  storageStatus?: AssetStorageStatusDto
  imageAIStatus?: ImageAIStatusDto
  linkedCharacterHasMaster?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const master = images.find(image => image.imageRole === 'Master Reference')
  const inspiration = images.filter(image => image.imageRole === 'Inspiration')
  const generatedConcepts = images
    .filter(image => image.imageRole === 'Generated Concept')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const details = copy[assetType]
  const characterMasterMissing = assetType === 'costume' && linkedCharacterHasMaster !== true

  const refreshResult = (result: { ok: boolean; reason?: string }, success = 'Visual references updated.') => {
    setMessage(result.ok
      ? success
      : resultMessages[result.reason || ''] || 'The image action failed.')
    router.refresh()
  }

  const resetUploadFields = () => {
    setSourceUrl('')
    setSourceNote('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const pollForBlobImage = async (storageKey: string) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await wait(750)
      const current = await listAssetImagesAction(projectId, assetType, assetId)
      if (current.some(image => image.storageKey === storageKey)) return true
    }
    return false
  }

  const uploadLocal = async (file: File) => {
    const formData = new FormData()
    formData.set('projectId', projectId)
    formData.set('assetType', assetType)
    formData.set('assetId', assetId)
    formData.set('file', file)
    formData.set('sourceUrl', sourceUrl)
    formData.set('sourceNote', sourceNote)
    const response = await fetch('/api/asset-images/local-upload', {
      method: 'POST',
      body: formData,
    })
    return response.json() as Promise<{ ok: boolean; reason?: string; value?: AssetImageDto }>
  }

  const uploadBlob = async (file: File) => {
    const prepared = await prepareAssetImageUploadAction({
      projectId,
      assetType,
      assetId,
      originalFilename: file.name,
      sourceUrl: sourceUrl || undefined,
      sourceNote: sourceNote || undefined,
    })
    if (!prepared.ok) return prepared
    await upload(prepared.pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/asset-images/upload',
      clientPayload: prepared.clientPayload,
      contentType: file.type,
      multipart: true,
    })
    setMessage('Upload received. Verifying the image…')
    const verified = await pollForBlobImage(prepared.pathname)
    return verified
      ? { ok: true as const }
      : { ok: false as const, reason: 'verification_timeout' }
  }

  const uploadImage = async () => {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    if (!storageStatus.configured) {
      setMessage(resultMessages.storage_unavailable)
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const result = storageStatus.uploadMode === 'server'
        ? await uploadLocal(file)
        : await uploadBlob(file)
      if (!result.ok) {
        setMessage(result.reason === 'verification_timeout'
          ? 'Verification is taking longer than expected. Refresh to check the upload.'
          : resultMessages[result.reason || ''] || 'The upload could not be completed.')
        return
      }
      setMessage('Image uploaded and verified.')
      resetUploadFields()
      router.refresh()
    } catch {
      setMessage(resultMessages.upload_failed)
    } finally {
      setUploading(false)
    }
  }

  const reorder = (imageId: string, offset: number) => {
    const index = inspiration.findIndex(image => image.id === imageId)
    const target = index + offset
    if (index < 0 || target < 0 || target >= inspiration.length) return
    const ids = inspiration.map(image => image.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    startTransition(async () => {
      const result = await reorderAssetImagesAction(projectId, assetType, assetId, ids)
      refreshResult(result)
    })
  }

  const removeImage = (imageId: string) => startTransition(async () => {
    const result = await deleteAssetImageAction(projectId, assetType, assetId, imageId)
    refreshResult(result, 'Image removed. Storage cleanup is complete or queued for retry.')
  })

  const generateConcepts = () => startTransition(async () => {
    setMessage('')
    const result = await generateAssetConceptsAction(projectId, assetType, assetId)
    setMessage(result.ok
      ? `${result.count} concept candidate${result.count === 1 ? '' : 's'} generated and saved.`
      : result.message)
    if (result.ok) router.refresh()
  })

  return <section className="space-y-4 border-t px-4 pb-6 pt-5">
    <div>
      <h3 className="text-sm font-semibold">Visual References</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{details.guidance}</p>
    </div>

    <div className="rounded-xl border bg-muted/10 p-3">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Master Reference</div>
      {master ? <div className={cn(
        'grid items-start gap-5 md:grid-cols-[minmax(280px,360px)_1fr]',
        assetType === 'location' && 'md:grid-cols-[minmax(360px,520px)_1fr]',
      )}>
        <ImagePreview
          src={master.storageUrl}
          alt={details.master}
          width={master.width || 560}
          height={master.height || 560}
          imageClassName={cn(
            'w-full rounded-lg border bg-black/20',
            assetType === 'location'
              ? 'aspect-[4/3] max-h-[32rem] object-contain'
              : 'aspect-[3/4] max-h-[38rem] object-contain',
          )}
        />
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400"><Star size={11} /> {details.master}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">{details.recommendation}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">{master.originalFilename || 'Uploaded image'} · {Math.round(master.sizeBytes / 1024)} KB</p>
          {master.generationProvider && <p className="mt-1 text-[10px] text-muted-foreground">
            Generated by {master.generationProvider} · {master.generationModel}
          </p>}
          {master.sourceUrl && <a href={master.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[10px] text-amber-400">View source</a>}
          {master.sourceNote && <p className="mt-1 text-[10px] text-muted-foreground">{master.sourceNote}</p>}
          <Button type="button" size="sm" variant="ghost" className="mt-2 text-red-400" disabled={pending} onClick={() => removeImage(master.id)}><Trash2 size={10} /> Remove Master</Button>
        </div>
      </div> : <div className="flex h-28 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"><ImageIcon size={14} className="mr-2" /> No master reference</div>}
    </div>

    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Inspiration Images</div>
        <span className="text-[10px] text-muted-foreground">{inspiration.length} / 5 inspiration images</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || !storageStatus.configured} />
        <Input value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} type="url" maxLength={2000} placeholder="Optional source URL" disabled={uploading} />
        <Input value={sourceNote} onChange={event => setSourceNote(event.target.value)} maxLength={500} placeholder="Optional source note" disabled={uploading} className="sm:col-span-2" />
      </div>
      <Button type="button" size="sm" variant="outline" onClick={uploadImage} disabled={uploading || !storageStatus.configured} className="mt-2">
        {uploading ? <LoaderCircle size={11} className="animate-spin" /> : <Upload size={11} />}
        {uploading ? 'Uploading…' : 'Upload Inspiration'}
      </Button>
      {!storageStatus.configured && <p className="mt-2 text-[11px] text-amber-400">
        {storageStatus.driver === 'vercel-blob'
          ? 'Vercel Blob storage requires BLOB_READ_WRITE_TOKEN.'
          : 'Local asset storage configuration is invalid.'}
      </p>}
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
          const result = await updateAssetImageMetadataAction(projectId, assetType, assetId, image.id, formData)
          refreshResult(result, 'Source metadata saved.')
        }} className="mt-2 space-y-1">
          <Input name="sourceUrl" type="url" defaultValue={image.sourceUrl || ''} maxLength={2000} placeholder="Source URL" className="h-7 text-[10px]" />
          <Input name="sourceNote" defaultValue={image.sourceNote || ''} maxLength={500} placeholder="Source note" className="h-7 text-[10px]" />
          <Button type="submit" size="sm" variant="ghost" className="h-6 text-[10px]">Save source</Button>
        </form>
        <div className="mt-1 flex flex-wrap">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5" disabled={pending} onClick={() => reorder(image.id, -1)}><ArrowLeft size={10} /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5" disabled={pending} onClick={() => reorder(image.id, 1)}><ArrowRight size={10} /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 text-amber-400" disabled={pending} onClick={() => startTransition(async () => {
            const result = await setAssetImageAsMasterAction(projectId, assetType, assetId, image.id)
            refreshResult(result)
          })}><Star size={10} /> Master</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 text-red-400" disabled={pending} onClick={() => removeImage(image.id)}><Trash2 size={10} /></Button>
        </div>
      </div>)}
    </div>}

    <div className="rounded-xl border bg-muted/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Generated Concepts</div>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-muted-foreground">
            Generate original candidates from this asset&apos;s visual direction and reference images. Candidates remain supporting concepts until you promote one.
          </p>
        </div>
        {imageAIStatus.configured ? <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !storageStatus.configured || characterMasterMissing}
          onClick={generateConcepts}
        >
          {pending ? <LoaderCircle size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {pending
            ? 'Generating concepts…'
            : `Generate ${assetType === 'character' ? 'Character' : assetType === 'costume' ? 'Costume' : 'Location'} Concepts`}
        </Button> : <p className="text-[11px] text-amber-400">Image concept generation is not configured.</p>}
      </div>
      {characterMasterMissing && <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
        This Costume needs a Character Master Reference to preserve the linked character&apos;s identity. Return to the linked Character, upload or generate a suitable reference, and promote it to Master.
      </p>}
      {generatedConcepts.length > 0 ? <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {generatedConcepts.map(image => <div key={image.id} className="rounded-xl border bg-card p-3">
          <ImagePreview
            src={image.storageUrl}
            alt="Generated asset concept"
            width={image.width || 720}
            height={image.height || 960}
            imageClassName={cn(
              'w-full rounded-lg border bg-black/20',
              assetType === 'location'
                ? 'aspect-[4/3] max-h-[34rem] object-contain'
                : 'aspect-[3/4] max-h-[40rem] object-contain',
            )}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-300">Generated Concept</span>
            {image.generationProvider && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {image.generationProvider} · {image.generationModel}
            </span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 text-amber-400" disabled={pending} onClick={() => startTransition(async () => {
              const result = await setAssetImageAsMasterAction(projectId, assetType, assetId, image.id)
              refreshResult(result)
            })}><Star size={10} /> Promote to Master</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 text-red-400" disabled={pending} onClick={() => removeImage(image.id)}><Trash2 size={10} /></Button>
          </div>
        </div>)}
      </div> : <div className="mt-3 flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
        No generated concepts yet
      </div>}
    </div>
    {message && <p className="text-[11px] text-muted-foreground">{message}</p>}
  </section>
}
