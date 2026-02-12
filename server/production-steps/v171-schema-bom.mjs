/**
 * v1.7.1 数据库迁移脚本 - BOM导入历史表
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('[v1.7.1-bom] Starting database migration...');
  
  // BOM导入历史表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bom_import_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(100) NOT NULL,
      verification_id INT,
      file_name VARCHAR(500),
      total_rows INT DEFAULT 0,
      imported_rows INT DEFAULT 0,
      error_rows INT DEFAULT 0,
      duplicate_rows INT DEFAULT 0,
      import_status VARCHAR(20) DEFAULT 'completed',
      error_details JSON,
      imported_by VARCHAR(200),
      imported_by_name VARCHAR(200),
      rolled_back_at BIGINT,
      created_at BIGINT NOT NULL,
      INDEX idx_project (project_id),
      INDEX idx_verification (verification_id),
      INDEX idx_status (import_status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.1-bom] Created bom_import_history table');
  
  await connection.end();
  console.log('[v1.7.1-bom] Migration completed successfully!');
}

migrate().catch(err => {
  console.error('[v1.7.1-bom] Migration failed:', err);
  process.exit(1);
});
