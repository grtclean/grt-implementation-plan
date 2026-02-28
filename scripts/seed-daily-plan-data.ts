/**
 * Daily Plan Demo Data Seed Script
 *
 * 1. Creates `daily_plan_inbox` table (IF NOT EXISTS)
 * 2. Seeds supervisor assignments + customer assignments into inbox
 * 3. Ensures a today's daily plan exists with personal (manual) tasks
 * 4. Seeds a few annual milestones for the coming week (if empty)
 *
 * Usage:
 *   npx tsx scripts/seed-daily-plan-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

function today(): string {
  return new Date().toISOString().split("T")[0];
}
function plusDays(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split("T")[0];
}
function nowISO(): string {
  return new Date().toISOString();
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database.");

  try {
    await client.query("BEGIN");

    // =========================================================================
    // 1. Create daily_plan_inbox table
    // =========================================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_plan_inbox (
        id SERIAL PRIMARY KEY,
        target_user_id INTEGER NOT NULL,
        assigned_by_name VARCHAR(100),
        category VARCHAR(30) DEFAULT 'supervisor',
        title VARCHAR(300) NOT NULL,
        description TEXT,
        priority VARCHAR(10) DEFAULT 'P2',
        source_reference VARCHAR(200),
        due_date VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index if not exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS daily_plan_inbox_user_status_idx
        ON daily_plan_inbox (target_user_id, status);
    `);
    console.log("✓ daily_plan_inbox table ensured.");

    // =========================================================================
    // 2. Idempotency check
    // =========================================================================
    const existing = await client.query(
      "SELECT id FROM daily_plan_inbox WHERE title = $1 LIMIT 1",
      ["完成 Q1 销售目标分解报告"]
    );
    if (existing.rows.length > 0) {
      console.log("Daily plan demo data already seeded. Skipping.");
      await client.query("COMMIT");
      await client.end();
      return;
    }

    // =========================================================================
    // 3. Look up user IDs
    // =========================================================================
    const userRows = await client.query(
      "SELECT id, name FROM users ORDER BY id LIMIT 6"
    );
    const users = userRows.rows as { id: number; name: string }[];
    if (users.length === 0) {
      console.log("No users found in DB. Creating with userId=1.");
      users.push({ id: 1, name: "演示用户" });
    }
    const uid = (idx: number) => users[idx % users.length].id;
    const uname = (idx: number) => users[idx % users.length].name;
    console.log("Users:", users.map((u) => `${u.id}:${u.name}`).join(", "));

    const todayStr = today();
    const now = nowISO();

    // =========================================================================
    // 4. Seed daily_plan_inbox — supervisor tasks (6 rows)
    // =========================================================================
    const supervisorTasks = [
      {
        targetUserId: uid(0),
        assignedByName: "王总经理",
        category: "supervisor",
        title: "完成 Q1 销售目标分解报告",
        description: "将公司 Q1 销售目标按区域和产品线分解，提交给管理层评审",
        priority: "P1",
        sourceReference: "/strategy",
        dueDate: plusDays(1),
      },
      {
        targetUserId: uid(0),
        assignedByName: "李部长",
        category: "supervisor",
        title: "审核新供应商资质文件",
        description: "三家新供应商的 IATF 16949 认证文件审核，确认是否满足准入要求",
        priority: "P2",
        sourceReference: "/supply-chain",
        dueDate: plusDays(3),
      },
      {
        targetUserId: uid(1),
        assignedByName: "张总监",
        category: "supervisor",
        title: "准备周五项目评审 PPT",
        description: "汇总本周各项目进展，准备 M3 节点评审材料",
        priority: "P1",
        sourceReference: "/project-management",
        dueDate: plusDays(4),
      },
      {
        targetUserId: uid(1),
        assignedByName: "王总经理",
        category: "supervisor",
        title: "参加集团安全生产视频会议",
        description: "集团安全生产月度例会，需准备本 BU 安全隐患排查报告",
        priority: "P2",
        sourceReference: "/meeting-hub",
        dueDate: plusDays(2),
      },
      {
        targetUserId: uid(2),
        assignedByName: "赵主管",
        category: "supervisor",
        title: "完成 FMEA 更新",
        description: "根据上周客户投诉反馈，更新清洗机产品 FMEA 风险评估",
        priority: "P0",
        sourceReference: "/quality-workbench",
        dueDate: todayStr,
      },
      {
        targetUserId: uid(0),
        assignedByName: "陈经理",
        category: "supervisor",
        title: "协调售后团队处理紧急工单",
        description: "一汽客户现场设备故障报修，需协调工程师今日出发",
        priority: "P0",
        sourceReference: "/after-sales",
        dueDate: todayStr,
      },
    ];

    for (const t of supervisorTasks) {
      await client.query(
        `INSERT INTO daily_plan_inbox
         (target_user_id, assigned_by_name, category, title, description, priority, source_reference, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $9)`,
        [t.targetUserId, t.assignedByName, t.category, t.title, t.description, t.priority, t.sourceReference, t.dueDate, now]
      );
    }
    console.log("✓ Inserted 6 supervisor tasks into inbox.");

    // =========================================================================
    // 5. Seed daily_plan_inbox — customer assignments (4 rows)
    // =========================================================================
    const customerAssignments = [
      {
        targetUserId: uid(0),
        assignedByName: "张建国 (一汽集团)",
        category: "customer_assignment",
        title: "准备定制清洗方案技术说明书",
        description: "客户指定要求由您负责准备超声波清洗机的技术参数说明，用于内部评审",
        priority: "P1",
        sourceReference: "/sales-crm",
        dueDate: plusDays(2),
      },
      {
        targetUserId: uid(1),
        assignedByName: "Hans Weber (宝马沈阳)",
        category: "customer_assignment",
        title: "提供 VDA 6.3 整改计划",
        description: "宝马质量工程师要求由您提交上次审核不合格项的整改计划和时间表",
        priority: "P0",
        sourceReference: "/quality-workbench",
        dueDate: plusDays(1),
      },
      {
        targetUserId: uid(0),
        assignedByName: "刘德华 (博世苏州)",
        category: "customer_assignment",
        title: "确认下周现场调试时间",
        description: "博世采购总监要求确认下周三的设备现场调试安排，需协调安装团队",
        priority: "P2",
        sourceReference: "/project-management",
        dueDate: plusDays(5),
      },
      {
        targetUserId: uid(2),
        assignedByName: "林婷婷 (比亚迪)",
        category: "customer_assignment",
        title: "提供电池包清洗设备选型方案",
        description: "比亚迪新能源采购经理指名请您提供电池包清洗设备的选型方案和报价",
        priority: "P1",
        sourceReference: "/sales-crm",
        dueDate: plusDays(3),
      },
    ];

    for (const t of customerAssignments) {
      await client.query(
        `INSERT INTO daily_plan_inbox
         (target_user_id, assigned_by_name, category, title, description, priority, source_reference, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $9)`,
        [t.targetUserId, t.assignedByName, t.category, t.title, t.description, t.priority, t.sourceReference, t.dueDate, now]
      );
    }
    console.log("✓ Inserted 4 customer assignment tasks into inbox.");

    // =========================================================================
    // 6. Ensure today's daily plan with personal tasks for user 0
    // =========================================================================
    const userId0 = uid(0);
    const existingPlan = await client.query(
      `SELECT "planId" FROM planning_plans
       WHERE "ownerId" = $1 AND "planType" = 'daily' AND "planPeriod" = $2 AND status != 'cancelled'
       LIMIT 1`,
      [userId0, todayStr]
    );

    let planId: string;
    if (existingPlan.rows.length > 0) {
      planId = existingPlan.rows[0].planId;
      console.log("✓ Today's plan already exists for user", userId0, "planId:", planId);
    } else {
      planId = `PLAN-${Date.now()}-daily`;
      await client.query(
        `INSERT INTO planning_plans
         ("planId", "planType", "planPeriod", "ownerId", title, "aiSummary", status, "completionRate", "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, 'daily', $2, $3, $4, $5, 'approved', '0', $6::date, $7::date, $8, $8)`,
        [
          planId,
          todayStr,
          userId0,
          `每日工作计划 - ${todayStr}`,
          "AI生成的每日计划，包含个人任务和系统聚合项目",
          todayStr,
          todayStr,
          now,
        ]
      );
      console.log("✓ Created today's plan for user", userId0, "planId:", planId);
    }

    // Insert personal (manual) tasks
    const personalTasks = [
      {
        taskId: `TASK-${Date.now()}-p1`,
        title: "整理本周工作周报",
        description: "汇总本周完成的主要工作项，准备提交给部门主管",
        priority: "P2",
        estimatedHours: "1",
      },
      {
        taskId: `TASK-${Date.now()}-p2`,
        title: "学习 IATF 16949:2016 最新修订要点",
        description: "在线培训课程第3章，完成课后测验",
        priority: "P3",
        estimatedHours: "1.5",
      },
      {
        taskId: `TASK-${Date.now()}-p3`,
        title: "更新个人 OKR 进度",
        description: "登录系统更新 Q1 OKR 的 Key Results 完成百分比",
        priority: "P2",
        estimatedHours: "0.5",
      },
      {
        taskId: `TASK-${Date.now()}-p4`,
        title: "预约下周出差机票和酒店",
        description: "下周三至周五出差博世苏州工厂，需预订机票和住宿",
        priority: "P3",
        estimatedHours: "0.5",
      },
    ];

    // Check existing personal tasks to avoid duplicates
    const existingTasks = await client.query(
      `SELECT COUNT(*) as cnt FROM planning_tasks
       WHERE "planId" = $1 AND "sourceType" = 'manual'`,
      [planId]
    );
    if (parseInt(existingTasks.rows[0].cnt) === 0) {
      for (const t of personalTasks) {
        await client.query(
          `INSERT INTO planning_tasks
           ("taskId", "planId", title, description, priority, "taskType", "sourceType", "ownerId", "estimatedHours", status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'work', 'manual', $6, $7, 'pending', $8, $8)`,
          [t.taskId, planId, t.title, t.description, t.priority, userId0, t.estimatedHours, now]
        );
      }
      console.log("✓ Inserted 4 personal tasks into today's plan.");
    } else {
      console.log("✓ Personal tasks already exist in today's plan. Skipping.");
    }

    // =========================================================================
    // 7. Seed yesterday's incomplete tasks (carryover source)
    // =========================================================================
    const yesterdayStr = plusDays(-1);
    const existingYesterday = await client.query(
      `SELECT "planId" FROM planning_plans
       WHERE "ownerId" = $1 AND "planType" = 'daily' AND "planPeriod" = $2 AND status != 'cancelled'
       LIMIT 1`,
      [userId0, yesterdayStr]
    );

    if (existingYesterday.rows.length === 0) {
      const yPlanId = `PLAN-${Date.now()}-yesterday`;
      await client.query(
        `INSERT INTO planning_plans
         ("planId", "planType", "planPeriod", "ownerId", title, "aiSummary", status, "completionRate", "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, 'daily', $2, $3, $4, '', 'in_progress', '40', $5::date, $6::date, $7, $7)`,
        [yPlanId, yesterdayStr, userId0, `每日工作计划 - ${yesterdayStr}`, yesterdayStr, yesterdayStr, now]
      );

      const carryoverTasks = [
        {
          taskId: `TASK-${Date.now()}-y1`,
          title: "完成供应商审核报告初稿",
          description: "昨日未完成，需今日优先处理",
          priority: "P1",
          sourceType: "opl",
          status: "in_progress",
        },
        {
          taskId: `TASK-${Date.now()}-y2`,
          title: "回复客户技术澄清邮件",
          description: "一汽集团关于清洗机参数的技术澄清，昨日因开会未回复",
          priority: "P1",
          sourceType: "customer_feedback",
          status: "pending",
        },
        {
          taskId: `TASK-${Date.now()}-y3`,
          title: "提交费用报销单",
          description: "上周出差费用报销",
          priority: "P3",
          sourceType: "manual",
          status: "pending",
        },
      ];

      for (const t of carryoverTasks) {
        await client.query(
          `INSERT INTO planning_tasks
           ("taskId", "planId", title, description, priority, "taskType", "sourceType", "ownerId", "estimatedHours", status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'work', $6, $7, '1', $8, $9, $9)`,
          [t.taskId, yPlanId, t.title, t.description, t.priority, t.sourceType, userId0, t.status, now]
        );
      }
      console.log("✓ Created yesterday's plan with 3 incomplete tasks (carryover).");
    } else {
      console.log("✓ Yesterday's plan already exists. Skipping carryover seeding.");
    }

    // =========================================================================
    // 8. Seed annual milestones for coming week (if table is empty/near-empty)
    // =========================================================================
    // Wrap milestones in savepoint since table/enum might differ
    let milestoneCount = { rows: [{ cnt: "0" }] };
    try {
      await client.query("SAVEPOINT ms_check_sp");
      milestoneCount = await client.query(
        `SELECT COUNT(*) as cnt FROM annual_milestones
         WHERE scheduled_date BETWEEN CAST($1 AS date) AND CAST($2 AS date)`,
        [todayStr, plusDays(7)]
      );
      await client.query("RELEASE SAVEPOINT ms_check_sp");
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT ms_check_sp");
    }

    if (parseInt((milestoneCount.rows[0] as any).cnt) === 0) {
      // Need an agenda_id — find or create one
      let agendaId = 1;
      try {
        await client.query("SAVEPOINT agenda_sp");
        const agendaRow = await client.query("SELECT id FROM annual_agendas LIMIT 1");
        if (agendaRow.rows.length > 0) {
          agendaId = agendaRow.rows[0].id;
        } else {
          const configRow = await client.query("SELECT id FROM annual_planning_configs LIMIT 1");
          if (configRow.rows.length > 0) {
            agendaId = configRow.rows[0].id;
          }
        }
        await client.query("RELEASE SAVEPOINT agenda_sp");
      } catch {
        await client.query("ROLLBACK TO SAVEPOINT agenda_sp");
      }

      // milestoneTypeEnum valid values: Q4_Strategy, Q1_Kickoff, Monthly_Review, Weekly_Check, Custom
      const milestones = [
        {
          agendaId,
          milestoneType: "Monthly_Review",
          title: "Q1 经营分析会议",
          description: "全公司 Q1 经营指标回顾和 Q2 计划确认",
          scheduledDate: plusDays(3),
          scheduledTime: "09:00",
        },
        {
          agendaId,
          milestoneType: "Custom",
          title: "全员安全生产培训",
          description: "年度安全生产培训，全员必须参加",
          scheduledDate: plusDays(5),
          scheduledTime: "14:00",
        },
        {
          agendaId,
          milestoneType: "Monthly_Review",
          title: "部门月度 KPI 评审",
          description: "各部门上月 KPI 达成情况评审",
          scheduledDate: plusDays(6),
          scheduledTime: "10:00",
        },
      ];

      for (const m of milestones) {
        try {
          await client.query("SAVEPOINT milestone_sp");
          await client.query(
            `INSERT INTO annual_milestones
             (agenda_id, "milestoneType", title, description, scheduled_date, scheduled_time, is_recurring, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5::date, $6, 0, 'pending', NOW(), NOW())`,
            [m.agendaId, m.milestoneType, m.title, m.description, m.scheduledDate, m.scheduledTime]
          );
          await client.query("RELEASE SAVEPOINT milestone_sp");
        } catch (e: any) {
          await client.query("ROLLBACK TO SAVEPOINT milestone_sp");
          console.log("  ⚠ Skipped milestone:", m.title, e.message?.slice(0, 80));
        }
      }
      console.log("✓ Seeded annual milestones for coming week.");
    } else {
      console.log("✓ Annual milestones already exist for this week. Skipping.");
    }

    // =========================================================================
    // 9. Seed meeting action items for user 0 (if none pending)
    // =========================================================================
    let pendingActions = { rows: [{ cnt: "0" }] };
    try {
      await client.query("SAVEPOINT pa_check_sp");
      pendingActions = await client.query(
        `SELECT COUNT(*) as cnt FROM meeting_action_items
         WHERE assigned_to = $1 AND status = 'PENDING'`,
        [userId0]
      );
      await client.query("RELEASE SAVEPOINT pa_check_sp");
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT pa_check_sp");
    }

    if (parseInt((pendingActions.rows[0] as any).cnt) === 0) {
      try {
        await client.query("SAVEPOINT action_items_sp");
        // Find a meeting ID or use 1
        const meetRow = await client.query("SELECT id FROM sys_meetings ORDER BY id DESC LIMIT 1");
        const meetingId = meetRow.rows[0]?.id ?? 1;

        const actionItems = [
          {
            meetingId,
            assignedTo: userId0,
            assignedToName: uname(0),
            taskDesc: "整理上周质量改进行动项完成情况，发给质量部",
            dueDate: plusDays(1),
          },
          {
            meetingId,
            assignedTo: userId0,
            assignedToName: uname(0),
            taskDesc: "联系供应商确认原材料交期，更新采购看板",
            dueDate: plusDays(2),
          },
        ];

        for (const a of actionItems) {
          await client.query(
            `INSERT INTO meeting_action_items
             (meeting_id, assigned_to, assigned_to_name, task_desc, status, due_date, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'PENDING', $5::timestamp, NOW(), NOW())`,
            [a.meetingId, a.assignedTo, a.assignedToName, a.taskDesc, a.dueDate]
          );
        }
        await client.query("RELEASE SAVEPOINT action_items_sp");
        console.log("✓ Inserted 2 pending meeting action items.");
      } catch (e: any) {
        await client.query("ROLLBACK TO SAVEPOINT action_items_sp");
        console.log("  ⚠ Skipped meeting action items:", e.message?.slice(0, 80));
      }
    } else {
      console.log("✓ Pending meeting action items already exist. Skipping.");
    }

    await client.query("COMMIT");
    console.log("\nTransaction committed.");

    // =========================================================================
    // Verification (each query safe — outside transaction)
    // =========================================================================
    console.log("\n========== Verification ==========");

    try {
      const inboxStats = await client.query(
        "SELECT category, status, COUNT(*) as cnt FROM daily_plan_inbox GROUP BY category, status ORDER BY category"
      );
      console.log("\nInbox by category/status:");
      for (const r of inboxStats.rows as any[]) {
        console.log(`  ${r.category} [${r.status}]: ${r.cnt}`);
      }
    } catch { console.log("  (inbox query skipped)"); }

    try {
      const planStats = await client.query(
        `SELECT "planPeriod", status, "completionRate",
                (SELECT COUNT(*) FROM planning_tasks WHERE "planId" = pp."planId") as tasks
         FROM planning_plans pp
         WHERE "ownerId" = $1 AND "planType" = 'daily'
         ORDER BY "planPeriod" DESC
         LIMIT 5`,
        [userId0]
      );
      console.log("\nDaily plans for user", userId0, ":");
      for (const r of planStats.rows as any[]) {
        console.log(`  ${r.planPeriod} — ${r.status} — ${r.completionRate}% — ${r.tasks} tasks`);
      }
    } catch { console.log("  (plans query skipped)"); }

    try {
      const milestoneStats = await client.query(
        `SELECT title, scheduled_date, status FROM annual_milestones
         WHERE scheduled_date >= CAST($1 AS date)
         ORDER BY scheduled_date LIMIT 5`,
        [todayStr]
      );
      console.log("\nUpcoming milestones:");
      for (const r of milestoneStats.rows as any[]) {
        console.log(`  ${r.scheduled_date} — ${r.title} [${r.status}]`);
      }
    } catch { console.log("  (milestones query skipped)"); }

    try {
      const actionStats = await client.query(
        `SELECT task_desc, status, due_date FROM meeting_action_items
         WHERE assigned_to = $1
         ORDER BY due_date LIMIT 5`,
        [userId0]
      );
      console.log("\nMeeting action items for user", userId0, ":");
      for (const r of actionStats.rows as any[]) {
        console.log(`  [${r.status}] ${r.task_desc?.slice(0, 40)}... (due: ${r.due_date})`);
      }
    } catch { console.log("  (action items query skipped)"); }

    console.log("\n========== Daily Plan Seed Complete ==========");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back due to error:", err);
    throw err;
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
