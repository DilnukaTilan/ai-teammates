import "server-only"

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in .env.local before using the database.")
}

export const db = drizzle(neon(databaseUrl), { schema })
