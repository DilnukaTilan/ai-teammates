import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { bots, chatMembers, chats } from "@/lib/db/schema"

export async function getChats() {
  const { userId } = await auth.protect()
  const firstBot = db
    .select({ name: bots.name, avatar: bots.avatar })
    .from(chatMembers)
    .innerJoin(bots, eq(chatMembers.botId, bots.id))
    .where(and(eq(chatMembers.chatId, chats.id), eq(bots.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.botId))
    .limit(1)
    .as("first_bot")

  return db
    .select({
      id: chats.id,
      lastMessagePreview: chats.lastMessagePreview,
      lastMessageAt: chats.lastMessageAt,
      bot: { name: firstBot.name, avatar: firstBot.avatar },
    })
    .from(chats)
    .leftJoinLateral(firstBot, sql`true`)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.lastMessageAt), desc(chats.id))
}

export type SidebarChat = Awaited<ReturnType<typeof getChats>>[number]
