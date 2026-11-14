"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function ResetCountdown({
  endsAt,
  now,
}: {
  endsAt: number
  now: number
}) {
  const [clock, setClock] = useState(now)
  const router = useRouter()

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now()
      setClock(current)
      if (current >= endsAt) router.refresh()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [endsAt, router])

  const remaining = Math.max(0, Math.ceil((endsAt - clock) / 60_000))
  if (!remaining) return "Updating your billing period…"

  const days = Math.floor(remaining / 1440)
  const hours = Math.floor((remaining % 1440) / 60)
  const minutes = remaining % 60
  if (days) return `Resets in ${days}d ${hours}h`
  if (hours) return `Resets in ${hours}h ${minutes}m`
  return `Resets in ${minutes} min`
}
