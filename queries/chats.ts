import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { retryReadOnConnectTimeout } from "@/lib/db/read-retry"
import { bots, chatMembers, chats } from "@/lib/db/schema"

function ownedMembers(userId: string) {
  const ownedBots = db
    .select({ id: bots.id })
    .from(bots)
    .where(eq(bots.userId, userId))
  return {
    where: inArray(chatMembers.botId, ownedBots),
    orderBy: [asc(chatMembers.joinedAt), asc(chatMembers.botId)],
  }
}

export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  return db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      members: {
        ...ownedMembers(userId),
        with: {
          bot: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              job: true,
              instructions: true,
              sandboxId: true,
              userId: true,
            },
          },
        },
      },
    },
  })
}

export async function getChats() {
  const { userId } = await auth.protect()
  const rows = await retryReadOnConnectTimeout(() =>
    db.query.chats.findMany({
      columns: {
        id: true,
        kind: true,
        name: true,
        lastMessageAt: true,
        lastMessagePreview: true,
      },
      where: eq(chats.userId, userId),
      orderBy: [desc(chats.lastMessageAt), desc(chats.id)],
      with: {
        members: {
          ...ownedMembers(userId),
          columns: {},
          with: { bot: { columns: { id: true, name: true, avatar: true } } },
        },
      },
    })
  )

  return rows.map(({ members, ...chat }) => {
    const bots = members.map(({ bot }) => bot)
    return {
      ...chat,
      bots,
      title: (chat.kind === "group" ? chat.name : bots[0]?.name) ?? "New chat",
    }
  })
}

export type SidebarChat = Awaited<ReturnType<typeof getChats>>[number]
