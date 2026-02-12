-- GRT Intelligent System - Database Initialization Script
-- Sprint 4: 生产环境准备
-- 适用于 PostgreSQL 15

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 设置时区
SET timezone = 'UTC';

-- 创建用户角色枚举
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'specialist', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建项目状态枚举
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建会议状态枚举
DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE 'GRT Database initialization completed successfully!';
END $$;
