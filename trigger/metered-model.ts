import { openai } from "@ai-sdk/openai"
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai"

import type { BillingPeriod } from "../lib/billing-subscription"
import { reserveUsage, settleUsage } from "../lib/usage-ledger"

export const maxOutputTokens = 2048
const model = openai("gpt-5.6-luna")
const longContextThreshold = 272_000

// Rates in microdollars per token. Reserve the model's full context at the
// long-context cache-write rate so image and tool tokens are covered too.
const maximumCallCost = Math.ceil(1_050_000 * 0.5 + maxOutputTokens * 1.8)

export function meteredModel(period: BillingPeriod) {
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapStream: async ({ doStream }) => {
      const reservation = await reserveUsage(period, "ai", maximumCallCost)
      // If the provider never returns usage, the reservation stays charged.
      const { stream, ...response } = await doStream()
      return {
        ...response,
        stream: stream.pipeThrough(
          new TransformStream({
            async transform(part, controller) {
              if (part.type === "finish") {
                const { inputTokens, outputTokens } = part.usage
                if (
                  inputTokens.total !== undefined &&
                  outputTokens.total !== undefined
                ) {
                  const read = inputTokens.cacheRead ?? 0
                  const write = inputTokens.cacheWrite ?? 0
                  const uncached = Math.max(0, inputTokens.total - read - write)
                  const long = inputTokens.total > longContextThreshold
                  const cost = Math.ceil(
                    (uncached * 0.2 + read * 0.02 + write * 0.25) *
                      (long ? 2 : 1) +
                      outputTokens.total * (long ? 1.8 : 1.2)
                  )
                  await settleUsage(reservation, cost)
                }
              }
              controller.enqueue(part)
            },
          })
        ),
      }
    },
  }
  return wrapLanguageModel({ model, middleware })
}
