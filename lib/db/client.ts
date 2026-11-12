import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

function connect() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL before using the database.")
  }

  return drizzle(neon(databaseUrl), { schema })
}

let db: ReturnType<typeof connect> | undefined

export function getDb() {
  return (db ??= connect())
}
