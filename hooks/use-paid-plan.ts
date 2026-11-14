"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { useToastManager } from "@/components/ui/toast"
import { paidPlan, paidPlanRequired, pricingPath } from "@/lib/billing"
import { usagePath } from "@/lib/usage"

export function usePaidPlan() {
  const { has, isLoaded } = useAuth()
  const { add, close } = useToastManager()
  const router = useRouter()
  const canUsePaidPlan = !isLoaded || !!has?.({ plan: paidPlan })
  const showUpgrade = useCallback(() => {
    add({
      id: paidPlanRequired.code,
      type: "error",
      title: "Pro plan required",
      description: paidPlanRequired.error,
      timeout: 8000,
      actionProps: {
        children: "View pricing",
        onClick: () => {
          close(paidPlanRequired.code)
          router.push(pricingPath)
        },
      },
    })
  }, [add, close, router])
  const showUsageLimit = useCallback(
    (description: string) => {
      const id = "USAGE_LIMIT"
      add({
        id,
        type: "error",
        title: "Usage limit reached",
        description,
        timeout: 8000,
        actionProps: {
          children: "View usage",
          onClick: () => {
            close(id)
            router.push(usagePath)
          },
        },
      })
    },
    [add, close, router]
  )

  return {
    canUsePaidPlan,
    showUpgrade,
    showUsageLimit,
    requirePaidPlan() {
      // Let the server decide while Clerk is loading.
      if (canUsePaidPlan) return true
      showUpgrade()
      return false
    },
  }
}
