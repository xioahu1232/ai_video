import { pgTable, serial, timestamp, varchar, text, boolean, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（Supabase 系统表，禁止删除）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户余额表 - 存储用户的使用次数
export const userBalances = pgTable(
  "user_balances",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().unique(), // 关联到 auth.users
    email: varchar("email", { length: 255 }), // 用户邮箱（便于管理后台显示）
    name: varchar("name", { length: 100 }), // 用户名（便于管理后台显示）
    balance: integer("balance").default(0).notNull(), // 剩余次数
    totalUsed: integer("total_used").default(0).notNull(), // 累计使用次数
    totalPurchased: integer("total_purchased").default(0).notNull(), // 累计购买次数
    role: varchar("role", { length: 20 }).default("user").notNull(), // 角色：user, admin
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_balances_user_id_idx").on(table.userId),
    index("user_balances_role_idx").on(table.role),
  ]
);

// 兑换码表 - 存储兑换码信息
export const redemptionCodes = pgTable(
  "redemption_codes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 32 }).notNull().unique(), // 兑换码
    amount: integer("amount").notNull(), // 面额（使用次数）
    batchId: varchar("batch_id", { length: 36 }), // 批次ID，便于管理
    description: text("description"), // 描述，如"100次套餐"
    isUsed: boolean("is_used").default(false).notNull(), // 是否已使用
    usedBy: varchar("used_by", { length: 36 }), // 使用者用户ID
    usedAt: timestamp("used_at", { withTimezone: true }), // 使用时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 过期时间（可选）
  },
  (table) => [
    index("redemption_codes_code_idx").on(table.code),
    index("redemption_codes_is_used_idx").on(table.isUsed),
    index("redemption_codes_batch_id_idx").on(table.batchId),
  ]
);

// 邀请码表 - 用于注册验证
export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 32 }).notNull().unique(), // 邀请码
    batchId: varchar("batch_id", { length: 36 }), // 批次ID，便于管理
    description: text("description"), // 描述
    isUsed: boolean("is_used").default(false).notNull(), // 是否已使用
    usedBy: varchar("used_by", { length: 36 }), // 使用者用户ID
    usedByEmail: varchar("used_by_email", { length: 255 }), // 使用者邮箱
    usedAt: timestamp("used_at", { withTimezone: true }), // 使用时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 过期时间（可选）
  },
  (table) => [
    index("invite_codes_code_idx").on(table.code),
    index("invite_codes_is_used_idx").on(table.isUsed),
    index("invite_codes_batch_id_idx").on(table.batchId),
  ]
);

// 用户任务表 - 存储用户的历史记录
// 规则：
// - 未收藏的记录：48小时后自动过期删除
// - 已收藏的记录：永久保存，不会过期
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
    starred: boolean("starred").default(false).notNull(), // 收藏状态：收藏后永久保存
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 过期时间：未收藏48小时后过期，收藏后为null
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_tasks_user_id_idx").on(table.userId),
    index("user_tasks_created_at_idx").on(table.createdAt),
    index("user_tasks_expires_at_idx").on(table.expiresAt),
    index("user_tasks_starred_idx").on(table.starred),
  ]
);

// TypeScript 类型
export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = typeof userTasks.$inferInsert;
