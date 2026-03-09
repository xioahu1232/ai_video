import { pgTable, serial, timestamp, varchar, text, boolean, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（Supabase 系统表，禁止删除）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户任务表 - 存储用户的历史记录
export const userTasks = pgTable(
  "user_tasks",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull(), // 关联到 auth.users
    coreSellingPoint: text("core_selling_point").notNull(),
    imageUrl: text("image_url"),
    videoDuration: varchar("video_duration", { length: 50 }),
    language: varchar("language", { length: 50 }).notNull(),
    sora: text("sora"),
    seedance: text("seedance"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    error: text("error"),
    starred: boolean("starred").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_tasks_user_id_idx").on(table.userId),
    index("user_tasks_created_at_idx").on(table.createdAt),
  ]
);

// TypeScript 类型
export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = typeof userTasks.$inferInsert;
