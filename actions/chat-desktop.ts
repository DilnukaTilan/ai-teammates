"use server"

import { DaytonaConflictError, SandboxState } from "@daytona/sdk"

import { createDaytona } from "@/lib/daytona"
import { getChat } from "@/queries/chats"

const vncPort = 6080
const previewLifetimeSeconds = 3600

export async function connectChatDesktop(
  chatId: string
): Promise<{ url: string } | { error: string }> {
  if (typeof chatId !== "string" || !chatId) {
    return { error: "Desktop unavailable." }
  }

  // getChat authenticates the request and checks chat ownership.
  const chat = await getChat(chatId)
  const bot = chat?.members[0]?.bot
  if (!chat || !bot || bot.userId !== chat.userId) {
    return { error: "Desktop unavailable." }
  }
  if (!bot.sandboxId) {
    return { error: "This teammate has no desktop sandbox." }
  }

  try {
    const sandbox = await createDaytona(30_000).get(bot.sandboxId)
    switch (sandbox.state) {
      case SandboxState.STARTED:
        break
      case SandboxState.STOPPED:
      case SandboxState.PAUSED:
      case SandboxState.ARCHIVED:
        try {
          await sandbox.start()
        } catch (error) {
          if (!(error instanceof DaytonaConflictError)) throw error
          await sandbox.waitUntilStarted()
        }
        break
      default:
        await sandbox.waitUntilStarted()
    }

    const vnc = await sandbox.computerUse.getProcessStatus("novnc")
    if (!vnc.running) await sandbox.computerUse.start()

    const preview = await sandbox.getSignedPreviewUrl(
      vncPort,
      previewLifetimeSeconds
    )
    const websocket = new URL("/websockify", preview.url)
    websocket.protocol = "wss:"
    return { url: websocket.href }
  } catch (error) {
    console.error("Unable to connect to the Daytona desktop", {
      error: error instanceof Error ? error.name : "Unknown error",
    })
    return { error: "Couldn’t connect to the desktop. Try reconnecting." }
  }
}
