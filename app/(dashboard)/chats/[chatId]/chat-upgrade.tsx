"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePaidPlan } from "@/hooks/use-paid-plan"

export function ChatUpgrade() {
  const { showUpgrade } = usePaidPlan()

  useEffect(() => {
    showUpgrade()
  }, [showUpgrade])

  return (
    <main className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center border-b px-4 md:hidden">
        <SidebarTrigger className="size-11" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">
          Pro is required to open this chat
        </h1>
        <Button variant="outline" onClick={showUpgrade}>
          See upgrade options
        </Button>
      </div>
    </main>
  )
}
