import { DaytonaNotFoundError } from "@daytona/sdk"

import type { BillingPeriod } from "./billing-subscription"
import { assertSandboxSessionTime, openSandboxSession } from "./sandbox-usage"

export const botMemoryPath = "MEMORY.md"
const maxMemoryBytes = 32 * 1024

export async function readBotMemory(
  period: BillingPeriod,
  sandboxId: string,
  signal: AbortSignal
) {
  signal.throwIfAborted()
  const {
    resource: { fs },
    endsAt,
  } = await openSandboxSession(period, sandboxId)
  assertSandboxSessionTime(endsAt, 20)
  signal.throwIfAborted()

  try {
    const file = await fs.getFileDetails(botMemoryPath)
    if (file.isDir || file.size > maxMemoryBytes) {
      throw new Error("Invalid bot memory file.")
    }
    if (file.size === 0) return ""

    signal.throwIfAborted()
    const bytes = await fs.downloadFile(botMemoryPath, 15)
    signal.throwIfAborted()
    if (bytes.length > maxMemoryBytes || bytes.includes(0)) {
      throw new Error("Invalid bot memory file.")
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim()
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return ""
    throw error
  }
}
