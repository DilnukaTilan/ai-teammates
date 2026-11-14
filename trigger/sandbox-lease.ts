import { schedules, task } from "@trigger.dev/sdk"
import { asc, lte } from "drizzle-orm"

import { getDb } from "../lib/db/client"
import { sandboxSessions } from "../lib/db/schema"
import { closeSandboxSession } from "../lib/sandbox-usage"

const queue = { name: "sandbox-cleanup", concurrencyLimit: 1 }

export const stopSandboxSession = task({
  id: "stop-sandbox-session",
  queue,
  run: async ({ sandbox, id }: { sandbox: string; id: string }) => {
    await closeSandboxSession(sandbox, id)
  },
})

export const retryExpiredSandboxSessions = schedules.task({
  id: "retry-expired-sandbox-sessions",
  cron: "*/15 * * * *",
  queue,
  run: async () => {
    const expired = await getDb()
      .select()
      .from(sandboxSessions)
      .where(lte(sandboxSessions.endsAt, new Date()))
      .orderBy(asc(sandboxSessions.endsAt))
      .limit(25)
    for (const { sandbox, id } of expired) {
      try {
        await closeSandboxSession(sandbox, id)
      } catch (error) {
        console.error("Could not close expired sandbox session", {
          sandbox,
          error,
        })
      }
    }
  },
})
