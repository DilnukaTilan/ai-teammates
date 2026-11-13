import { defaultStorage } from "@trigger.dev/sdk/ai"
import { notFound } from "next/navigation"

import {
  ChatDesktopPanel,
  ChatDesktopPanelProvider,
} from "@/components/chat-desktop-panel"
import { ChatHeader } from "@/components/chat-header"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { getChat } from "@/queries/chats"
import type { TeammateChatMessage } from "@/trigger/chat"

import { Chat } from "./chat"

const desktopPanelId = "chat-desktop-panel"

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

  const { messages, cursors } = await defaultStorage.load<TeammateChatMessage>({
    chatId,
    clientData: undefined,
  })

  return (
    <main className="h-dvh">
      <ChatDesktopPanelProvider key={chatId}>
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="chat-panel" className="flex min-w-0 flex-col">
            <ChatHeader
              bot={{
                id: bot.id,
                name: bot.name,
                avatar: bot.avatar,
                job: bot.job,
                instructions: bot.instructions,
              }}
              desktopPanelId={desktopPanelId}
            />
            <Chat
              key={chatId}
              chatId={chatId}
              initialMessages={messages}
              lastEventId={cursors?.lastOutEventId}
            />
          </ResizablePanel>
          <ChatDesktopPanel
            chatId={chatId}
            panelId={desktopPanelId}
            teammateName={bot.name}
          />
        </ResizablePanelGroup>
      </ChatDesktopPanelProvider>
    </main>
  )
}
