"use client"

import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useChatDesktopPanel } from "@/components/chat-desktop-panel"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { Button } from "@/components/ui/button"
import type { ChatBot, EditableBot } from "@/lib/db/schema"

const headerClassName =
  "flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 text-foreground sm:px-6"

type ChatHeaderProps = {
  bot: EditableBot
  desktopPanelId: string
}

export function ChatHeader({ bot, desktopPanelId }: ChatHeaderProps) {
  const { open, toggle } = useChatDesktopPanel()

  return (
    <header className={headerClassName}>
      <h1 className="min-w-0">
        <BotDialog bot={bot}>
          <Button
            type="button"
            variant="ghost"
            className="h-auto max-w-full items-center justify-center gap-3 py-2 pr-4 pl-3"
            aria-label={`Edit ${bot.name}`}
          >
            <ChatAvatar seed={bot.avatar} />
            <span className="truncate text-lg font-semibold">{bot.name}</span>
          </Button>
        </BotDialog>
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Desktop"
        aria-expanded={open}
        aria-controls={open ? desktopPanelId : undefined}
        onClick={toggle}
      >
        <MonitorIcon aria-hidden="true" data-icon="inline-start" />
      </Button>
    </header>
  )
}

export function GroupChatHeader({
  name,
  bots,
}: {
  name: string
  bots: ChatBot[]
}) {
  return (
    <header className={headerClassName}>
      <h1 className="flex min-w-0 items-center gap-3 pl-3">
        <GroupChatAvatar bots={bots} />
        <span className="truncate text-lg font-semibold">{name}</span>
      </h1>
    </header>
  )
}
