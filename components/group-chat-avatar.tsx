import { UsersIcon } from "lucide-react"

import { ChatAvatar } from "@/components/chat-avatar"
import type { ChatBot } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

export function GroupChatAvatar({ bots }: { bots: ChatBot[] }) {
  const visible = bots.slice(0, 3)
  const remaining = bots.length - visible.length

  return (
    <span
      aria-hidden="true"
      className="relative grid size-8 shrink-0 place-items-center"
    >
      {bots.length === 0 && (
        <UsersIcon className="size-5 text-muted-foreground" />
      )}
      {visible.map((bot) => (
        <ChatAvatar
          key={bot.id}
          seed={bot.avatar}
          alt=""
          className={cn(
            bots.length === 2 &&
              "absolute top-1/2 size-5 -translate-y-1/2 first:left-0 last:right-0",
            bots.length === 3 &&
              "absolute size-4 first:top-0 first:left-1/2 first:-translate-x-1/2 last:right-0 last:bottom-0 nth-2:bottom-0 nth-2:left-0",
            remaining > 0 &&
              "absolute size-4 first:top-0 first:left-0 nth-2:top-0 nth-2:right-0 nth-3:bottom-0 nth-3:left-0"
          )}
        />
      ))}
      {remaining > 0 && (
        <span className="absolute right-0 bottom-0 grid size-4 place-items-center rounded-full bg-muted text-[0.5rem] leading-none font-medium text-muted-foreground tabular-nums">
          {remaining}
        </span>
      )}
    </span>
  )
}
