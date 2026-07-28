import { describe, expect, it } from 'vitest'
import {
  ASSET_IMAGE_MAX_BYTES,
  validateAssetImage,
} from '@/lib/assets/image-validation'

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x10,
])
const jpeg = Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20,
  0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  0xff, 0xd9,
])
const webp = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58,
  0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x1f, 0x00, 0x00, 0x0f, 0x00, 0x00,
])

describe('validateAssetImage', () => {
  it.each([
    ['JPEG', jpeg, 'image/jpeg', 'portrait.jpg', 32, 16],
    ['PNG', png, 'image/png', 'portrait.png', 32, 16],
    ['WebP', webp, 'image/webp', 'portrait.webp', 32, 16],
  ])('accepts a valid %s signature', (_, bytes, mimeType, filename, width, height) => {
    expect(validateAssetImage({ bytes, claimedMimeType: mimeType, filename }))
      .toEqual({ valid: true, mimeType, width, height })
  })

  it('rejects unsupported or disguised content', () => {
    expect(validateAssetImage({
      bytes: new TextEncoder().encode('<html>not an image</html>'),
      claimedMimeType: 'image/png',
      filename: 'attack.png',
    })).toEqual({ valid: false, reason: 'unsupported_type' })
    expect(validateAssetImage({
      bytes: png,
      claimedMimeType: 'image/svg+xml',
      filename: 'attack.svg',
    })).toEqual({ valid: false, reason: 'unsupported_type' })
  })

  it('rejects oversized and empty files', () => {
    expect(validateAssetImage({
      bytes: png,
      claimedMimeType: 'image/png',
      filename: 'large.png',
      sizeBytes: ASSET_IMAGE_MAX_BYTES + 1,
    })).toEqual({ valid: false, reason: 'file_too_large' })
    expect(validateAssetImage({
      bytes: new Uint8Array(),
      claimedMimeType: 'image/png',
      filename: 'empty.png',
    })).toEqual({ valid: false, reason: 'invalid_file' })
  })
})
