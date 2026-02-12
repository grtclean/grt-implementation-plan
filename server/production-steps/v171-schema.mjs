/**
 * v1.7.1 数据库迁移脚本
 * 创建CCD集成相关表
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('[v1.7.1] Starting database migration...');
  
  // 1. CCD集成配置表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ccd_integration_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(100) DEFAULT NULL,
      auto_trigger_enabled TINYINT DEFAULT 1,
      severity_threshold_critical INT DEFAULT 30,
      severity_threshold_major INT DEFAULT 60,
      severity_threshold_minor INT DEFAULT 85,
      process_mapping TEXT,
      auto_lock_on_critical TINYINT DEFAULT 1,
      auto_lock_on_major TINYINT DEFAULT 1,
      auto_notify_on_minor TINYINT DEFAULT 1,
      cooldown_minutes INT DEFAULT 5,
      is_active TINYINT DEFAULT 1,
      updated_by VARCHAR(200),
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      INDEX idx_project (project_id),
      INDEX idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.1] Created ccd_integration_config table');
  
  // 2. CCD检测日志表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ccd_detection_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      detection_id VARCHAR(100) NOT NULL,
      station_id VARCHAR(50) NOT NULL,
      project_id VARCHAR(100) NOT NULL,
      process_code VARCHAR(20),
      part_id VARCHAR(100),
      part_name VARCHAR(200),
      overall_score DECIMAL(5,2) DEFAULT 0,
      defect_count INT DEFAULT 0,
      severity VARCHAR(20) DEFAULT 'pass',
      defect_details JSON,
      triggered_interlock TINYINT DEFAULT 0,
      interlock_result JSON,
      in_cooldown TINYINT DEFAULT 0,
      equipment_id VARCHAR(100),
      inspector_id VARCHAR(200),
      detected_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      INDEX idx_project (project_id),
      INDEX idx_station (station_id),
      INDEX idx_severity (severity),
      INDEX idx_triggered (triggered_interlock),
      INDEX idx_detected_at (detected_at),
      INDEX idx_project_station (project_id, station_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.1] Created ccd_detection_log table');
  
  await connection.end();
  console.log('[v1.7.1] Migration completed successfully!');
}

migrate().catch(err => {
  console.error('[v1.7.1] Migration failed:', err);
  process.exit(1);
});
