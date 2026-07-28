export const ASSET_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const ASSET_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AssetImageMimeType = typeof ASSET_IMAGE_ALLOWED_MIME_TYPES[number]
export type AssetImageValidationReason =
  | 'invalid_file'
  | 'file_too_large'
  | 'unsupported_type'

export type AssetImageValidationResult =
  | {
      valid: true
      mimeType: AssetImageMimeType
      width: number | null
      height: number | null
    }
  | { valid: false; reason: AssetImageValidationReason }

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return bytes.length >= 24 && signature.every((value, index) => bytes[index] === value)
}

function isWebp(bytes: Uint8Array) {
  return bytes.length >= 16
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3]
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      }
    }
    if (length < 2) break
    offset += length + 2
  }
  return { width: null, height: null }
}

function webpDimensions(bytes: Uint8Array) {
  const chunk = String.fromCharCode(...bytes.slice(12, 16))
  if (chunk !== 'VP8X' || bytes.length < 30) return { width: null, height: null }
  return {
    width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
    height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
  }
}

export function validateAssetImage(input: {
  bytes: Uint8Array
  claimedMimeType: string
  filename?: string | null
  sizeBytes?: number
}): AssetImageValidationResult {
  const sizeBytes = input.sizeBytes ?? input.bytes.byteLength
  if (sizeBytes < 1 || input.bytes.byteLength < 1) return { valid: false, reason: 'invalid_file' }
  if (sizeBytes > ASSET_IMAGE_MAX_BYTES) return { valid: false, reason: 'file_too_large' }

  const detectedMimeType = isJpeg(input.bytes)
    ? 'image/jpeg'
    : isPng(input.bytes)
      ? 'image/png'
      : isWebp(input.bytes)
        ? 'image/webp'
        : null
  if (!detectedMimeType) return { valid: false, reason: 'unsupported_type' }
  if (input.claimedMimeType !== detectedMimeType) return { valid: false, reason: 'unsupported_type' }

  const extension = input.filename?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  const allowedExtensions: Record<AssetImageMimeType, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
  }
  if (extension && !allowedExtensions[detectedMimeType].includes(extension)) {
    return { valid: false, reason: 'unsupported_type' }
  }

  const dimensions = detectedMimeType === 'image/png'
    ? {
        width: (input.bytes[16] << 24) + (input.bytes[17] << 16) + (input.bytes[18] << 8) + input.bytes[19],
        height: (input.bytes[20] << 24) + (input.bytes[21] << 16) + (input.bytes[22] << 8) + input.bytes[23],
      }
    : detectedMimeType === 'image/jpeg'
      ? jpegDimensions(input.bytes)
      : webpDimensions(input.bytes)
  return {
    valid: true,
    mimeType: detectedMimeType,
    width: dimensions.width,
    height: dimensions.height,
  }
}
