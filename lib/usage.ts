export const usagePath = "/usage"
export const sandboxSessionMinutes = 10
export const sandboxLifecycleMinutes = 2

// AI is counted in microdollars. Sandbox time is booked in minutes.
export const usageLimits = {
  ai: 5_000_000,
  sandbox_minutes: 60 * 60,
  sandbox_creations: 10,
} as const

export type UsageMeter = keyof typeof usageLimits

export const usageErrors = {
  ai: "Your AI usage limit has been reached for this billing period.",
  sandbox_minutes:
    "There is not enough sandbox time left in this billing period.",
  sandbox_creations:
    "Your new sandbox limit has been reached for this billing period.",
  period: "This billing period is ending. Try again after your usage resets.",
} as const

export type UsageFailure = {
  success: false
  code: "USAGE_LIMIT"
  error: (typeof usageErrors)[keyof typeof usageErrors]
}

export function isUsageLimitMessage(message: string) {
  return Object.values<string>(usageErrors).includes(message)
}

export class UsageLimitError extends Error {
  constructor(readonly meter: keyof typeof usageErrors) {
    super(usageErrors[meter])
  }

  toResult(): UsageFailure {
    return {
      success: false,
      code: "USAGE_LIMIT",
      error: usageErrors[this.meter],
    }
  }
}
