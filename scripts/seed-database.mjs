#!/usr/bin/env node

/**
 * 数据库种子数据脚本
 * 导入初始的用户、角色、权限等数据
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误: DATABASE_URL 环境变量未设置');
  process.exit(1);
}

// 解析数据库连接字符串
function parseConnectionString(url) {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.substring(1),
    port: urlObj.port || 3306,
  };
}

const dbConfig = parseConnectionString(DATABASE_URL);

async function seedDatabase() {
  let connection;
  try {
    console.log('📦 连接到数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 种子数据: 角色
    console.log('📝 导入角色数据...');
    const roles = [
      { id: 'admin', name: '管理员', description: '系统管理员，拥有所有权限' },
      { id: 'manager', name: '经理', description: '部门经理，可以管理下属员工' },
      { id: 'engineer', name: '工程师', description: '技术工程师，可以执行技术任务' },
      { id: 'user', name: '普通用户', description: '普通用户，拥有基础权限' },
    ];

    for (const role of roles) {
      try {
        await connection.execute(
          'INSERT INTO roles (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=?, description=?',
          [role.id, role.name, role.description, role.name, role.description]
        );
      } catch (err) {
        if (!err.message.includes('Duplicate')) {
          console.warn(`  ⚠️  角色 ${role.id} 导入失败:`, err.message);
        }
      }
    }
    console.log('✅ 角色数据导入完成\n');

    // 种子数据: 权限
    console.log('📝 导入权限数据...');
    const permissions = [
      { id: 'MANAGE_PERMISSIONS', name: '权限管理', description: '管理系统权限' },
      { id: 'MANAGE_MENUS', name: '菜单管理', description: '管理菜单配置' },
      { id: 'MANAGE_VISITORS', name: '来访管理', description: '管理来访申请' },
      { id: 'USE_AI_ASSISTANT', name: '使用AI助手', description: '使用AI助手功能' },
      { id: 'MANAGE_CAPABILITIES', name: '能力管理', description: '管理员工能力' },
      { id: 'VIEW_DASHBOARD', name: '查看仪表板', description: '查看系统仪表板' },
      { id: 'MANAGE_USERS', name: '用户管理', description: '管理系统用户' },
      { id: 'MANAGE_ROLES', name: '角色管理', description: '管理系统角色' },
    ];

    for (const permission of permissions) {
      try {
        await connection.execute(
          'INSERT INTO permissions (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=?, description=?',
          [permission.id, permission.name, permission.description, permission.name, permission.description]
        );
      } catch (err) {
        if (!err.message.includes('Duplicate')) {
          console.warn(`  ⚠️  权限 ${permission.id} 导入失败:`, err.message);
        }
      }
    }
    console.log('✅ 权限数据导入完成\n');

    // 种子数据: 角色-权限关联
    console.log('📝 导入角色-权限关联...');
    const rolePermissions = [
      // 管理员: 所有权限
      { roleId: 'admin', permissionId: 'MANAGE_PERMISSIONS' },
      { roleId: 'admin', permissionId: 'MANAGE_MENUS' },
      { roleId: 'admin', permissionId: 'MANAGE_VISITORS' },
      { roleId: 'admin', permissionId: 'USE_AI_ASSISTANT' },
      { roleId: 'admin', permissionId: 'MANAGE_CAPABILITIES' },
      { roleId: 'admin', permissionId: 'VIEW_DASHBOARD' },
      { roleId: 'admin', permissionId: 'MANAGE_USERS' },
      { roleId: 'admin', permissionId: 'MANAGE_ROLES' },
      // 经理: 部分权限
      { roleId: 'manager', permissionId: 'MANAGE_VISITORS' },
      { roleId: 'manager', permissionId: 'USE_AI_ASSISTANT' },
      { roleId: 'manager', permissionId: 'VIEW_DASHBOARD' },
      { roleId: 'manager', permissionId: 'MANAGE_CAPABILITIES' },
      // 工程师: 基础权限
      { roleId: 'engineer', permissionId: 'USE_AI_ASSISTANT' },
      { roleId: 'engineer', permissionId: 'VIEW_DASHBOARD' },
      // 普通用户: 最小权限
      { roleId: 'user', permissionId: 'VIEW_DASHBOARD' },
    ];

    for (const rp of rolePermissions) {
      try {
        await connection.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id=role_id',
          [rp.roleId, rp.permissionId]
        );
      } catch (err) {
        if (!err.message.includes('Duplicate')) {
          console.warn(`  ⚠️  角色-权限关联 ${rp.roleId}-${rp.permissionId} 导入失败:`, err.message);
        }
      }
    }
    console.log('✅ 角色-权限关联导入完成\n');

    // 种子数据: 数据范围
    console.log('📝 导入数据范围...');
    const dataScopes = [
      { id: 'ALL', name: '全部数据', description: '可以访问所有数据' },
      { id: 'DEPARTMENT', name: '部门数据', description: '只能访问本部门数据' },
      { id: 'PERSONAL', name: '个人数据', description: '只能访问个人数据' },
    ];

    for (const scope of dataScopes) {
      try {
        await connection.execute(
          'INSERT INTO data_scopes (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=?, description=?',
          [scope.id, scope.name, scope.description, scope.name, scope.description]
        );
      } catch (err) {
        if (!err.message.includes('Duplicate')) {
          console.warn(`  ⚠️  数据范围 ${scope.id} 导入失败:`, err.message);
        }
      }
    }
    console.log('✅ 数据范围导入完成\n');

    console.log('🎉 种子数据导入完成！');
    console.log('\n📊 导入统计:');
    console.log('  - 角色: 4个');
    console.log('  - 权限: 8个');
    console.log('  - 角色-权限关联: 15个');
    console.log('  - 数据范围: 3个');

    await connection.end();
  } catch (error) {
    console.error('❌ 种子数据导入失败:', error.message);
    process.exit(1);
  }
}

seedDatabase();
