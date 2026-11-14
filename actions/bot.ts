"use server"

import { auth } from "@clerk/nextjs/server"
import {
  DaytonaConflictError,
  DaytonaNotFoundError,
  type Daytona,
} from "@daytona/sdk"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { randomUUID } from "node:crypto"
import { z } from "zod"

import { paidPlan, paidPlanRequired } from "@/lib/billing"
import { getPaidBillingPeriod } from "@/lib/billing-subscription"
import { botMemoryPath } from "@/lib/bot-memory"
import { createDaytona } from "@/lib/daytona"
import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  createBotSchema,
  insertBotSchema,
  updateBotSchema,
  type Bot,
  type CreateBotInput,
  type UpdateBotInput,
} from "@/lib/db/schema"
import { startSandboxSession } from "@/lib/sandbox-usage"
import { sandboxSessionMinutes, UsageLimitError } from "@/lib/usage"
import { reserveUsage, settleUsage } from "@/lib/usage-ledger"

async function deleteSandbox(daytona: Daytona, sandboxIdOrName: string) {
  try {
    const sandbox = await daytona.get(sandboxIdOrName)
    await sandbox.delete(60, true)
  } catch (error) {
    if (!(error instanceof DaytonaNotFoundError)) throw error
  }
}

export async function createBot(input: CreateBotInput) {
  const { userId, has } = await auth.protect()
  if (!has({ plan: paidPlan })) return paidPlanRequired

  const parsed = createBotSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Check the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const values = insertBotSchema.parse({
    ...parsed.data,
    userId,
    instructions: parsed.data.instructions || null,
  })

  const botId = nanoid()
  const chatId = nanoid()
  const sandboxName = `bot-${randomUUID()}`
  let daytona: Daytona | undefined
  let sandboxId: string | undefined
  let bot: Pick<Bot, "name"> | undefined
  let creation: string | undefined

  try {
    const period = await getPaidBillingPeriod(userId)
    if (!period) return paidPlanRequired

    creation = await reserveUsage(period, "sandbox_creations", 1)
    await startSandboxSession(period, sandboxName, async () => {
      daytona = createDaytona()
      const sandbox = await daytona.create({
        name: sandboxName,
        snapshot: "daytona-small",
        public: false,
        autoStopInterval: sandboxSessionMinutes,
        autoArchiveInterval: 1,
        // Cleanup clears this safety deadline after compute has stopped.
        ttlMinutes: sandboxSessionMinutes + 1,
      })
      sandboxId = sandbox.id
      const memory = await sandbox.process.executeCommand(
        `: > ${botMemoryPath}`,
        undefined,
        undefined,
        15
      )
      if (memory.exitCode !== 0)
        throw new Error("Could not initialize bot memory.")
      if (
        sandbox.cpu > 1 ||
        sandbox.memory > 1 ||
        sandbox.disk > 3 ||
        sandbox.gpu
      ) {
        throw new Error("The snapshot exceeds the Pro sandbox resource limits.")
      }
    })

    if (!sandboxId) throw new Error("Sandbox provisioning did not finish.")

    const [[createdBot]] = await db.batch([
      db
        .insert(bots)
        .values({ ...values, id: botId, sandboxId })
        .returning({ name: bots.name }),
      db
        .insert(chats)
        .values({ id: chatId, userId, kind: "direct", name: null }),
      db.insert(chatMembers).values({ chatId, botId }),
    ])

    if (!createdBot) throw new Error("Bot insert returned no row.")
    bot = createdBot
    if (creation) {
      await settleUsage(creation, 1).catch((error) => {
        console.error("Could not settle sandbox creation", error)
      })
    }
  } catch (error) {
    if (creation && !daytona) {
      await settleUsage(creation, 0).catch((settlementError) => {
        console.error(
          "Could not release unused sandbox creation",
          settlementError
        )
      })
    }
    if (error instanceof UsageLimitError) return error.toResult()
    console.error("Failed to create bot:", error)

    if (daytona && (sandboxId || !(error instanceof DaytonaConflictError))) {
      try {
        if (sandboxId) {
          // The database may have committed the batch before the request failed.
          const [savedBot] = await db
            .select({ name: bots.name })
            .from(bots)
            .where(
              and(
                eq(bots.id, botId),
                eq(bots.userId, userId),
                eq(bots.sandboxId, sandboxId)
              )
            )
          bot = savedBot
        }

        if (!bot) await deleteSandbox(daytona, sandboxId ?? sandboxName)
      } catch (cleanupError) {
        console.error(
          "Failed to reconcile bot and sandbox creation:",
          { botId, sandboxId, sandboxName },
          cleanupError
        )
      }
    }
  }

  if (!bot) {
    return {
      success: false as const,
      error: "Could not create your bot. Try again.",
    }
  }

  revalidatePath("/")
  return { success: true as const, bot }
}

export async function updateBot(botId: string, input: UpdateBotInput) {
  const { userId, has } = await auth.protect()
  if (!has({ plan: paidPlan })) return paidPlanRequired

  const parsed = updateBotSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Check the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const parsedId = z.string().trim().min(1).max(100).safeParse(botId)
  if (!parsedId.success) {
    return {
      success: false as const,
      error: "Could not find your bot. Refresh the page and try again.",
    }
  }

  try {
    const [bot] = await db
      .update(bots)
      .set({
        ...parsed.data,
        instructions: parsed.data.instructions || null,
      })
      .where(and(eq(bots.id, parsedId.data), eq(bots.userId, userId)))
      .returning({ name: bots.name })

    if (!bot) {
      return {
        success: false as const,
        error: "Could not find your bot. Refresh the page and try again.",
      }
    }

    revalidatePath("/", "layout")
    return { success: true as const, bot }
  } catch (error) {
    console.error("Failed to update bot:", error)
    return {
      success: false as const,
      error: "Could not update your bot. Try again.",
    }
  }
}

export async function deleteBot(botId: string) {
  const { userId, has } = await auth.protect()
  if (!has({ plan: paidPlan })) return paidPlanRequired

  const parsedId = z.string().trim().min(1).max(100).safeParse(botId)

  if (!parsedId.success) {
    return {
      success: false as const,
      error: "Could not find your bot. Refresh the page and try again.",
    }
  }

  try {
    const ownedBot = and(eq(bots.id, parsedId.data), eq(bots.userId, userId))
    const [bot] = await db
      .select({ sandboxId: bots.sandboxId })
      .from(bots)
      .where(ownedBot)

    if (!bot) {
      return {
        success: false as const,
        error: "Could not find your bot. Refresh the page and try again.",
      }
    }

    if (bot.sandboxId) await deleteSandbox(createDaytona(), bot.sandboxId)

    const botChats = db
      .select({ id: chatMembers.chatId })
      .from(chatMembers)
      .innerJoin(bots, eq(chatMembers.botId, bots.id))
      .where(ownedBot)

    // Delete direct chats and the owned bot in one atomic Neon batch.
    await db.batch([
      db
        .delete(chats)
        .where(
          and(
            eq(chats.userId, userId),
            eq(chats.kind, "direct"),
            inArray(chats.id, botChats)
          )
        ),
      db.delete(bots).where(ownedBot),
    ])
  } catch (error) {
    console.error("Failed to delete bot:", error)
    return {
      success: false as const,
      error: "Could not delete your bot. Try again.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/")
}
