import { auth } from "@clerk/nextjs/server"

export default async function DashboardPage() {
  await auth.protect()

  return (
    <main className="flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Your workspace</h1>
      <p className="text-muted-foreground">
        You&apos;re signed in and ready to start building with AI Teammates.
      </p>
      <p className="text-sm text-muted-foreground">
        Use your profile menu to manage your account or sign out.
      </p>
    </main>
  )
}
