"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"
import { and, eq, inArray, notInArray, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
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
const groupChatIdSchema = z.string().min(1).max(100)

function ownedGroup(chatId: string, userId: string) {
  return and(
    eq(chats.id, chatId),
    eq(chats.userId, userId),
    eq(chats.kind, "group")
  )
}

function ownedGroupBots(botIds: string[], userId: string) {
  return and(eq(bots.userId, userId), inArray(bots.id, botIds))
}

function invalidGroupBots() {
  const error = "Choose bots that are available in your workspace."
  return { success: false as const, error, fieldErrors: { botIds: [error] } }
}

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
      .where(ownedGroupBots(botIds, userId))

    if (ownedBots.length !== botIds.length) return invalidGroupBots()

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

export async function updateGroupChat(
  chatId: string,
  input: CreateGroupChatInput
) {
  const { userId } = await auth.protect()
  const parsedId = groupChatIdSchema.safeParse(chatId)
  const parsed = createGroupChatSchema.safeParse(input)

  if (!parsedId.success) {
    return { success: false as const, error: "Could not find your group chat." }
  }
  if (!parsed.success) {
    return {
      success: false as const,
      error: "Check the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const { name, botIds } = parsed.data
  const groupFilter = ownedGroup(parsedId.data, userId)
  const botFilter = ownedGroupBots(botIds, userId)

  try {
    const ownedBots = await db
      .select({ id: bots.id })
      .from(bots)
      .where(botFilter)
    if (ownedBots.length !== botIds.length) return invalidGroupBots()

    const groupId = db.select({ id: chats.id }).from(chats).where(groupFilter)

    // Update the group row first to serialize roster changes from multiple tabs.
    const [[group]] = await db.batch([
      db
        .update(chats)
        .set({ name })
        .where(groupFilter)
        .returning({ id: chats.id }),
      db
        .delete(chatMembers)
        .where(
          and(
            inArray(chatMembers.chatId, groupId),
            notInArray(chatMembers.botId, botIds)
          )
        ),
      db
        .insert(chatMembers)
        .select(
          db
            .select({
              chatId: chats.id,
              botId: bots.id,
              joinedAt: sql<Date>`now()`,
            })
            .from(bots)
            .innerJoin(chats, groupFilter)
            .where(botFilter)
        )
        .onConflictDoNothing(),
    ])

    if (!group) {
      return {
        success: false as const,
        error: "Could not find your group chat.",
      }
    }
  } catch (error) {
    console.error("Failed to update group chat:", error)
    return {
      success: false as const,
      error: "Could not update your group. Try again.",
    }
  }

  revalidatePath("/", "layout")
  return { success: true as const, chatId: parsedId.data }
}

export async function deleteGroupChat(chatId: string) {
  const { userId } = await auth.protect()
  const parsedId = groupChatIdSchema.safeParse(chatId)
  if (!parsedId.success) {
    return { success: false as const, error: "Could not find your group chat." }
  }

  try {
    const [group] = await db
      .delete(chats)
      .where(ownedGroup(parsedId.data, userId))
      .returning({ id: chats.id })

    if (!group) {
      return {
        success: false as const,
        error: "Could not find your group chat.",
      }
    }
  } catch (error) {
    console.error("Failed to delete group chat:", error)
    return {
      success: false as const,
      error: "Could not delete your group. Try again.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/")
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
