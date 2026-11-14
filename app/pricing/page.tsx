import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { pricingPath } from "@/lib/billing"
import { usageLimits } from "@/lib/usage"

export const metadata: Metadata = { title: "Pricing | AI Teammates" }

export default async function PricingPage() {
  await auth.protect({
    unauthenticatedUrl: `/sign-in?redirect_url=${pricingPath}`,
  })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-12 px-4 py-8 sm:px-8 sm:py-12">
      <Button
        variant="ghost"
        nativeButton={false}
        className="self-start"
        render={<Link href="/" />}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Back to workspace
      </Button>
      <section aria-labelledby="pricing-title" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1
            id="pricing-title"
            className="text-4xl font-semibold tracking-tight"
          >
            Pricing
          </h1>
          <p className="text-base text-muted-foreground">
            Pro includes ${usageLimits.ai / 1_000_000} in AI usage,{" "}
            {usageLimits.sandbox_minutes / 60} sandbox hours, and{" "}
            {usageLimits.sandbox_creations} new sandboxes per billing period.
          </p>
        </div>
        <PricingTable for="user" newSubscriptionRedirectUrl="/" />
      </section>
    </main>
  )
}
