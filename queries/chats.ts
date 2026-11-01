import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { chatMembers, chats } from "@/lib/db/schema"

export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  return db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      members: {
        orderBy: [asc(chatMembers.joinedAt), asc(chatMembers.botId)],
        limit: 1,
        with: {
          bot: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              job: true,
              instructions: true,
            },
          },
        },
      },
    },
  })
}
