"use server"

import { auth } from "@clerk/nextjs/server"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  createBotSchema,
  insertBotSchema,
  type CreateBotInput,
} from "@/lib/db/schema"

export async function createBot(input: CreateBotInput) {
  const { userId } = await auth.protect()
  const parsed = createBotSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Check the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const values = insertBotSchema.parse({
    ...parsed.data,
    userId,
    instructions: parsed.data.instructions || null,
  })

  try {
    // Generate IDs up front so all three inserts can share one atomic batch.
    const botId = nanoid()
    const chatId = nanoid()
    const [[bot]] = await db.batch([
      db
        .insert(bots)
        .values({ ...values, id: botId })
        .returning(),
      db
        .insert(chats)
        .values({ id: chatId, userId, kind: "direct", name: null }),
      db.insert(chatMembers).values({ chatId, botId }),
    ])

    if (!bot) {
      return {
        success: false as const,
        error: "Could not create your bot. Try again.",
      }
    }

    revalidatePath("/")
    return { success: true as const, bot }
  } catch (error) {
    console.error("Failed to create bot:", error)
    return {
      success: false as const,
      error: "Could not create your bot. Try again.",
    }
  }
}
