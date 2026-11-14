import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"

import type { BillingPeriod } from "./billing-subscription"
import { getDb } from "./db/client"
import { usageEntries, usagePeriods } from "./db/schema"
import { UsageLimitError, usageLimits, type UsageMeter } from "./usage"

export async function reserveUsage(
  period: BillingPeriod,
  meter: UsageMeter,
  amount: number
) {
  if (Date.now() >= period.end.getTime()) throw new UsageLimitError("period")
  if (amount > usageLimits[meter]) throw new UsageLimitError(meter)

  const id = randomUUID()
  // The guarded upsert serializes reservations for each account, period and meter.
  const result = await getDb().execute(sql`
    WITH debit AS (
      INSERT INTO ${usagePeriods} (user_id, period_start, meter, used)
      SELECT ${period.userId}, ${period.start.toISOString()}::timestamptz, ${meter}::usage_meter, ${amount}
      WHERE now() < ${period.end.toISOString()}::timestamptz
      ON CONFLICT (user_id, period_start, meter) DO UPDATE
      SET used = ${usagePeriods.used} + EXCLUDED.used
      WHERE ${usagePeriods.used} + EXCLUDED.used <= ${usageLimits[meter]}
        AND clock_timestamp() < ${period.end.toISOString()}::timestamptz
      RETURNING user_id, period_start, meter
    )
    INSERT INTO ${usageEntries} (id, user_id, period_start, meter, reserved)
    SELECT ${id}, user_id, period_start, meter, ${amount} FROM debit
    RETURNING id
  `)

  if (!result.rows.length) throw new UsageLimitError(meter)
  return id
}

export async function settleUsage(id: string, amount: number) {
  // Repeated settlement never applies a second adjustment.
  await getDb().execute(sql`
    WITH settled AS (
      UPDATE ${usageEntries} SET actual = ${amount}
      WHERE id = ${id} AND actual IS NULL
      RETURNING user_id, period_start, meter, reserved, actual
    )
    UPDATE ${usagePeriods} AS period
    SET used = period.used - settled.reserved + settled.actual
    FROM settled WHERE period.user_id = settled.user_id
      AND period.period_start = settled.period_start AND period.meter = settled.meter
  `)
}

export async function getPeriodUsage(period: BillingPeriod) {
  const rows = await getDb()
    .select({ meter: usagePeriods.meter, used: usagePeriods.used })
    .from(usagePeriods)
    .where(
      and(
        eq(usagePeriods.userId, period.userId),
        eq(usagePeriods.periodStart, period.start)
      )
    )

  return Object.assign(
    { ai: 0, sandbox_minutes: 0, sandbox_creations: 0 },
    Object.fromEntries(rows.map(({ meter, used }) => [meter, used]))
  )
}
