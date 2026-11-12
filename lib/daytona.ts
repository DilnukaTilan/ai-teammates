import { Daytona } from "@daytona/sdk"

const cloudApiUrl = "https://app.daytona.io/api"

export function createDaytona(requestTimeoutMs?: number) {
  const endpoint = process.env.DAYTONA_API_URL || process.env.DAYTONA_SERVER_URL

  return new Daytona({
    // Frameworks load dotenv into process.env. Only vouch for Daytona Cloud here.
    apiUrl: endpoint === cloudApiUrl ? cloudApiUrl : undefined,
    requestTimeoutMs,
  })
}
