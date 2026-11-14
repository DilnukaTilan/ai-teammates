"use client"

import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useChatDesktopPanel } from "@/components/chat-desktop-panel"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { Button } from "@/components/ui/button"
import { DialogTrigger } from "@/components/ui/dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePaidPlan } from "@/hooks/use-paid-plan"
import type { ChatBot, EditableBot } from "@/lib/db/schema"

const headerClassName =
  "flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 text-foreground sm:px-6 md:gap-4"

type ChatHeaderProps = {
  bot: EditableBot
  desktopPanelId: string
}

export function ChatHeader({ bot, desktopPanelId }: ChatHeaderProps) {
  const { open, isMobile, fullscreenDialog, toggle } = useChatDesktopPanel()
  const { canUsePaidPlan, requirePaidPlan } = usePaidPlan()
  const desktopButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="ml-auto max-md:size-11"
      aria-label="Desktop"
      {...(!isMobile && {
        "aria-expanded": open,
        "aria-controls": open ? desktopPanelId : undefined,
      })}
      onClick={() => {
        if (requirePaidPlan() && !isMobile) toggle()
      }}
    >
      <MonitorIcon aria-hidden="true" data-icon="inline-start" />
    </Button>
  )

  return (
    <header className={headerClassName}>
      <SidebarTrigger className="size-11 md:hidden" />
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
      {isMobile && canUsePaidPlan ? (
        <DialogTrigger handle={fullscreenDialog} render={desktopButton} />
      ) : (
        desktopButton
      )}
    </header>
  )
}

export function GroupChatHeader({
  chatId,
  name,
  bots,
  availableBots,
}: {
  chatId: string
  name: string
  bots: ChatBot[]
  availableBots: ChatBot[]
}) {
  return (
    <header className={headerClassName}>
      <SidebarTrigger className="size-11 md:hidden" />
      <h1 className="min-w-0">
        <GroupChatDialog
          group={{ id: chatId, name, botIds: bots.map(({ id }) => id) }}
          bots={availableBots}
        >
          <Button
            type="button"
            variant="ghost"
            className="h-auto max-w-full items-center justify-center gap-3 py-2 pr-4 pl-3"
            aria-label={`Edit ${name}`}
          >
            <GroupChatAvatar bots={bots} />
            <span className="truncate text-lg font-semibold">{name}</span>
          </Button>
        </GroupChatDialog>
      </h1>
    </header>
  )
}
