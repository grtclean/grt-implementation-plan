import fs from 'fs';
import mysql from 'mysql2/promise';

// 读取简道云用户数据
const data = JSON.parse(fs.readFileSync('/tmp/jdy_users.json', 'utf8'));
const users = data.users;

console.log(`准备同步 ${users.length} 个用户...`);

// 数据库连接
const connection = await mysql.createConnection(process.env.DATABASE_URL);

// 清空现有数据
await connection.execute('DELETE FROM jdy_user_mappings WHERE 1=1');
console.log('已清空现有用户映射数据');

// 插入用户数据
// 表结构: jdy_username, jdy_name, jdy_dept_no, jdy_dept_name, jdy_status, sync_status, last_sync_at
let inserted = 0;
for (const user of users) {
  try {
    const deptNo = user.departments && user.departments.length > 0 ? user.departments[0] : null;
    await connection.execute(
      `INSERT INTO jdy_user_mappings (jdy_username, jdy_name, jdy_dept_no, jdy_status, sync_status, last_sync_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user.username, user.name, deptNo, 'active', 'synced']
    );
    inserted++;
  } catch (err) {
    console.error(`插入用户 ${user.name} 失败:`, err.message);
  }
}

console.log(`成功同步 ${inserted} 个用户`);

// 验证
const [rows] = await connection.execute('SELECT COUNT(*) as count FROM jdy_user_mappings');
console.log(`数据库中现有 ${rows[0].count} 条用户映射记录`);

await connection.end();
