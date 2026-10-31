import { auth } from "@clerk/nextjs/server"
import { PlusIcon } from "lucide-react"
import { randomUUID } from "node:crypto"

import { ChatAvatar } from "@/components/chat-avatar"
import { BotDialog } from "@/components/bot-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()
  const avatarSeed = randomUUID()

  return (
    <main className="flex min-h-svh p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <ChatAvatar seed={avatarSeed} className="size-12" />
          </EmptyMedia>
          <EmptyTitle>
            <h1>Meet your first bot</h1>
          </EmptyTitle>
          <EmptyDescription>
            Every bot gets its own personality, memory, and face. Spin one up
            and start the conversation.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <BotDialog avatarSeed={avatarSeed}>
            <Button variant="secondary">
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create a new bot
            </Button>
          </BotDialog>
        </EmptyContent>
      </Empty>
    </main>
  )
}
