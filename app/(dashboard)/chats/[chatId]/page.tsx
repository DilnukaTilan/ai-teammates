import { auth } from "@clerk/nextjs/server"
import { defaultStorage } from "@trigger.dev/sdk/ai"
import { notFound } from "next/navigation"

import {
  ChatDesktopPanel,
  ChatDesktopPanelProvider,
} from "@/components/chat-desktop-panel"
import { ChatHeader, GroupChatHeader } from "@/components/chat-header"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { paidPlan } from "@/lib/billing"
import { getBots } from "@/queries/bot"
import { getChat } from "@/queries/chats"
import type { TeammateChatMessage } from "@/trigger/chat"

import { Chat } from "./chat"
import { ChatUpgrade } from "./chat-upgrade"

const desktopPanelId = "chat-desktop-panel"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { has } = await auth.protect()
  if (!has({ plan: paidPlan })) return <ChatUpgrade />

  const { chatId } = await params
  const chat = await getChat(chatId)
  if (!chat) notFound()
  const bot = chat.members[0]?.bot
  if (chat.kind === "direct" && !bot) notFound()

  const [{ messages, cursors }, availableBots] = await Promise.all([
    defaultStorage.load<TeammateChatMessage>({ chatId, clientData: undefined }),
    chat.kind === "group" ? getBots() : [],
  ])

  if (chat.kind === "group") {
    const bots = chat.members.map(({ bot: { id, name, avatar, job } }) => ({
      id,
      name,
      avatar,
      job,
    }))

    return (
      <main key={chatId} className="flex h-dvh min-w-0 flex-col">
        <GroupChatHeader
          chatId={chatId}
          name={chat.name ?? "New chat"}
          bots={bots}
          availableBots={availableBots}
        />
        <Chat
          chatId={chatId}
          initialMessages={messages}
          lastEventId={cursors?.lastOutEventId}
          groupBots={bots}
        />
      </main>
    )
  }

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
