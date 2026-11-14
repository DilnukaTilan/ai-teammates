"use server"

import { auth } from "@clerk/nextjs/server"
import { paidPlan, paidPlanRequired } from "@/lib/billing"
import { getPaidBillingPeriod } from "@/lib/billing-subscription"
import { configureDesktopBrowser } from "@/lib/daytona-browser"
import {
  assertSandboxSessionTime,
  openSandboxSession,
} from "@/lib/sandbox-usage"
import { UsageLimitError, type UsageFailure } from "@/lib/usage"
import { getChat } from "@/queries/chats"

const vncPort = 6080
const previewLifetimeSeconds = 60

export async function connectChatDesktop(
  chatId: string
): Promise<
  { url: string } | { error: string } | typeof paidPlanRequired | UsageFailure
> {
  const { has, userId } = await auth.protect()
  if (!has({ plan: paidPlan })) return paidPlanRequired

  if (typeof chatId !== "string" || !chatId) {
    return { error: "Desktop unavailable." }
  }

  // getChat authenticates the request and checks chat ownership.
  const chat = await getChat(chatId)
  if (chat?.kind !== "direct") {
    return { error: "Desktop unavailable." }
  }
  const bot = chat.members[0]?.bot
  if (!bot) return { error: "Desktop unavailable." }
  if (!bot.sandboxId) {
    return { error: "This teammate has no desktop sandbox." }
  }

  try {
    const period = await getPaidBillingPeriod(userId)
    if (!period) return paidPlanRequired
    const { resource: sandbox, endsAt } = await openSandboxSession(
      period,
      bot.sandboxId
    )
    assertSandboxSessionTime(endsAt, 30)

    await configureDesktopBrowser(sandbox)
    const vnc = await sandbox.computerUse.getProcessStatus("novnc")
    if (!vnc.running) await sandbox.computerUse.start()

    assertSandboxSessionTime(endsAt, 5)
    const preview = await sandbox.getSignedPreviewUrl(
      vncPort,
      Math.min(
        previewLifetimeSeconds,
        Math.floor((endsAt.getTime() - Date.now()) / 1000)
      )
    )
    const websocket = new URL("/websockify", preview.url)
    websocket.protocol = "wss:"
    return { url: websocket.href }
  } catch (error) {
    if (error instanceof UsageLimitError) return error.toResult()
    console.error("Unable to connect to the Daytona desktop", {
      error: error instanceof Error ? error.name : "Unknown error",
    })
    return { error: "Couldn’t connect to the desktop. Try reconnecting." }
  }
}
