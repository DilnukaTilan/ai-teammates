import { SignIn } from "@clerk/nextjs"
import { Suspense } from "react"

export default function SignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense fallback={<p role="status">Loading sign in…</p>}>
        <SignIn routing="path" path="/sign-in" />
      </Suspense>
    </main>
  )
}
