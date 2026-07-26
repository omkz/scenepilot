import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/lib/db/schema'

type Database = ReturnType<typeof drizzle<typeof schema>>

const globalDatabase = globalThis as typeof globalThis & {
  scenepilotPostgres?: ReturnType<typeof postgres>
  scenepilotDatabase?: Database
}

export function getDatabase() {
  if (globalDatabase.scenepilotDatabase) {
    return globalDatabase.scenepilotDatabase
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }

  const client = globalDatabase.scenepilotPostgres || postgres(databaseUrl, {
    max: Number(process.env.DATABASE_POOL_SIZE || 3),
  })
  const database = drizzle({ client, schema })

  globalDatabase.scenepilotPostgres = client
  globalDatabase.scenepilotDatabase = database

  return database
}
