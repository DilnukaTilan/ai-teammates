import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { nanoid } from "nanoid"
import { z } from "zod"

export const bots = pgTable(
  "bots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar")
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text("job").notNull(),
    instructions: text("instructions"),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)]
)

export const insertBotSchema = createInsertSchema(bots, {
  name: z.string().trim().min(1, "Give your bot a name.").max(100),
  avatar: z.string().trim().min(1, "Choose a face for your bot.").max(100),
  job: z.string().trim().min(1, "Give your bot a job.").max(200),
  instructions: (schema) => schema.trim().max(10000),
})

// Only these fields may be supplied by the creation form.
export const createBotSchema = insertBotSchema
  .pick({ name: true, avatar: true, job: true, instructions: true })
  .required({ avatar: true })

export type CreateBotInput = z.infer<typeof createBotSchema>
export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert
