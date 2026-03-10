import { pgTable, serial, timestamp, index, varchar, text, boolean, unique, integer, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const userTasks = pgTable("user_tasks", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	coreSellingPoint: text("core_selling_point").notNull(),
	imageUrl: text("image_url"),
	videoDuration: varchar("video_duration", { length: 50 }),
	language: varchar({ length: 50 }).notNull(),
	sora: text(),
	seedance: text(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	error: text(),
	starred: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_tasks_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("user_tasks_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("user_tasks_starred_idx").using("btree", table.starred.asc().nullsLast().op("bool_ops")),
	index("user_tasks_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const redemptionCodes = pgTable("redemption_codes", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	code: varchar({ length: 32 }).notNull(),
	amount: integer().notNull(),
	batchId: varchar("batch_id", { length: 36 }),
	description: text(),
	isUsed: boolean("is_used").default(false).notNull(),
	usedBy: varchar("used_by", { length: 36 }),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("redemption_codes_batch_id_idx").using("btree", table.batchId.asc().nullsLast().op("text_ops")),
	index("redemption_codes_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("redemption_codes_is_used_idx").using("btree", table.isUsed.asc().nullsLast().op("bool_ops")),
	unique("redemption_codes_code_unique").on(table.code),
]);

export const inviteCodes = pgTable("invite_codes", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	code: varchar({ length: 32 }).notNull(),
	batchId: varchar("batch_id", { length: 36 }),
	description: text(),
	isUsed: boolean("is_used").default(false).notNull(),
	usedBy: varchar("used_by", { length: 36 }),
	usedByEmail: varchar("used_by_email", { length: 255 }),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("invite_codes_batch_id_idx").using("btree", table.batchId.asc().nullsLast().op("text_ops")),
	index("invite_codes_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("invite_codes_is_used_idx").using("btree", table.isUsed.asc().nullsLast().op("bool_ops")),
	unique("invite_codes_code_unique").on(table.code),
]);

export const userBalances = pgTable("user_balances", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	balance: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	totalUsed: numeric("total_used", { precision: 10, scale:  2 }).default('0').notNull(),
	totalPurchased: numeric("total_purchased", { precision: 10, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	role: varchar({ length: 20 }).default('user').notNull(),
	email: varchar({ length: 255 }),
	name: varchar({ length: 100 }),
}, (table) => [
	index("user_balances_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("user_balances_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("user_balances_user_id_unique").on(table.userId),
]);

export const loginLogs = pgTable("login_logs", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }),
	email: varchar({ length: 255 }).notNull(),
	loginType: varchar("login_type", { length: 20 }).notNull(),
	success: boolean().default(false).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("login_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("login_logs_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("login_logs_ip_address_idx").using("btree", table.ipAddress.asc().nullsLast().op("text_ops")),
	index("login_logs_success_idx").using("btree", table.success.asc().nullsLast().op("bool_ops")),
]);

export const analyticsEvents = pgTable("analytics_events", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }),
	sessionId: varchar("session_id", { length: 64 }),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	eventName: varchar("event_name", { length: 100 }).notNull(),
	eventCategory: varchar("event_category", { length: 50 }),
	eventData: text("event_data"),
	pageUrl: varchar("page_url", { length: 500 }),
	referrer: varchar({ length: 500 }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address", { length: 45 }),
	deviceType: varchar("device_type", { length: 20 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("analytics_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("analytics_events_event_name_idx").using("btree", table.eventName.asc().nullsLast().op("text_ops")),
	index("analytics_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("analytics_events_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("analytics_events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const systemConfig = pgTable("system_config", {
	key: varchar({ length: 100 }).primaryKey().notNull(),
	value: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
