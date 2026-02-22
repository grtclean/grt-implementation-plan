/**
 * 执行简道云全量组织数据同步
 */
import dotenv from 'dotenv';
dotenv.config();

// Dynamic import to load the server module after env is set
const { getJiandaoyunSyncService, getJiandaoyunUserSyncService } = await import('../server/jiandaoyun.ts');

const syncService = getJiandaoyunSyncService();

console.log('=== 简道云同步 ===');
console.log('API 配置:', syncService.isConfigured() ? '已配置' : '未配置');
console.log('Corp ID:', syncService.getCorpId());

if (!syncService.isConfigured()) {
  console.error('简道云 API 未配置，请检查 .env');
  process.exit(1);
}

// 1. 测试连接
console.log('\n--- 测试连接 ---');
try {
  const testResult = await syncService.testConnection();
  console.log('连接测试:', JSON.stringify(testResult));
} catch (e) {
  console.error('连接测试失败:', e.message);
  process.exit(1);
}

const userSyncService = getJiandaoyunUserSyncService();

// 2. 同步部门
console.log('\n--- 同步部门 ---');
try {
  const deptResult = await userSyncService.syncDepartments();
  console.log('部门同步结果:', JSON.stringify(deptResult, null, 2));
} catch (e) {
  console.error('部门同步失败:', e.message);
}

// 3. 同步成员
console.log('\n--- 同步成员 ---');
try {
  const memberResult = await userSyncService.syncMembers();
  console.log('成员同步结果:', JSON.stringify(memberResult, null, 2));
} catch (e) {
  console.error('成员同步失败:', e.message);
}

// 4. 同步角色
console.log('\n--- 同步角色 ---');
try {
  const roleResult = await userSyncService.syncRoles();
  console.log('角色同步结果:', JSON.stringify(roleResult, null, 2));
} catch (e) {
  console.error('角色同步失败:', e.message);
}

// 5. 同步角色成员
console.log('\n--- 同步角色成员 ---');
try {
  const rmResult = await userSyncService.syncRoleMembers();
  console.log('角色成员同步结果:', JSON.stringify(rmResult, null, 2));
} catch (e) {
  console.error('角色成员同步失败:', e.message);
}

// 6. 汇总
console.log('\n--- 汇总 ---');
const pg = (await import('pg')).default;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const tables = ['jiandaoyun_user_mappings', 'jiandaoyun_dept_mappings', 'jiandaoyun_role_mappings', 'jiandaoyun_role_members'];
for (const t of tables) {
  const r = await pool.query(`SELECT count(*) as c FROM "${t}"`);
  console.log(`  ${t}: ${r.rows[0].c} 条`);
}
await pool.end();

console.log('\n同步完成！');
process.exit(0);
