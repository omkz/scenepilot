import 'dotenv/config'
import { processPendingAssetStorageDeletions } from '@/lib/db/queries/asset-storage-deletion-jobs'

async function main() {
  try {
    const result = await processPendingAssetStorageDeletions()
    console.log('Asset storage cleanup complete', result)
  } finally {
    const client = (globalThis as typeof globalThis & {
      scenepilotPostgres?: { end: () => Promise<void> }
    }).scenepilotPostgres
    await client?.end()
  }
}

main().catch(() => {
  console.error('Asset storage cleanup failed')
  process.exitCode = 1
})
