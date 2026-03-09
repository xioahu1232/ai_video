-- 数据库迁移脚本：添加过期时间和用户信息字段
-- 执行时间：2026-03-09
-- 说明：
--   1. user_balances 表添加 email 和 name 字段
--   2. user_tasks 表添加 expires_at 字段
--   3. 为现有未收藏记录设置48小时过期时间

-- 1. 为 user_balances 表添加字段
ALTER TABLE user_balances 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- 2. 为 user_tasks 表添加字段
ALTER TABLE user_tasks 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 3. 为现有未收藏记录设置48小时过期时间（从创建时间计算）
UPDATE user_tasks 
SET expires_at = created_at + INTERVAL '48 hours'
WHERE starred = false AND expires_at IS NULL;

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS user_tasks_expires_at_idx ON user_tasks(expires_at);
CREATE INDEX IF NOT EXISTS user_tasks_starred_idx ON user_tasks(starred);

-- 5. 添加注释说明规则
COMMENT ON COLUMN user_tasks.expires_at IS '过期时间：未收藏48小时后过期，收藏后为NULL（永久保存）';
COMMENT ON COLUMN user_tasks.starred IS '收藏状态：收藏后永久保存，不受48小时限制';
