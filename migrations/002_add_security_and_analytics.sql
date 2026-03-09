-- 添加登录日志表和数据埋点表
-- 执行时间：2024年

-- 1. 登录日志表（安全审计）
CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36),
  email VARCHAR(255) NOT NULL,
  login_type VARCHAR(20) NOT NULL, -- 'user' 或 'admin'
  success BOOLEAN DEFAULT FALSE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS login_logs_email_idx ON login_logs(email);
CREATE INDEX IF NOT EXISTS login_logs_success_idx ON login_logs(success);
CREATE INDEX IF NOT EXISTS login_logs_created_at_idx ON login_logs(created_at);
CREATE INDEX IF NOT EXISTS login_logs_ip_address_idx ON login_logs(ip_address);

-- 2. 数据埋点事件表（用户行为分析）
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36),
  session_id VARCHAR(64),
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50),
  event_data TEXT, -- JSON格式
  page_url VARCHAR(500),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_events_session_id_idx ON analytics_events(session_id);

-- 3. 为user_balances表添加email和name字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'email') THEN
    ALTER TABLE user_balances ADD COLUMN email VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'name') THEN
    ALTER TABLE user_balances ADD COLUMN name VARCHAR(100);
  END IF;
END $$;

-- 注释
COMMENT ON TABLE login_logs IS '登录日志表 - 记录所有登录尝试用于安全审计';
COMMENT ON TABLE analytics_events IS '数据埋点表 - 记录用户行为事件用于数据分析';
