import { relations, sql } from "drizzle-orm"
import {
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
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

export const chatKind = pgEnum("chat_kind", ["direct", "group"])

export const chats = pgTable(
  "chats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    kind: chatKind("kind").notNull().default("direct"),
    name: text("name"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    check(
      "chats_direct_name_null",
      sql`${table.kind} <> 'direct' OR ${table.name} IS NULL`
    ),
  ]
)

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.botId] }),
    index("chat_members_bot_id_idx").on(table.botId),
  ]
)

export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}))

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}))

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  bot: one(bots, {
    fields: [chatMembers.botId],
    references: [bots.id],
  }),
}))

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
export type Chat = typeof chats.$inferSelect
export type NewChat = typeof chats.$inferInsert
export type ChatMember = typeof chatMembers.$inferSelect
export type NewChatMember = typeof chatMembers.$inferInsert
