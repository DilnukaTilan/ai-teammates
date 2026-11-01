"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  createBotSchema,
  insertBotSchema,
  updateBotSchema,
  type CreateBotInput,
  type UpdateBotInput,
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

export async function updateBot(botId: string, input: UpdateBotInput) {
  const { userId } = await auth.protect()
  const parsed = updateBotSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Check the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const parsedId = z.string().trim().min(1).max(100).safeParse(botId)
  if (!parsedId.success) {
    return {
      success: false as const,
      error: "Could not find your bot. Refresh the page and try again.",
    }
  }

  try {
    const [bot] = await db
      .update(bots)
      .set({
        ...parsed.data,
        instructions: parsed.data.instructions || null,
      })
      .where(and(eq(bots.id, parsedId.data), eq(bots.userId, userId)))
      .returning({ name: bots.name })

    if (!bot) {
      return {
        success: false as const,
        error: "Could not find your bot. Refresh the page and try again.",
      }
    }

    revalidatePath("/", "layout")
    return { success: true as const, bot }
  } catch (error) {
    console.error("Failed to update bot:", error)
    return {
      success: false as const,
      error: "Could not update your bot. Try again.",
    }
  }
}

export async function deleteBot(botId: string) {
  const { userId } = await auth.protect()
  const parsedId = z.string().trim().min(1).max(100).safeParse(botId)

  if (!parsedId.success) {
    return {
      success: false as const,
      error: "Could not find your bot. Refresh the page and try again.",
    }
  }

  try {
    const botChats = db
      .select({ id: chatMembers.chatId })
      .from(chatMembers)
      .innerJoin(bots, eq(chatMembers.botId, bots.id))
      .where(and(eq(bots.id, parsedId.data), eq(bots.userId, userId)))

    // Delete direct chats and the owned bot in one atomic Neon batch.
    const [, [bot]] = await db.batch([
      db
        .delete(chats)
        .where(
          and(
            eq(chats.userId, userId),
            eq(chats.kind, "direct"),
            inArray(chats.id, botChats)
          )
        ),
      db
        .delete(bots)
        .where(and(eq(bots.id, parsedId.data), eq(bots.userId, userId)))
        .returning({ id: bots.id }),
    ])

    if (!bot) {
      return {
        success: false as const,
        error: "Could not find your bot. Refresh the page and try again.",
      }
    }
  } catch (error) {
    console.error("Failed to delete bot:", error)
    return {
      success: false as const,
      error: "Could not delete your bot. Try again.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/")
}
