import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute(`
  SELECT TABLE_NAME 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('engineering_tasks', 'task_notifications', 'customer_communications', 
    'engineering_inputs', 'bom_assembly_tasks', 'smart_devices', 'device_tasks', 
    'cad_models', 'customer_ai_connections', 'customer_portal_accounts', 
    'customer_portal_users', 'project_access_permissions', 'special_approvals', 
    'customer_access_logs', 'seo_configurations')
`);
console.log('Existing tables:', rows.map(r => r.TABLE_NAME));
await connection.end();
