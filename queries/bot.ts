import "server-only"

import { auth } from "@clerk/nextjs/server"
import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { bots } from "@/lib/db/schema"

export async function getBots() {
  const { userId } = await auth.protect()
  return db
    .select({ id: bots.id, name: bots.name, avatar: bots.avatar })
    .from(bots)
    .where(eq(bots.userId, userId))
    .orderBy(asc(bots.name), asc(bots.id))
}
