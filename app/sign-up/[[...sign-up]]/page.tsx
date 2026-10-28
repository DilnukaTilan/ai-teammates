import { SignUp } from "@clerk/nextjs"
import { Suspense } from "react"

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100svh-5rem)] items-center justify-center p-6">
      <Suspense fallback={<p role="status">Loading sign up…</p>}>
        <SignUp routing="path" path="/sign-up" />
      </Suspense>
    </main>
  )
}
