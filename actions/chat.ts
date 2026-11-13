"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { z } from "zod"

import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  createGroupChatSchema,
  type CreateGroupChatInput,
} from "@/lib/db/schema"
import { getChat } from "@/queries/chats"

const startSession = chat.createStartSessionAction("teammate-chat")

export async function createGroupChat(input: CreateGroupChatInput) {
  const { userId } = await auth.protect()
  const parsed = createGroupChatSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Check the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const { name, botIds } = parsed.data
  const chatId = nanoid()

  try {
    const ownedBots = await db
      .select({ id: bots.id })
      .from(bots)
      .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)))

    if (ownedBots.length !== botIds.length) {
      const error = "Choose bots that are available in your workspace."
      return {
        success: false as const,
        error,
        fieldErrors: { botIds: [error] },
      }
    }

    await db.batch([
      db.insert(chats).values({ id: chatId, userId, kind: "group", name }),
      db.insert(chatMembers).values(botIds.map((botId) => ({ chatId, botId }))),
    ])
  } catch (error) {
    console.error("Failed to create group chat:", error)
    return {
      success: false as const,
      error: "Could not create your group. Try again.",
    }
  }

  revalidatePath("/", "layout")
  return { success: true as const, chatId }
}

async function requireChat(chatId: string) {
  if (typeof chatId !== "string" || !chatId) {
    notFound()
  }

  const chat = await getChat(chatId)
  if (!chat?.members.length) {
    notFound()
  }
}

export async function startChatSession(chatId: string) {
  await requireChat(chatId)
  return startSession({ chatId })
}

export async function mintChatAccessToken(chatId: string) {
  await requireChat(chatId)
  return triggerAuth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}
