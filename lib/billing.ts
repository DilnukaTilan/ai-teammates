export const paidPlanSlug = "pro"
export const paidPlan = `user:${paidPlanSlug}`
export const pricingPath = "/pricing"

export const paidPlanRequired = {
  success: false,
  code: "PAID_PLAN_REQUIRED",
  error: "Upgrade to Pro to use bots and sandboxes.",
} as const
