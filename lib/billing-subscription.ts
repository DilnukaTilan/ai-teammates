import { createClerkClient } from "@clerk/backend"

import { paidPlanSlug } from "./billing"

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export type BillingPeriod = { userId: string; start: Date; end: Date }

export async function getPaidBillingPeriod(
  userId: string
): Promise<(BillingPeriod & { checkedAt: number }) | null> {
  const subscription = await clerk.billing.getUserBillingSubscription(userId)
  const now = Date.now()
  const item = subscription.subscriptionItems.find(
    ({ plan, status, periodStart, periodEnd }) =>
      plan?.slug === paidPlanSlug &&
      (status === "active" || status === "canceled") &&
      periodStart <= now &&
      periodEnd !== null &&
      now < periodEnd
  )
  if (item?.periodEnd == null) return null
  return {
    userId,
    checkedAt: now,
    start: new Date(item.periodStart),
    end: new Date(item.periodEnd),
  }
}
