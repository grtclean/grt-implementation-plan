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

// 员工数据
const employees = [
  {employeeId: "GRT001", name: "侯亚东", department: "总裁办", position: "董事长"},
  {employeeId: "GRT002", name: "黄晓三", department: "财务部", position: "会计"},
  {employeeId: "GRT003", name: "侯亚琴", department: "事业三部", position: "采购与项目工程师"},
  {employeeId: "GRT004", name: "戴晓燕", department: "事业一部", position: "高级销售经理"},
  {employeeId: "GRT005", name: "金晓锋", department: "事业一部", position: "制造质量经理"},
  {employeeId: "GRT006", name: "洪希龙", department: "事业二部", position: "机械设计经理"},
  {employeeId: "GRT007", name: "孙坚", department: "事业三部", position: "电气主管"},
  {employeeId: "GRT008", name: "马柯", department: "事业十部", position: "质量专员"},
  {employeeId: "GRT009", name: "史龙昌", department: "事业十部", position: "激光切作班组长"},
  {employeeId: "GRT010", name: "吴卫斌", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT011", name: "张超", department: "事业十部", position: "激光"},
  {employeeId: "GRT012", name: "李兴伟", department: "事业十部", position: "冷作"},
  {employeeId: "GRT013", name: "孙珍", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT014", name: "瞿龙海", department: "事业一部", position: "售后技工"},
  {employeeId: "GRT015", name: "杜显文", department: "事业一部", position: "电气班组副班长"},
  {employeeId: "GRT016", name: "曹庆伟", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT017", name: "田坪珍", department: "事业一部", position: "焊工"},
  {employeeId: "GRT018", name: "孙国祥", department: "事业四部", position: "电气工程师"},
  {employeeId: "GRT019", name: "冯艳", department: "事业三部", position: "销售与项目工程师"},
  {employeeId: "GRT020", name: "张海", department: "事业一部", position: "采购与项目工程师"},
  {employeeId: "GRT021", name: "张松松", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT022", name: "李大鹏", department: "事业一部", position: "电气工程师"},
  {employeeId: "GRT023", name: "杨之贤", department: "事业三部", position: "电气装配"},
  {employeeId: "GRT024", name: "张鹏飞", department: "事业四部", position: "机加工班组长"},
  {employeeId: "GRT025", name: "肖辉隆", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT028", name: "朱明华", department: "事业一部", position: "售后技工"},
  {employeeId: "GRT029", name: "殷小勇", department: "事业三部", position: "电气装配"},
  {employeeId: "GRT030", name: "匡丽娟", department: "事业一部", position: "售后服务主管"},
  {employeeId: "GRT031", name: "沈龙翔", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT032", name: "王丹", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT033", name: "张龙", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT034", name: "王勇", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT035", name: "王志亮", department: "事业三部", position: "销售与项目工程师"},
  {employeeId: "GRT036", name: "韩品来", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT037", name: "黄清清", department: "事业三部", position: "文员"},
  {employeeId: "GRT038", name: "马林山", department: "事业二部", position: "装配班组长"},
  {employeeId: "GRT039", name: "侯德明", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT040", name: "曾春贵", department: "事业一部", position: "售后技工"},
  {employeeId: "GRT041", name: "张良", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT042", name: "刘建华", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT043", name: "韩保程", department: "事业一部", position: "销售与项目工程师"},
  {employeeId: "GRT044", name: "洪小东", department: "事业二部", position: "机械研发工程师"},
  {employeeId: "GRT045", name: "杨勇", department: "事业部支持部", position: "客户与服务经理"},
  {employeeId: "GRT046", name: "吕昌冬", department: "事业一部", position: "电气班组班长"},
  {employeeId: "GRT047", name: "胡国华", department: "事业一部", position: "协作辅助"},
  {employeeId: "GRT049", name: "胡炜", department: "AI数智部", position: "IT工程师"},
  {employeeId: "GRT050", name: "蕾翠林", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT051", name: "崔晓鸣", department: "事业一部", position: "电气装配"},
  {employeeId: "GRT052", name: "赵强", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT053", name: "段天珠", department: "人事行政部", position: "前法"},
  {employeeId: "GRT054", name: "王秀萍", department: "财务部", position: "总账会计"},
  {employeeId: "GRT055", name: "沈迎风", department: "事业三部", position: "商务经理"},
  {employeeId: "GRT056", name: "陈成成", department: "事业三部", position: "焊工"},
  {employeeId: "GRT057", name: "蔡顺英", department: "事业三部", position: "采购与项目工程师"},
  {employeeId: "GRT058", name: "周辉", department: "事业三部", position: "前厅接待"},
  {employeeId: "GRT059", name: "焦琪", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT060", name: "杨金龙", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT061", name: "李明逵", department: "事业一部", position: "数控车工"},
  {employeeId: "GRT062", name: "朱宇浩", department: "AI数智部", position: "IT工程师"},
  {employeeId: "GRT063", name: "刘建康", department: "事业一部", position: "销售经理"},
  {employeeId: "GRT064", name: "刘兵兵", department: "事业一部", position: "激光切割"},
  {employeeId: "GRT065", name: "蔡琪", department: "事业二部", position: "机械研发工程师"},
  {employeeId: "GRT066", name: "李新正", department: "财务部", position: "仓库管理员"},
  {employeeId: "GRT067", name: "沙建梅", department: "人事行政部", position: "人事行政主管"},
  {employeeId: "GRT068", name: "李芬超", department: "事业十部", position: "CNC操作工"},
  {employeeId: "GRT069", name: "李鹏飞", department: "事业十部", position: "数控车工"},
  {employeeId: "GRT071", name: "刘琪杨", department: "事业三部", position: "电气装配"},
  {employeeId: "GRT072", name: "赵城杰", department: "事业三部", position: "电气装配"},
  {employeeId: "GRT073", name: "范威", department: "事业十部", position: "CNC操作工"},
  {employeeId: "GRT074", name: "王金海", department: "事业二部", position: "机械装配"},
  {employeeId: "GRT075", name: "胡绍杰", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT076", name: "王鑫", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT077", name: "吴阳洋", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT079", name: "阎建华", department: "事业一部", position: "机械装配"},
  {employeeId: "GRT080", name: "刘凯运", department: "AI数智部", position: "董事长助理"},
  {employeeId: "GRT082", name: "沈富富", department: "事业一部", position: "焊工"},
  {employeeId: "GRT083", name: "刘坤", department: "AI数智部", position: "销售与项目工程师"},
  {employeeId: "GRT084", name: "蒋秋瑛", department: "事业三部", position: "机械装配"},
  {employeeId: "GRT087", name: "梅奥杰", department: "事业一部", position: "助理电气工程师"},
  {employeeId: "GRT088", name: "蒋嘉义", department: "事业三部", position: "助理项目工程师"},
  {employeeId: "GRT089", name: "罗小玲", department: "事业三部", position: "助理机械研发工程师"},
  {employeeId: "GRT090", name: "张如羽", department: "事业一部", position: "助理机械研发工程师"},
  {employeeId: "GRT093", name: "李翔国", department: "事业一部", position: "销售与项目工程师"},
  {employeeId: "GRT094", name: "徐柯雯", department: "事业一部", position: "部门秘书"},
  {employeeId: "GRT095", name: "王蒙云", department: "人事行政部", position: "后勤助理"},
  {employeeId: "GRT096", name: "侯晓丽", department: "AI数智部", position: "部门研发工程师"},
  {employeeId: "GRT097", name: "钱绍辉", department: "事业二部", position: "电气工程师"},
  {employeeId: "GRT099", name: "殷金刚", department: "事业二部", position: "机械装配"},
  {employeeId: "GRT100", name: "田桃红", department: "人事行政部", position: "行政助理"},
  {employeeId: "GRT101", name: "王汝月", department: "财务部", position: "会计助理"},
  {employeeId: "GRT102", name: "张飞", department: "事业十部", position: "机加工班组"},
  {employeeId: "GRT103", name: "朱文栋", department: "AI数智部", position: "市场专员"},
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
