#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 自动创建所有表和导入种子数据
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🚀 开始数据库初始化...\n');

try {
  // 步骤1: 生成迁移文件
  console.log('📝 步骤1: 生成迁移文件...');
  execSync('NODE_OPTIONS=--max_old_space_size=8192 drizzle-kit generate', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max_old_space_size=8192' }
  });
  console.log('✅ 迁移文件生成完成\n');

  // 步骤2: 执行迁移
  console.log('🔧 步骤2: 执行数据库迁移...');
  execSync('NODE_OPTIONS=--max_old_space_size=8192 drizzle-kit migrate', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max_old_space_size=8192' }
  });
  console.log('✅ 数据库迁移完成\n');

  // 步骤3: 导入种子数据
  console.log('🌱 步骤3: 导入种子数据...');
  execSync('node scripts/seed-database.mjs', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('✅ 种子数据导入完成\n');

  console.log('🎉 数据库初始化成功！');
  console.log('\n📊 数据库统计:');
  console.log('  - 总表数: 85+');
  console.log('  - 权限系统: 11个表');
  console.log('  - 菜单系统: 7个表');
  console.log('  - 来访系统: 6个表');
  console.log('  - AI助手: 5个表');
  console.log('  - 能力管理: 6个表');
  console.log('\n✨ 系统已准备就绪！');

} catch (error) {
  console.error('❌ 数据库初始化失败:', error.message);
  process.exit(1);
}
