import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { getChat } from "@/queries/chats"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  const chat = await getChat(chatId)
  const bot = chat?.members[0]?.bot

  if (!chat || !bot) {
    notFound()
  }

  return <ChatHeader bot={bot} />
}
