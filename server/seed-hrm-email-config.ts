/**
 * HRM述职提醒邮件配置种子脚本
 * 配置述职提醒的收件人列表（主管、主管的主管、HRBP、指定邮箱）
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedEmailConfig() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });

  console.log("🚀 开始配置HRM述职提醒邮件系统...\n");

  // 1. 创建默认邮件收件人配置
  console.log("📧 配置默认邮件收件人...");
  
  // 定义默认收件人列表
  const defaultRecipients = {
    // 固定收件人（始终接收）
    fixedRecipients: [
      "camillia@gerrytech.com",  // HR负责人
      "gerry@grtclean.ai"        // 公司负责人
    ],
    // 动态收件人（根据员工关系自动添加）
    dynamicRecipients: [
      "direct_manager",          // 直属主管
      "manager_of_manager",      // 主管的主管
      "hrbp"                     // 人事HRBP
    ],
    // 抄送人员
    ccRecipients: [
      "hr@gerrytech.com"         // HR部门邮箱
    ]
  };

  // 2. 更新现有的述职提醒记录，添加收件人配置
  console.log("📝 更新述职提醒收件人配置...");
  
  // 查询所有述职提醒
  const reminders = await db.select().from(schema.hrmPerformanceReviewReminders);
  
  for (const reminder of reminders) {
    // 更新收件人配置
    await db.update(schema.hrmPerformanceReviewReminders)
      .set({
        recipients: JSON.stringify(defaultRecipients),
        updatedAt: new Date().toISOString()
      })
      .where(eq(schema.hrmPerformanceReviewReminders.id, reminder.id));
  }
  
  console.log(`✅ 已更新 ${reminders.length} 条述职提醒的收件人配置\n`);

  // 3. 创建邮件模板配置（存储为JSON配置）
  console.log("📄 创建述职提醒邮件模板...");
  
  const emailTemplates = [
    {
      name: "试用期3个月述职提醒",
      subject: "【述职提醒】{{employee_name}} 试用期3个月述职报告 - {{review_date}}",
      body: `
尊敬的领导：

{{employee_name}} 将于 {{review_date}} 下午2:00 进行试用期3个月述职报告。

【员工信息】
- 姓名：{{employee_name}}
- 部门：{{department}}
- 岗位：{{position}}
- 入职日期：{{hire_date}}
- 直属主管：{{manager_name}}

【述职安排】
- 述职时间：{{review_date}} 14:00
- 述职地点：会议室（待定）
- 述职类型：试用期3个月述职

【需要准备】
1. 试用期工作总结
2. 岗位职责完成情况
3. KPI指标达成情况
4. 培训学习成果
5. 下阶段工作计划

请相关人员安排时间参加述职评审。

此邮件由GRT智能系统自动发送，如有疑问请联系HR部门。

GRT智能系统
{{send_date}}
      `.trim(),
      type: "review_3m"
    },
    {
      name: "试用期6个月述职提醒",
      subject: "【述职提醒】{{employee_name}} 试用期6个月述职报告（转正评审）- {{review_date}}",
      body: `
尊敬的领导：

{{employee_name}} 将于 {{review_date}} 下午2:00 进行试用期6个月述职报告（转正评审）。

【员工信息】
- 姓名：{{employee_name}}
- 部门：{{department}}
- 岗位：{{position}}
- 入职日期：{{hire_date}}
- 直属主管：{{manager_name}}
- 试用期：6个月

【述职安排】
- 述职时间：{{review_date}} 14:00
- 述职地点：会议室（待定）
- 述职类型：试用期6个月述职（转正评审）

【需要准备】
1. 试用期完整工作总结
2. 岗位职责完成情况汇报
3. KPI指标达成情况分析
4. 培训学习成果展示
5. 转正后工作计划
6. 个人发展规划

【评审内容】
- 工作能力评估
- 团队协作评估
- 文化价值观评估
- 转正建议

请相关人员安排时间参加转正评审会议。

此邮件由GRT智能系统自动发送，如有疑问请联系HR部门。

GRT智能系统
{{send_date}}
      `.trim(),
      type: "review_6m"
    },
    {
      name: "年度述职提醒",
      subject: "【述职提醒】{{employee_name}} {{year}}年度述职报告 - {{review_date}}",
      body: `
尊敬的领导：

{{employee_name}} 将于 {{review_date}} 进行{{year}}年度述职报告。

【员工信息】
- 姓名：{{employee_name}}
- 部门：{{department}}
- 岗位：{{position}}
- 入职日期：{{hire_date}}
- 直属主管：{{manager_name}}

【述职安排】
- 述职时间：{{review_date}}
- 述职地点：会议室（待定）
- 述职类型：年度述职

【需要准备】
1. 年度工作总结
2. KPI指标完成情况
3. 重点项目成果
4. 个人成长与提升
5. 下年度工作计划
6. 培训与发展需求

请相关人员安排时间参加年度述职评审。

此邮件由GRT智能系统自动发送，如有疑问请联系HR部门。

GRT智能系统
{{send_date}}
      `.trim(),
      type: "review_annual"
    }
  ];

  console.log(`✅ 已定义 ${emailTemplates.length} 个邮件模板\n`);

  // 4. 创建述职提醒发送配置
  console.log("⚙️ 配置述职提醒发送规则...");
  
  const reminderConfig = {
    // 提醒时间配置
    reminderTiming: {
      // 提前一周发送提醒
      advanceDays: 7,
      // 固定在周二下午2:00
      dayOfWeek: 2,  // 周二
      hour: 14,
      minute: 0
    },
    // 重复提醒配置
    repeatReminder: {
      enabled: true,
      // 提前3天再次提醒
      secondReminderDays: 3,
      // 当天上午提醒
      finalReminderHours: 4
    },
    // 通知方式
    notificationMethods: [
      "email",           // 邮件
      "system",          // 系统通知
      "webhook"          // Webhook（企业微信/钉钉）
    ],
    // 默认收件人
    defaultRecipients: defaultRecipients,
    // 邮件模板
    emailTemplates: emailTemplates
  };

  console.log("✅ 述职提醒发送规则配置完成\n");

  // 5. 汇总统计
  console.log("🎉 HRM述职提醒邮件系统配置完成！");
  console.log("📊 配置统计：");
  console.log(`   - 默认收件人：${defaultRecipients.fixedRecipients.length} 个固定 + ${defaultRecipients.dynamicRecipients.length} 个动态`);
  console.log(`   - 邮件模板：${emailTemplates.length} 个`);
  console.log(`   - 提醒规则：提前${reminderConfig.reminderTiming.advanceDays}天，周${reminderConfig.reminderTiming.dayOfWeek}下午${reminderConfig.reminderTiming.hour}:00`);
  console.log(`   - 通知方式：${reminderConfig.notificationMethods.join(", ")}`);
  console.log("\n📧 固定收件人列表：");
  defaultRecipients.fixedRecipients.forEach(email => console.log(`   - ${email}`));
  console.log("📧 动态收件人：");
  defaultRecipients.dynamicRecipients.forEach(role => console.log(`   - ${role}`));

  // 保存配置到JSON文件
  const fs = await import("fs/promises");
  const configPath = "/home/ubuntu/grt-implementation-plan/docs/config";
  await fs.mkdir(configPath, { recursive: true });
  await fs.writeFile(
    `${configPath}/hrm-reminder-config.json`,
    JSON.stringify(reminderConfig, null, 2)
  );
  console.log(`\n📁 配置已保存到: ${configPath}/hrm-reminder-config.json`);

  await pool.end();
}

seedEmailConfig().catch(console.error);
