import "server-only"

import { NeonDbError } from "@neondatabase/serverless"
import { DrizzleQueryError } from "drizzle-orm"

export function isDatabaseConnectTimeout(error: unknown) {
  const databaseError = error instanceof DrizzleQueryError ? error.cause : error
  if (!(databaseError instanceof NeonDbError)) return false

  const cause = databaseError.sourceError?.cause
  return (
    cause instanceof Error &&
    "code" in cause &&
    cause.code === "UND_ERR_CONNECT_TIMEOUT"
  )
}

export async function retryReadOnConnectTimeout<T>(
  read: () => PromiseLike<T>
): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (!isDatabaseConnectTimeout(error)) throw error
    return read()
  }
}
