export default function Loading() {
  return (
    <main className="p-6" aria-busy="true">
      <p role="status" className="text-sm text-muted-foreground">
        Loading your workspace…
      </p>
    </main>
  )
}
