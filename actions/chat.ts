"use server"

import { auth } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"
import { notFound } from "next/navigation"

import { getChat } from "@/queries/chats"

const startSession = chat.createStartSessionAction("teammate-chat")

async function requireChat(chatId: string) {
  if (typeof chatId !== "string" || !chatId) {
    notFound()
  }

  const chat = await getChat(chatId)
  if (!chat?.members[0]?.bot) {
    notFound()
  }
}

export async function startChatSession(chatId: string) {
  await requireChat(chatId)
  return startSession({ chatId })
}

export async function mintChatAccessToken(chatId: string) {
  await requireChat(chatId)
  return auth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}
