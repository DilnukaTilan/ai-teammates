import { randomUUID } from "node:crypto"
import { tasks } from "@trigger.dev/sdk"
import { DaytonaNotFoundError, SandboxState } from "@daytona/sdk"
import { and, eq } from "drizzle-orm"

import type { stopSandboxSession } from "../trigger/sandbox-lease"
import type { BillingPeriod } from "./billing-subscription"
import { createDaytona, getStartedSandbox } from "./daytona"
import { getDb } from "./db/client"
import { sandboxSessions } from "./db/schema"
import {
  sandboxLifecycleMinutes,
  sandboxSessionMinutes,
  UsageLimitError,
} from "./usage"
import { reserveUsage, settleUsage } from "./usage-ledger"

const minuteMs = 60_000

async function removeSession(sandbox: string, id: string) {
  await getDb()
    .delete(sandboxSessions)
    .where(
      and(eq(sandboxSessions.sandbox, sandbox), eq(sandboxSessions.id, id))
    )
}

export async function startSandboxSession<T>(
  period: BillingPeriod,
  sandbox: string,
  start: (endsAt: Date) => Promise<T>
) {
  const endsAt = new Date(Date.now() + sandboxSessionMinutes * minuteMs)
  if (
    endsAt.getTime() + sandboxLifecycleMinutes * minuteMs >
    period.end.getTime()
  ) {
    throw new UsageLimitError("period")
  }

  const id = randomUUID()
  const [claimed] = await getDb()
    .insert(sandboxSessions)
    .values({ sandbox, id, endsAt })
    .onConflictDoNothing()
    .returning({ id: sandboxSessions.id })
  if (!claimed) return null

  let reservation: string | undefined
  try {
    reservation = await reserveUsage(
      period,
      "sandbox_minutes",
      sandboxSessionMinutes + sandboxLifecycleMinutes
    )
    // Queue shutdown before provisioning or starting any resources.
    await tasks.trigger<typeof stopSandboxSession>(
      "stop-sandbox-session",
      { sandbox, id },
      { delay: endsAt, idempotencyKey: id }
    )
    assertSandboxSessionTime(endsAt, (sandboxSessionMinutes - 1) * 60)
  } catch (error) {
    await removeSession(sandbox, id)
    if (reservation) await settleUsage(reservation, 0)
    throw error
  }

  // Keep the claim if startup fails. The provider may have started the
  // sandbox before returning an error, and queued cleanup must still run.
  const resource = await start(endsAt)
  assertSandboxSessionTime(endsAt)
  await getDb()
    .update(sandboxSessions)
    .set({ readyAt: new Date() })
    .where(
      and(eq(sandboxSessions.sandbox, sandbox), eq(sandboxSessions.id, id))
    )
  return { resource, endsAt }
}

export function assertSandboxSessionTime(endsAt: Date, requiredSeconds = 0) {
  if (endsAt.getTime() <= Date.now() + requiredSeconds * 1000) {
    throw new Error("The sandbox session is ending. Try again once it stops.")
  }
}

export async function openSandboxSession(
  period: BillingPeriod,
  sandboxId: string
) {
  const sandbox = await createDaytona(30_000).get(sandboxId)
  if (
    sandbox.cpu > 1 ||
    sandbox.memory > 1 ||
    sandbox.disk > 3 ||
    sandbox.gpu
  ) {
    throw new Error("This sandbox exceeds the Pro resource limits.")
  }

  const getExistingSession = async () => {
    const [existing] = await getDb()
      .select()
      .from(sandboxSessions)
      .where(eq(sandboxSessions.sandbox, sandbox.name))
    return existing
  }
  const existing = await getExistingSession()
  const started =
    !existing &&
    (await startSandboxSession(period, sandbox.name, async (endsAt) => {
      // A provider-side deadline also covers unavailable cleanup workers.
      await sandbox.setTtl(sandboxSessionMinutes + 1)
      assertSandboxSessionTime(endsAt, 90)
      const startedSandbox = await getStartedSandbox(sandbox.id)
      await startedSandbox.setAutostopInterval(sandboxSessionMinutes)
      await startedSandbox.setAutoArchiveInterval(1)
      return startedSandbox
    }))
  if (started) return started

  const running = existing ?? (await getExistingSession())
  if (!running?.readyAt)
    throw new Error("The sandbox is starting or stopping. Try again shortly.")
  await sandbox.refreshData()
  assertSandboxSessionTime(running.endsAt)
  if (sandbox.state !== SandboxState.STARTED) {
    throw new Error("The sandbox is stopping. Try again shortly.")
  }
  return { resource: sandbox, endsAt: running.endsAt }
}

export async function closeSandboxSession(sandbox: string, id: string) {
  const [session] = await getDb()
    .select()
    .from(sandboxSessions)
    .where(
      and(eq(sandboxSessions.sandbox, sandbox), eq(sandboxSessions.id, id))
    )
  if (!session || Date.now() < session.endsAt.getTime()) return

  try {
    const resource = await createDaytona(30_000).get(sandbox)
    if (resource.state === SandboxState.STOPPING) {
      await resource.waitUntilStopped(45)
    } else if (
      resource.state !== SandboxState.STOPPED &&
      resource.state !== SandboxState.ARCHIVING &&
      resource.state !== SandboxState.ARCHIVED
    ) {
      await resource.stop(45, true)
    }
    if (resource.state === SandboxState.STOPPED) await resource.archive()
    // Compute has stopped. Keep the filesystem after successful cleanup.
    if (
      resource.state === SandboxState.STOPPED ||
      resource.state === SandboxState.ARCHIVING ||
      resource.state === SandboxState.ARCHIVED
    )
      await resource.setTtl(0)
  } catch (error) {
    if (!(error instanceof DaytonaNotFoundError)) throw error
    // An expired provider TTL can remove the sandbox before cleanup runs.
    // Leave the bot intact so it can still be deleted through the app.
  }
  await removeSession(sandbox, id)
}
