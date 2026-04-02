-- ══════════════════════════════════════════════════════════════════
-- Migration: 0060_add_customer_fields
-- Purpose:   为客户注册扩展 users 表
-- Date:      2026-03-26
-- Author:    CTO
--
-- 新增字段:
--   phone        — 联系电话
--   company      — 公司名称
--   user_type    — 用户类别 (employee|customer|supplier|guest)
--
-- 安全:
--   全部 nullable + 有默认值，不影响现有 97 名员工数据
--   幂等执行 (IF NOT EXISTS / 重复执行安全)
-- ══════════════════════════════════════════════════════════════════

-- 1. 添加 phone 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- 2. 添加 company 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(200);

-- 3. 添加 user_type 字段，默认 'employee' (兼容现有用户)
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'employee';

-- 4. 为现有用户回填 user_type = 'employee' (确保无 NULL)
UPDATE users SET user_type = 'employee' WHERE user_type IS NULL;

-- 5. 添加索引 (客户查询按 user_type + company)
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
