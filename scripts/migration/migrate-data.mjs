#!/usr/bin/env node
/**
 * GRT智能系统 - 数据迁移工具
 * 
 * 功能：
 * 1. 从Manus云端MySQL数据库导出数据
 * 2. 导入数据到本地MySQL数据库
 * 3. 支持增量迁移
 * 4. 数据验证和完整性检查
 * 5. 迁移日志和回滚功能
 * 
 * 使用方法：
 * node migrate-data.mjs export --source <云端数据库URL>
 * node migrate-data.mjs import --target <本地数据库URL> --file <导出文件>
 * node migrate-data.mjs sync --source <云端> --target <本地>
 * node migrate-data.mjs rollback --target <本地> --backup <备份文件>
 */

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  exportDir: path.join(__dirname, 'exports'),
  backupDir: path.join(__dirname, 'backups'),
  logDir: path.join(__dirname, 'logs'),
  batchSize: 1000,
  tables: [
    'user',
    'opportunity',
    'opportunity_follow_up',
    'opportunity_import_history',
    'report_schedule',
    'report_send_history',
    'report_template',
    'alert_rule',
    'alert_notification',
    'task_execution_log',
    'field_mapping_config',
    'template_usage_stats'
  ]
};

// 日志工具
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logs = [];
  }

  log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    this.logs.push(entry);
    
    const color = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      WARNING: '\x1b[33m',
      ERROR: '\x1b[31m'
    }[level] || '\x1b[0m';
    
    console.log(`${color}[${level}]\x1b[0m ${message}`);
    if (data) console.log('  ', JSON.stringify(data, null, 2));
  }

  info(message, data) { this.log('INFO', message, data); }
  success(message, data) { this.log('SUCCESS', message, data); }
  warning(message, data) { this.log('WARNING', message, data); }
  error(message, data) { this.log('ERROR', message, data); }

  async save() {
    await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    await fs.writeFile(this.logFile, JSON.stringify(this.logs, null, 2));
  }
}

// 数据库连接解析
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('无效的数据库URL格式');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
}

// 创建数据库连接
async function createConnection(dbUrl) {
  const config = parseDbUrl(dbUrl);
  return await mysql.createConnection({
    ...config,
    multipleStatements: true,
    dateStrings: true
  });
}

// ========================================
// 导出功能
// ========================================

async function exportData(sourceUrl, options = {}) {
  const logger = new Logger(path.join(CONFIG.logDir, `export_${Date.now()}.json`));
  logger.info('开始数据导出...');
  
  let connection;
  try {
    connection = await createConnection(sourceUrl);
    logger.success('已连接到源数据库');
    
    // 创建导出目录
    await fs.mkdir(CONFIG.exportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = path.join(CONFIG.exportDir, `grt_export_${timestamp}.json`);
    
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        sourceUrl: sourceUrl.replace(/:[^:@]+@/, ':****@'),
        version: '1.0.0'
      },
      tables: {}
    };
    
    // 导出每个表
    for (const table of CONFIG.tables) {
      logger.info(`导出表: ${table}`);
      
      try {
        // 检查表是否存在
        const [tables] = await connection.query(
          `SHOW TABLES LIKE '${table}'`
        );
        
        if (tables.length === 0) {
          logger.warning(`表 ${table} 不存在，跳过`);
          continue;
        }
        
        // 获取表结构
        const [columns] = await connection.query(
          `SHOW COLUMNS FROM \`${table}\``
        );
        
        // 获取数据
        let offset = 0;
        let allRows = [];
        
        while (true) {
          const [rows] = await connection.query(
            `SELECT * FROM \`${table}\` LIMIT ${CONFIG.batchSize} OFFSET ${offset}`
          );
          
          if (rows.length === 0) break;
          
          allRows = allRows.concat(rows);
          offset += CONFIG.batchSize;
          
          if (rows.length < CONFIG.batchSize) break;
        }
        
        exportData.tables[table] = {
          columns: columns.map(c => ({
            name: c.Field,
            type: c.Type,
            nullable: c.Null === 'YES',
            key: c.Key,
            default: c.Default
          })),
          rowCount: allRows.length,
          data: allRows
        };
        
        logger.success(`表 ${table} 导出完成: ${allRows.length} 行`);
        
      } catch (err) {
        logger.error(`导出表 ${table} 失败`, { error: err.message });
      }
    }
    
    // 保存导出文件
    await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2));
    logger.success(`数据导出完成: ${exportFile}`);
    
    // 生成摘要
    const summary = {
      exportFile,
      totalTables: Object.keys(exportData.tables).length,
      totalRows: Object.values(exportData.tables).reduce((sum, t) => sum + t.rowCount, 0),
      tables: Object.entries(exportData.tables).map(([name, data]) => ({
        name,
        rows: data.rowCount
      }))
    };
    
    logger.info('导出摘要', summary);
    await logger.save();
    
    return { success: true, exportFile, summary };
    
  } catch (err) {
    logger.error('导出失败', { error: err.message });
    await logger.save();
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

// ========================================
// 导入功能
// ========================================

async function importData(targetUrl, importFile, options = {}) {
  const logger = new Logger(path.join(CONFIG.logDir, `import_${Date.now()}.json`));
  logger.info('开始数据导入...');
  
  let connection;
  try {
    // 读取导出文件
    const fileContent = await fs.readFile(importFile, 'utf-8');
    const exportData = JSON.parse(fileContent);
    
    logger.info('导出文件信息', exportData.metadata);
    
    connection = await createConnection(targetUrl);
    logger.success('已连接到目标数据库');
    
    // 创建备份
    if (!options.skipBackup) {
      logger.info('创建导入前备份...');
      const backupFile = await createBackup(connection, targetUrl);
      logger.success(`备份已创建: ${backupFile}`);
    }
    
    // 禁用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const importStats = {
      success: [],
      failed: [],
      skipped: []
    };
    
    // 按依赖顺序导入表
    const importOrder = [
      'user',
      'opportunity',
      'opportunity_follow_up',
      'opportunity_import_history',
      'report_template',
      'report_schedule',
      'report_send_history',
      'alert_rule',
      'alert_notification',
      'task_execution_log',
      'field_mapping_config',
      'template_usage_stats'
    ];
    
    for (const table of importOrder) {
      if (!exportData.tables[table]) {
        logger.warning(`表 ${table} 在导出文件中不存在，跳过`);
        importStats.skipped.push(table);
        continue;
      }
      
      const tableData = exportData.tables[table];
      logger.info(`导入表: ${table} (${tableData.rowCount} 行)`);
      
      try {
        // 检查表是否存在
        const [tables] = await connection.query(
          `SHOW TABLES LIKE '${table}'`
        );
        
        if (tables.length === 0) {
          logger.warning(`目标数据库中表 ${table} 不存在，跳过`);
          importStats.skipped.push(table);
          continue;
        }
        
        // 清空表（如果选择覆盖模式）
        if (options.overwrite) {
          await connection.query(`TRUNCATE TABLE \`${table}\``);
          logger.info(`表 ${table} 已清空`);
        }
        
        // 批量插入数据
        if (tableData.data.length > 0) {
          const columns = Object.keys(tableData.data[0]);
          const placeholders = columns.map(() => '?').join(', ');
          
          let inserted = 0;
          for (let i = 0; i < tableData.data.length; i += CONFIG.batchSize) {
            const batch = tableData.data.slice(i, i + CONFIG.batchSize);
            
            for (const row of batch) {
              const values = columns.map(col => row[col]);
              
              try {
                if (options.overwrite) {
                  await connection.query(
                    `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
                    values
                  );
                } else {
                  // 使用 INSERT IGNORE 避免重复
                  await connection.query(
                    `INSERT IGNORE INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
                    values
                  );
                }
                inserted++;
              } catch (err) {
                if (!err.message.includes('Duplicate entry')) {
                  logger.warning(`插入行失败: ${err.message}`);
                }
              }
            }
            
            logger.info(`  进度: ${Math.min(i + CONFIG.batchSize, tableData.data.length)}/${tableData.data.length}`);
          }
          
          logger.success(`表 ${table} 导入完成: ${inserted} 行`);
        }
        
        importStats.success.push({ table, rows: tableData.rowCount });
        
      } catch (err) {
        logger.error(`导入表 ${table} 失败`, { error: err.message });
        importStats.failed.push({ table, error: err.message });
      }
    }
    
    // 恢复外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // 验证数据
    logger.info('验证导入数据...');
    for (const item of importStats.success) {
      const [result] = await connection.query(
        `SELECT COUNT(*) as count FROM \`${item.table}\``
      );
      const actualCount = result[0].count;
      
      if (actualCount >= item.rows) {
        logger.success(`表 ${item.table} 验证通过: ${actualCount} 行`);
      } else {
        logger.warning(`表 ${item.table} 行数不匹配: 期望 ${item.rows}, 实际 ${actualCount}`);
      }
    }
    
    logger.info('导入摘要', importStats);
    await logger.save();
    
    return { success: true, stats: importStats };
    
  } catch (err) {
    logger.error('导入失败', { error: err.message });
    await logger.save();
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

// ========================================
// 备份功能
// ========================================

async function createBackup(connection, dbUrl) {
  await fs.mkdir(CONFIG.backupDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(CONFIG.backupDir, `backup_${timestamp}.json`);
  
  const backupData = {
    metadata: {
      backupTime: new Date().toISOString(),
      version: '1.0.0'
    },
    tables: {}
  };
  
  for (const table of CONFIG.tables) {
    try {
      const [tables] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (tables.length === 0) continue;
      
      const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
      backupData.tables[table] = rows;
    } catch (err) {
      console.warn(`备份表 ${table} 失败: ${err.message}`);
    }
  }
  
  await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
  return backupFile;
}

// ========================================
// 回滚功能
// ========================================

async function rollbackData(targetUrl, backupFile) {
  const logger = new Logger(path.join(CONFIG.logDir, `rollback_${Date.now()}.json`));
  logger.info('开始数据回滚...');
  
  let connection;
  try {
    const fileContent = await fs.readFile(backupFile, 'utf-8');
    const backupData = JSON.parse(fileContent);
    
    logger.info('备份文件信息', backupData.metadata);
    
    connection = await createConnection(targetUrl);
    logger.success('已连接到目标数据库');
    
    // 禁用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const [table, rows] of Object.entries(backupData.tables)) {
      logger.info(`回滚表: ${table}`);
      
      try {
        // 清空表
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        
        // 恢复数据
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const placeholders = columns.map(() => '?').join(', ');
          
          for (const row of rows) {
            const values = columns.map(col => row[col]);
            await connection.query(
              `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
              values
            );
          }
        }
        
        logger.success(`表 ${table} 回滚完成: ${rows.length} 行`);
        
      } catch (err) {
        logger.error(`回滚表 ${table} 失败`, { error: err.message });
      }
    }
    
    // 恢复外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    logger.success('数据回滚完成');
    await logger.save();
    
    return { success: true };
    
  } catch (err) {
    logger.error('回滚失败', { error: err.message });
    await logger.save();
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

// ========================================
// 增量同步
// ========================================

async function syncData(sourceUrl, targetUrl, options = {}) {
  const logger = new Logger(path.join(CONFIG.logDir, `sync_${Date.now()}.json`));
  logger.info('开始增量同步...');
  
  let sourceConn, targetConn;
  try {
    sourceConn = await createConnection(sourceUrl);
    targetConn = await createConnection(targetUrl);
    
    logger.success('已连接到源和目标数据库');
    
    // 获取上次同步时间
    const lastSyncFile = path.join(CONFIG.logDir, 'last_sync.json');
    let lastSyncTime = null;
    
    try {
      const lastSync = JSON.parse(await fs.readFile(lastSyncFile, 'utf-8'));
      lastSyncTime = new Date(lastSync.timestamp);
      logger.info(`上次同步时间: ${lastSyncTime.toISOString()}`);
    } catch {
      logger.info('首次同步，将同步所有数据');
    }
    
    const syncStats = { synced: [], failed: [] };
    
    for (const table of CONFIG.tables) {
      logger.info(`同步表: ${table}`);
      
      try {
        // 检查表是否有 updated_at 字段
        const [columns] = await sourceConn.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'updated_at'`);
        
        let query = `SELECT * FROM \`${table}\``;
        if (columns.length > 0 && lastSyncTime) {
          query += ` WHERE updated_at > '${lastSyncTime.toISOString()}'`;
        }
        
        const [rows] = await sourceConn.query(query);
        
        if (rows.length === 0) {
          logger.info(`表 ${table} 无需同步`);
          continue;
        }
        
        // 使用 REPLACE INTO 进行更新或插入
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(', ');
        
        let synced = 0;
        for (const row of rows) {
          const values = cols.map(col => row[col]);
          await targetConn.query(
            `REPLACE INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
            values
          );
          synced++;
        }
        
        logger.success(`表 ${table} 同步完成: ${synced} 行`);
        syncStats.synced.push({ table, rows: synced });
        
      } catch (err) {
        logger.error(`同步表 ${table} 失败`, { error: err.message });
        syncStats.failed.push({ table, error: err.message });
      }
    }
    
    // 保存同步时间
    await fs.writeFile(lastSyncFile, JSON.stringify({
      timestamp: new Date().toISOString()
    }));
    
    logger.info('同步摘要', syncStats);
    await logger.save();
    
    return { success: true, stats: syncStats };
    
  } catch (err) {
    logger.error('同步失败', { error: err.message });
    await logger.save();
    throw err;
  } finally {
    if (sourceConn) await sourceConn.end();
    if (targetConn) await targetConn.end();
  }
}

// ========================================
// 命令行接口
// ========================================

function showHelp() {
  console.log(`
GRT智能系统 - 数据迁移工具

用法:
  node migrate-data.mjs <命令> [选项]

命令:
  export    从源数据库导出数据
  import    导入数据到目标数据库
  sync      增量同步数据
  rollback  回滚到备份状态

选项:
  --source <url>    源数据库URL (mysql://user:pass@host:port/db)
  --target <url>    目标数据库URL
  --file <path>     导出/备份文件路径
  --overwrite       覆盖模式（清空目标表后导入）
  --skip-backup     跳过导入前备份

示例:
  # 导出数据
  node migrate-data.mjs export --source "mysql://user:pass@cloud-host:3306/grt_db"

  # 导入数据
  node migrate-data.mjs import --target "mysql://root:pass@localhost:3306/grt_local" --file ./exports/grt_export_xxx.json

  # 增量同步
  node migrate-data.mjs sync --source "mysql://..." --target "mysql://..."

  # 回滚
  node migrate-data.mjs rollback --target "mysql://..." --file ./backups/backup_xxx.json
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const command = args[0];
  const options = {};
  
  // 解析参数
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--source') options.source = args[++i];
    else if (args[i] === '--target') options.target = args[++i];
    else if (args[i] === '--file') options.file = args[++i];
    else if (args[i] === '--overwrite') options.overwrite = true;
    else if (args[i] === '--skip-backup') options.skipBackup = true;
  }
  
  try {
    switch (command) {
      case 'export':
        if (!options.source) {
          console.error('错误: 需要 --source 参数');
          process.exit(1);
        }
        await exportData(options.source, options);
        break;
        
      case 'import':
        if (!options.target || !options.file) {
          console.error('错误: 需要 --target 和 --file 参数');
          process.exit(1);
        }
        await importData(options.target, options.file, options);
        break;
        
      case 'sync':
        if (!options.source || !options.target) {
          console.error('错误: 需要 --source 和 --target 参数');
          process.exit(1);
        }
        await syncData(options.source, options.target, options);
        break;
        
      case 'rollback':
        if (!options.target || !options.file) {
          console.error('错误: 需要 --target 和 --file 参数');
          process.exit(1);
        }
        await rollbackData(options.target, options.file);
        break;
        
      default:
        console.error(`未知命令: ${command}`);
        showHelp();
        process.exit(1);
    }
    
    console.log('\n✅ 操作完成');
    
  } catch (err) {
    console.error('\n❌ 操作失败:', err.message);
    process.exit(1);
  }
}

main();
