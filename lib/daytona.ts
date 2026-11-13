import { Daytona, DaytonaConflictError, SandboxState } from "@daytona/sdk"

const cloudApiUrl = "https://app.daytona.io/api"

export function createDaytona(requestTimeoutMs?: number) {
  const endpoint = process.env.DAYTONA_API_URL || process.env.DAYTONA_SERVER_URL

  return new Daytona({
    // Frameworks load dotenv into process.env. Only vouch for Daytona Cloud here.
    apiUrl: endpoint === cloudApiUrl ? cloudApiUrl : undefined,
    requestTimeoutMs,
  })
}

export async function getStartedSandbox(sandboxId: string) {
  const sandbox = await createDaytona(30_000).get(sandboxId)

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

  return sandbox
}
