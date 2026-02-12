-- GRT智能系统 MySQL初始化脚本
-- 版本: v3.1.7

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS grt_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE grt_db;

-- 授权
GRANT ALL PRIVILEGES ON grt_db.* TO 'grt'@'%';
FLUSH PRIVILEGES;

-- 输出初始化完成信息
SELECT 'GRT数据库初始化完成' AS message;
