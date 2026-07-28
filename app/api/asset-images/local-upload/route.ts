import { z } from 'zod'
import { ASSET_TYPES } from '@/lib/assets/types'
import { ASSET_IMAGE_MAX_BYTES } from '@/lib/assets/image-validation'
import { storeAssetImageUpload } from '@/lib/assets/upload-asset-image'
import { getAssetStorageStatus } from '@/lib/storage/asset-storage'

const inputSchema = z.object({
  projectId: z.uuid(),
  assetType: z.enum(ASSET_TYPES),
  assetId: z.uuid(),
  sourceUrl: z.preprocess(value => value || null, z.url({ protocol: /^https?$/ }).max(2000).nullable()),
  sourceNote: z.preprocess(value => value || null, z.string().trim().max(500).nullable()),
})

export async function POST(request: Request) {
  const status = getAssetStorageStatus()
  if (!status.configured || status.driver !== 'local') {
    return Response.json({ ok: false, reason: 'storage_unavailable' }, { status: 503 })
  }
  try {
    const formData = await request.formData()
    const parsed = inputSchema.safeParse({
      projectId: formData.get('projectId'),
      assetType: formData.get('assetType'),
      assetId: formData.get('assetId'),
      sourceUrl: formData.get('sourceUrl'),
      sourceNote: formData.get('sourceNote'),
    })
    const file = formData.get('file')
    if (!parsed.success || !(file instanceof File) || !file.name) {
      return Response.json({ ok: false, reason: 'invalid_file' }, { status: 400 })
    }
    if (file.size > ASSET_IMAGE_MAX_BYTES) {
      return Response.json({ ok: false, reason: 'file_too_large' }, { status: 413 })
    }
    const result = await storeAssetImageUpload({
      ...parsed.data,
      originalFilename: file.name,
      claimedMimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    }, { driver: 'local' })
    return Response.json(result, { status: result.ok ? 201 : 400 })
  } catch {
    return Response.json({ ok: false, reason: 'upload_failed' }, { status: 400 })
  }
}
