import type { AssetImageDto } from '@/lib/assets/types'

const byPosition = (a: AssetImageDto, b: AssetImageDto) => (
  a.position - b.position || a.createdAt.localeCompare(b.createdAt)
)

function scoped(
  images: AssetImageDto[],
  assetType: AssetImageDto['assetType'],
  assetId: string,
) {
  return images.filter(image => image.assetType === assetType && image.assetId === assetId)
}

export function selectCharacterConceptReferences(
  images: AssetImageDto[],
  characterId: string,
  limit = 5,
) {
  const owned = scoped(images, 'character', characterId)
  return [
    ...owned.filter(image => image.imageRole === 'Inspiration').sort(byPosition),
    ...owned.filter(image => image.imageRole === 'Master Reference'),
  ].slice(0, limit)
}

export function selectCostumeConceptReferences(input: {
  costumeImages: AssetImageDto[]
  costumeId: string
  characterImages: AssetImageDto[]
  characterId: string
  limit?: number
}) {
  const costume = scoped(input.costumeImages, 'costume', input.costumeId)
  const character = scoped(input.characterImages, 'character', input.characterId)
  return [
    ...character.filter(image => image.imageRole === 'Master Reference'),
    ...costume.filter(image => image.imageRole === 'Inspiration').sort(byPosition),
    ...costume.filter(image => image.imageRole === 'Master Reference'),
  ].slice(0, input.limit ?? 5)
}

export function selectLocationConceptReferences(
  images: AssetImageDto[],
  locationId: string,
  limit = 5,
) {
  const owned = scoped(images, 'location', locationId)
  return [
    ...owned.filter(image => image.imageRole === 'Inspiration').sort(byPosition),
    ...owned.filter(image => image.imageRole === 'Master Reference'),
  ].slice(0, limit)
}
