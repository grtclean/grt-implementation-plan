/**
 * 员工数据初始化脚本
 * 将93条员工记录导入到数据库
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 部门到BU的映射
const departmentToBU = {
  "事业一部": "BU1",
  "事业二部": "BU2", 
  "事业三部": "BU3",
  "事业四部": "BU4",
  "事业十部": "BU5",
  "总裁办": "HQ",
  "财务部": "FINANCE",
  "人事行政部": "HR",
  "AI数智部": "IT",
  "事业部支持部": "SUPPORT",
};

// 员工数据 — 以 data/employees.json 为权威来源 (96人, 2026-03-12 同步)
const employees = [
  {employeeId: "GRT001", name: "倪亚东", department: "总裁办", position: "董事长"},
  {employeeId: "GRT002", name: "黄晓兰", department: "财务部", position: "会计"},
  {employeeId: "GRT003", name: "倪亚琴", department: "事业三部", position: "采购与项目工程师"},
  {employeeId: "GRT004", name: "戴晓燕", department: "事业一部", position: "高级销售经理"},
  {employeeId: "GRT005", name: "金晓锋", department: "事业一部", position: "制造质量经理"},
  {employeeId: "GRT006", name: "洪香龙", department: "事业二部", position: "机械设计经理"},
  {employeeId: "GRT007", name: "孙坚", department: "事业三部", position: "电气主管"},
  {employeeId: "GRT008", name: "马柯", department: "事业十部", position: "质量专员"},
  {employeeId: "GRT009", name: "史龙昌", department: "事业十部", position: "激光切作班组长"},
  {employeeId: "GRT010", name: "吴卫成", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT011", name: "张超", department: "事业十部", position: "激光"},
  {employeeId: "GRT012", name: "李兴伟", department: "事业十部", position: "冷作"},
  {employeeId: "GRT013", name: "孙淼", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT014", name: "廉龙海", department: "事业一部", position: "售后技工"},
  {employeeId: "GRT015", name: "杜显文", department: "事业一部", position: "电气班组副班长"},
  {employeeId: "GRT016", name: "曹庆伟", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT017", name: "田坪珍", department: "事业一部", position: "焊工"},
  {employeeId: "GRT018", name: "孙国祥", department: "事业四部", position: "电气工程师"},
  {employeeId: "GRT019", name: "冯艳", department: "事业三部", position: "销售与项目工程师"},
  {employeeId: "GRT020", name: "张洵", department: "事业一部", position: "采购与项目工程师"},
  {employeeId: "GRT021", name: "张松松", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT022", name: "李大鹏", department: "事业一部", position: "电气工程师"},
  {employeeId: "GRT023", name: "杨之雲", department: "事业三部", position: "电气装配"},
  {employeeId: "GRT024", name: "张腾飞", department: "事业四部", position: "机加工班组长"},
  {employeeId: "GRT025", name: "肖博雅", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT028", name: "朱明华", department: "事业一部", position: "售后技工"},
  {employeeId: "GRT029", name: "殷小勇", department: "事业三部", position: "电气装配"},
  {employeeId: "GRT030", name: "匡凯旋", department: "事业一部", position: "售后服务主管"},
  {employeeId: "GRT031", name: "沈龙翔", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT032", name: "王犇", department: "事业三部", position: "机械装配"},

  {employeeId: "GRT034", name: "王勇", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT035", name: "王志强", department: "事业三部", position: "销售与项目工程师"},
  {employeeId: "GRT036", name: "韩品来", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT037", name: "黄潇潇", department: "事业三部", position: "文员"},
  {employeeId: "GRT038", name: "马林山", department: "事业二部", position: "装配班组长"},
  {employeeId: "GRT039", name: "侯德朋", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT040", name: "曾春贵", department: "事业一部", position: "售后技工"},
  {employeeId: "GRT041", name: "张良", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT042", name: "刘建年", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT043", name: "韩保程", department: "事业一部", position: "销售与项目工程师"},
  {employeeId: "GRT044", name: "洪小东", department: "事业二部", position: "机械研发工程师"},
  {employeeId: "GRT045", name: "杨勇", department: "事业三部", position: "生产工程师兼项目经理"},
  {employeeId: "GRT046", name: "吕雪冬", department: "事业一部", position: "电气班组班长"},
  {employeeId: "GRT047", name: "嵇国华", department: "事业一部", position: "协作辅助"},
  {employeeId: "GRT049", name: "胡杨", department: "AI数智部", position: "IT工程师"},
  {employeeId: "GRT050", name: "蕾翠林", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT051", name: "崔聪聪", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT052", name: "赵强", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT053", name: "段天珠", department: "人事行政部", position: "前法"},
  {employeeId: "GRT054", name: "王秀萍", department: "财务部", position: "总账会计"},
  {employeeId: "GRT055", name: "沈迎凤", department: "事业三部", position: "采购经理"},
  {employeeId: "GRT056", name: "陈成成", department: "事业三部", position: "焊工"},
  {employeeId: "GRT057", name: "滕顺英", department: "事业一部", position: "采购与项目工程师"},
  {employeeId: "GRT058", name: "周辉", department: "事业三部", position: "事业三部经理"},
  {employeeId: "GRT059", name: "焦斌", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT060", name: "杨会龙", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT061", name: "李明遂", department: "事业一部", position: "数控车工"},
  {employeeId: "GRT062", name: "朱宇浩", department: "事业二部", position: "生产工程师兼项目及IT工程师"},
  {employeeId: "GRT063", name: "刘健康", department: "事业一部", position: "销售与项目工程师"},
  {employeeId: "GRT064", name: "强兵兵", department: "事业一部", position: "激光切割"},
  {employeeId: "GRT065", name: "蔡瑞", department: "事业二部", position: "机械研发工程师"},
  {employeeId: "GRT066", name: "李新正", department: "财务部", position: "仓库管理员"},
  {employeeId: "GRT067", name: "沙建梅", department: "人事行政部", position: "人事行政主管"},
  {employeeId: "GRT068", name: "李亚超", department: "事业十部", position: "CNC操作工"},
  {employeeId: "GRT069", name: "李鹏飞", department: "事业十部", position: "数控车工"},
  {employeeId: "GRT071", name: "刘琛杨", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT072", name: "赵铖杰", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT073", name: "范威", department: "事业十部", position: "CNC操作工"},
  {employeeId: "GRT074", name: "王金涛", department: "事业二部", position: "机械装配"},
  {employeeId: "GRT075", name: "胡绍杰", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT076", name: "王森", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT077", name: "吴阳洋", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT079", name: "阎建华", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT080", name: "刘奥运", department: "AI数智部", position: "董事长助理"},
  {employeeId: "GRT081", name: "马康风", department: "财务部", position: "供应链助理工程师"},
  {employeeId: "GRT082", name: "沈富高", department: "事业一部", position: "焊工"},
  {employeeId: "GRT083", name: "刘坤", department: "AI数智部", position: "市场主管"},
  {employeeId: "GRT084", name: "蒋秋瑞", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT087", name: "梅奥杰", department: "事业一部", position: "助理电气工程师"},
  {employeeId: "GRT088", name: "高嘉义", department: "事业一部", position: "助理电气工程师"},
  {employeeId: "GRT089", name: "罗小玲", department: "事业三部", position: "助理机械研发工程师"},
  {employeeId: "GRT090", name: "陈加丽", department: "事业一部", position: "助理机械研发工程师"},
  {employeeId: "GRT093", name: "李柯瑶", department: "事业一部", position: "销售与项目工程师"},
  {employeeId: "GRT094", name: "徐树奎", department: "事业一部", position: "事业二部经理"},
  {employeeId: "GRT095", name: "王爱云", department: "人事行政部", position: "后勤助理"},

  {employeeId: "GRT097", name: "钱佳奇", department: "事业二部", position: "电气工程师"},
  {employeeId: "GRT099", name: "殷金刚", department: "事业二部", position: "机械研发工程师"},
  {employeeId: "GRT100", name: "田炜钰", department: "人事行政部", position: "行政前台"},
  {employeeId: "GRT101", name: "王汝月", department: "财务部", position: "会计助理"},
  {employeeId: "GRT102", name: "张飞", department: "事业十部", position: "机加工铣工"},
  {employeeId: "GRT103", name: "朱文韬", department: "AI数智部", position: "市场专员"},
  {employeeId: "GRT104", name: "董纾雨", department: "事业一部", position: "销售与项目工程师"},
  {employeeId: "GRT105", name: "倪微薇", department: "AI数智部", position: "AI数智&人事行政部经理"},
  {employeeId: "GRT079_2", name: "马鹏风", department: "财务部", position: "供应链工程师"},
];

async function initEmployees() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('开始初始化员工数据...');
  console.log(`总共 ${employees.length} 条记录`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const emp of employees) {
    const buCode = departmentToBU[emp.department] || 'OTHER';
    
    try {
      await connection.execute(
        `INSERT INTO company_employees (employee_id, name, department, position, bu_code, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name), department=VALUES(department), position=VALUES(position), bu_code=VALUES(bu_code), updated_at=NOW()`,
        [emp.employeeId, emp.name, emp.department, emp.position, buCode]
      );
      successCount++;
      console.log(`✓ ${emp.employeeId} ${emp.name} (${emp.department} - ${buCode})`);
    } catch (error) {
      errorCount++;
      console.error(`✗ ${emp.employeeId} ${emp.name}: ${error.message}`);
    }
  }
  
  console.log('\n初始化完成!');
  console.log(`成功: ${successCount}, 失败: ${errorCount}`);
  
  // 统计各BU人数
  const [stats] = await connection.execute(
    `SELECT bu_code, COUNT(*) as count FROM company_employees GROUP BY bu_code ORDER BY bu_code`
  );
  
  console.log('\n各事业部人数统计:');
  for (const row of stats) {
    console.log(`  ${row.bu_code}: ${row.count}人`);
  }
  
  await connection.end();
}

initEmployees().catch(console.error);
