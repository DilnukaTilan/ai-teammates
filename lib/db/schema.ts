import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const todos = pgTable(
  "todos",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("todos_user_id_idx").on(table.userId),
    check("todos_title_not_empty", sql`length(btrim(${table.title})) > 0`),
  ]
)

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
