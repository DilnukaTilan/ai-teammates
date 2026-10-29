import { loadEnvConfig } from "@next/env"
import { defineConfig } from "drizzle-kit"

loadEnvConfig(process.cwd())

const databaseUrl = process.env.DATABASE_URL_UNPOOLED

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED in .env.local before running Drizzle Kit."
  )
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  dbCredentials: { url: databaseUrl },
})
