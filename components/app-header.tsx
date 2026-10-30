import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"

export function AppHeader() {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 px-6 py-4">
      <Link href="/" className="font-semibold">
        AI Teammates
      </Link>
      <nav aria-label="Account" className="flex items-center gap-3">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading account…</p>
          }
        >
          <Show when="signed-out">
            <SignInButton>
              <Button variant="ghost">Sign in</Button>
            </SignInButton>
            <SignUpButton>
              <Button>Create account</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </Suspense>
      </nav>
    </header>
  )
}
