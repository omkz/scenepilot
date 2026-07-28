import {
  localAssetContentType,
  readLocalAsset,
  validateLocalAssetStorageKey,
} from '@/lib/storage/local-asset-storage'
import { getAssetStorageStatus } from '@/lib/storage/asset-storage'

function parseRange(value: string | null, size: number) {
  if (!value) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(value)
  if (!match) return null
  const suffixLength = !match[1] && match[2] ? Number(match[2]) : null
  const start = suffixLength !== null ? Math.max(0, size - suffixLength) : Number(match[1] || 0)
  const end = suffixLength !== null ? size - 1 : Number(match[2] || size - 1)
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
    return null
  }
  return { start, end: Math.min(end, size - 1) }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const status = getAssetStorageStatus()
  if (status.driver !== 'local') return new Response(null, { status: 404 })
  const key = (await params).path.join('/')
  if (!key.startsWith('production-media/') || !validateLocalAssetStorageKey(key)) {
    return new Response(null, { status: 404 })
  }
  const contentType = localAssetContentType(key)
  if (!contentType) return new Response(null, { status: 404 })
  try {
    const bytes = new Uint8Array(await readLocalAsset(key))
    const headers = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    }
    const rangeHeader = request.headers.get('range')
    if (rangeHeader && contentType === 'video/mp4') {
      const range = parseRange(rangeHeader, bytes.byteLength)
      if (!range) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${bytes.byteLength}` },
        })
      }
      const body = bytes.slice(range.start, range.end + 1)
      return new Response(body, {
        status: 206,
        headers: {
          ...headers,
          'Content-Range': `bytes ${range.start}-${range.end}/${bytes.byteLength}`,
          'Content-Length': String(body.byteLength),
        },
      })
    }
    return new Response(bytes, {
      headers: {
        ...headers,
        'Content-Length': String(bytes.byteLength),
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
