import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { getChat } from "@/queries/chats"

import { Chat } from "./chat"

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

  return (
    <main className="flex h-dvh flex-col">
      <ChatHeader bot={bot} />
      <Chat key={chatId} chatId={chatId} />
    </main>
  )
}
