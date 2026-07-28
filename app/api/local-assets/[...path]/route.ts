import {
  localAssetContentType,
  readLocalAsset,
  validateLocalAssetStorageKey,
} from '@/lib/storage/local-asset-storage'
import { getAssetStorageStatus } from '@/lib/storage/asset-storage'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const status = getAssetStorageStatus()
  if (status.driver !== 'local') return new Response(null, { status: 404 })
  const segments = (await params).path
  const key = segments.join('/')
  const contentType = localAssetContentType(key)
  if (!contentType || !validateLocalAssetStorageKey(key)) {
    return new Response(null, { status: 404 })
  }
  try {
    const bytes = await readLocalAsset(key)
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
