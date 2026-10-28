import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <main className="flex p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="text-2xl font-semibold">Welcome to AI Teammates</h1>
          <p>Sign in or create an account to open your workspace.</p>
          <Button
            className="mt-2"
            nativeButton={false}
            render={<Link href="/dashboard" prefetch={false} />}
          >
            Open dashboard
          </Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </main>
  )
}
