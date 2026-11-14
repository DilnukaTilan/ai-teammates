import { auth } from "@clerk/nextjs/server"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { pricingPath } from "@/lib/billing"
import { getPaidBillingPeriod } from "@/lib/billing-subscription"
import {
  sandboxLifecycleMinutes,
  sandboxSessionMinutes,
  usageLimits,
  type UsageMeter,
} from "@/lib/usage"
import { getPeriodUsage } from "@/lib/usage-ledger"

import { ResetCountdown } from "./reset-countdown"

export const metadata: Metadata = { title: "Usage | AI Teammates" }

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})
const meters: {
  key: UsageMeter
  label: string
  detail: string
  format: (value: number) => string
}[] = [
  {
    key: "ai",
    label: "AI usage",
    detail: "Based on input, cached input, and output tokens.",
    format: (value) => currency.format(value / 1_000_000),
  },
  {
    key: "sandbox_minutes",
    label: "Sandbox time",
    detail: `Each ${sandboxSessionMinutes}-minute session uses ${sandboxSessionMinutes + sandboxLifecycleMinutes} minutes, including startup and shutdown.`,
    format: (value) => `${Math.floor(value / 60)}h ${value % 60}m`,
  },
  {
    key: "sandbox_creations",
    label: "New sandboxes",
    detail: "Creating a bot provisions a sandbox and starts its first session.",
    format: String,
  },
]

export default async function UsagePage() {
  const { userId } = await auth.protect()
  const period = await getPaidBillingPeriod(userId)
  const usage = period ? await getPeriodUsage(period) : null

  return (
    <main className="min-h-svh">
      <header className="flex h-16 items-center border-b px-4 md:hidden">
        <SidebarTrigger className="size-11" />
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Usage</h1>
          {period && (
            <p className="text-sm text-muted-foreground">
              <ResetCountdown
                key={period.end.getTime()}
                endsAt={period.end.getTime()}
                now={period.checkedAt}
              />
            </p>
          )}
        </header>
        {usage ? (
          <section
            aria-label="Pro plan limits"
            className="divide-y rounded-xl border bg-card px-5"
          >
            {meters.map(({ key, label, detail, format }) => {
              const limit = usageLimits[key]
              const used = usage[key]
              const value = `${format(used)} of ${format(limit)}`
              return (
                <div key={key} className="flex flex-col gap-2 py-5">
                  <Progress
                    value={Math.min(used, limit)}
                    max={limit}
                    aria-valuetext={value}
                  >
                    <ProgressLabel>{label}</ProgressLabel>
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                      {value}
                    </span>
                  </Progress>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              )
            })}
          </section>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              An active Pro subscription includes AI and sandbox usage.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={pricingPath} />}
            >
              View pricing
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
