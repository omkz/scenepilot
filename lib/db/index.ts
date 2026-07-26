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
    max: process.env.NODE_ENV === 'development' ? 5 : 10,
  })
  const database = drizzle({ client, schema })

  if (process.env.NODE_ENV !== 'production') {
    globalDatabase.scenepilotPostgres = client
    globalDatabase.scenepilotDatabase = database
  }

  return database
}
