/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT SYSTEM — 组织上下级关系种入                                ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                ║
 * ║  为全部 96 名员工设置 supervisor_id (直接主管)                    ║
 * ║  组织结构: CEO → VP/Director → Manager → Supervisor → Staff     ║
 * ║                                                                ║
 * ║  幂等: 多次运行安全 (UPDATE ... SET supervisor_id)              ║
 * ║  Run: npx tsx server/seed/seed-org-hierarchy.ts                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// ── 上下级关系定义 ──
// 格式: [员工工号, 直接主管工号]
// CEO (GRT001) 没有上级 → null

const HIERARCHY: [string, string | null][] = [
  // ═══ 总裁办 ═══
  ["GRT001", null],                     // 倪亚东 — CEO (无上级)

  // ═══ AI数智部 — 汇报给 CEO ═══
  ["GRT080", "GRT001"],                 // 刘奥运 (VP 董事长助理) → CEO
  ["GRT105", "GRT001"],                 // 倪微薇 (VP AI数智&人事行政) → CEO
  ["GRT049", "GRT105"],                 // 胡杨 (IT工程师) → 倪微薇
  ["GRT083", "GRT105"],                 // 刘坤 (市场主管) → 倪微薇
  ["GRT103", "GRT083"],                 // 朱文韬 (市场专员) → 刘坤
  ["GRT062", "GRT080"],                 // 朱宇浩 (生产工程师兼IT) → 刘奥运

  // ═══ 财务部 — 汇报给 CEO ═══
  ["GRT054", "GRT001"],                 // 王秀萍 (财务经理) → CEO
  ["GRT002", "GRT054"],                 // 黄晓兰 (出纳) → 王秀萍
  ["GRT101", "GRT054"],                 // 王汝月 (财务专员) → 王秀萍
  ["GRT066", "GRT054"],                 // 李新正 (仓库管理员) → 王秀萍
  ["GRT079_2", "GRT054"],              // 马鹏风 (供应链工程师) → 王秀萍
  ["GRT081", "GRT054"],                 // 马康风 (供应链助理) → 王秀萍

  // ═══ 人事行政部 — 汇报给 倪微薇 ═══
  ["GRT067", "GRT105"],                 // 沙建梅 (人事行政主管) → 倪微薇
  ["GRT053", "GRT067"],                 // 段天珠 (前法) → 沙建梅
  ["GRT100", "GRT067"],                 // 田炜钰 (行政前台) → 沙建梅
  ["GRT095", "GRT067"],                 // 王爱云 (后勤助理) → 沙建梅

  // ═══ 事业一部 (BU1 海外) — 部门经理: 戴晓燕 → CEO ═══
  ["GRT004", "GRT001"],                 // 戴晓燕 (高级销售经理/BU1负责人) → CEO
  ["GRT005", "GRT004"],                 // 金晓锋 (制造质量经理) → 戴晓燕
  // 销售组 → 戴晓燕
  ["GRT063", "GRT004"],                 // 刘健康 (销售与项目工程师) → 戴晓燕
  ["GRT035", "GRT004"],                 // 王志强 (销售与项目工程师) → 戴晓燕
  ["GRT104", "GRT004"],                 // 董纾雨 (销售与项目工程师) → 戴晓燕
  // 采购组 → 戴晓燕
  ["GRT020", "GRT004"],                 // 张洵 (采购与项目工程师) → 戴晓燕
  ["GRT057", "GRT004"],                 // 滕顺英 (采购与项目工程师) → 戴晓燕
  // 设计组 → 金晓锋 (制造质量经理兼管设计)
  ["GRT022", "GRT005"],                 // 李大鹏 (电气工程师) → 金晓锋
  ["GRT090", "GRT005"],                 // 陈加丽 (助理机械研发) → 金晓锋
  // 售后组 → 匡凯旋 (售后服务主管) → 戴晓燕
  ["GRT030", "GRT004"],                 // 匡凯旋 (售后服务主管) → 戴晓燕
  ["GRT014", "GRT030"],                 // 廉龙海 (售后技工) → 匡凯旋
  ["GRT028", "GRT030"],                 // 朱明华 (售后技工) → 匡凯旋
  ["GRT040", "GRT030"],                 // 曾春贵 (售后技工) → 匡凯旋
  // 电气装配组 → 吕雪冬 (电气班长) → 金晓锋
  ["GRT046", "GRT005"],                 // 吕雪冬 (电气班组班长) → 金晓锋
  ["GRT015", "GRT046"],                 // 杜显文 (电气班组副班长) → 吕雪冬
  ["GRT087", "GRT046"],                 // 梅奥杰 (助理电气) → 吕雪冬
  ["GRT088", "GRT046"],                 // 高嘉义 (助理电气) → 吕雪冬
  ["GRT031", "GRT046"],                 // 沈龙翔 (电气装配) → 吕雪冬
  ["GRT036", "GRT046"],                 // 韩品来 (电气装配) → 吕雪冬
  ["GRT051", "GRT046"],                 // 崔聪聪 (电气装配) → 吕雪冬
  ["GRT071", "GRT046"],                 // 刘琛杨 (电气装配) → 吕雪冬
  ["GRT072", "GRT046"],                 // 赵铖杰 (电气装配) → 吕雪冬
  // 机械装配组 → 金晓锋 (暂无专职机械班长)
  ["GRT010", "GRT005"],                 // 吴卫成 (机械装配) → 金晓锋
  ["GRT016", "GRT005"],                 // 曹庆伟 (机械装配) → 金晓锋
  ["GRT039", "GRT005"],                 // 侯德朋 (机械装配) → 金晓锋
  ["GRT041", "GRT005"],                 // 张良 (机械装配) → 金晓锋
  ["GRT052", "GRT005"],                 // 赵强 (机械装配) → 金晓锋
  ["GRT059", "GRT005"],                 // 焦斌 (机械装配) → 金晓锋
  ["GRT079", "GRT005"],                 // 阎建华 (机械装配) → 金晓锋
  // 其他 BU1 人员
  ["GRT017", "GRT005"],                 // 田坪珍 (焊工) → 金晓锋
  ["GRT082", "GRT005"],                 // 沈富高 (焊工) → 金晓锋
  ["GRT064", "GRT005"],                 // 强兵兵 (激光切割) → 金晓锋
  ["GRT061", "GRT005"],                 // 李明遂 (数控车工) → 金晓锋
  ["GRT047", "GRT005"],                 // 嵇国华 (协作辅助) → 金晓锋

  // ═══ 事业二部 (BU2 商用车) — 部门经理: 徐树奎 → CEO ═══
  ["GRT094", "GRT001"],                 // 徐树奎 (事业二部经理) → CEO
  ["GRT006", "GRT094"],                 // 洪香龙 (机械设计经理) → 徐树奎
  ["GRT044", "GRT006"],                 // 洪小东 (机械研发) → 洪香龙
  ["GRT097", "GRT006"],                 // 钱佳奇 (电气工程师) → 洪香龙
  ["GRT065", "GRT006"],                 // 蔡瑞 (机械研发) → 洪香龙
  ["GRT099", "GRT006"],                 // 殷金刚 (机械研发) → 洪香龙
  ["GRT038", "GRT094"],                 // 马林山 (装配班组长) → 徐树奎
  ["GRT074", "GRT038"],                 // 王金涛 (机械装配) → 马林山

  // ═══ 事业三部 (BU3 乘用车) — 部门经理: 周辉 → CEO ═══
  ["GRT058", "GRT001"],                 // 周辉 (事业三部经理) → CEO
  ["GRT007", "GRT058"],                 // 孙坚 (电气主管) → 周辉
  ["GRT055", "GRT058"],                 // 沈迎凤 (采购经理) → 周辉
  ["GRT045", "GRT058"],                 // 杨勇 (生产工程师兼项目经理) → 周辉
  // 销售组 → 周辉
  ["GRT019", "GRT058"],                 // 冯艳 (销售与项目工程师) → 周辉
  ["GRT043", "GRT058"],                 // 韩保程 (销售与项目工程师) → 周辉
  ["GRT093", "GRT058"],                 // 李柯瑶 (销售与项目工程师) → 周辉
  // 采购/设计 → 沈迎凤
  ["GRT003", "GRT055"],                 // 倪亚琴 (采购与项目工程师) → 沈迎凤
  ["GRT089", "GRT055"],                 // 罗小玲 (助理机械研发) → 沈迎凤
  ["GRT112", "GRT055"],                 // 谢伟 (机械工程师) → 沈迎凤
  // 电气装配 → 孙坚
  ["GRT023", "GRT007"],                 // 杨之雲 (电气装配) → 孙坚
  ["GRT029", "GRT007"],                 // 殷小勇 (电气装配) → 孙坚
  // 机械装配 → 杨勇 (生产工程师兼项目经理)
  ["GRT013", "GRT045"],                 // 孙淼 (机械装配) → 杨勇
  ["GRT021", "GRT045"],                 // 张松松 (机械装配) → 杨勇
  ["GRT025", "GRT045"],                 // 肖博雅 (机械装配) → 杨勇
  ["GRT032", "GRT045"],                 // 王犇 (机械装配) → 杨勇
  ["GRT034", "GRT045"],                 // 王勇 (机械装配) → 杨勇
  ["GRT042", "GRT045"],                 // 刘建年 (机械装配) → 杨勇
  ["GRT050", "GRT045"],                 // 蕾翠林 (机械装配) → 杨勇
  ["GRT060", "GRT045"],                 // 杨会龙 (机械装配) → 杨勇
  ["GRT075", "GRT045"],                 // 胡绍杰 (机械装配) → 杨勇
  ["GRT076", "GRT045"],                 // 王森 (机械装配) → 杨勇
  ["GRT077", "GRT045"],                 // 吴阳洋 (机械装配) → 杨勇
  ["GRT084", "GRT045"],                 // 蒋秋瑞 (机械装配) → 杨勇
  // 其他
  ["GRT056", "GRT007"],                 // 陈成成 (焊工) → 孙坚
  ["GRT037", "GRT058"],                 // 黄潇潇 (文员) → 周辉

  // ═══ 事业四部 (BU4 半导体) — 暂无部门经理, 汇报给 CEO ═══
  ["GRT018", "GRT001"],                 // 孙国祥 (电气工程师) → CEO
  ["GRT024", "GRT018"],                 // 张腾飞 (机加工班组长) → 孙国祥

  // ═══ 事业十部 (BU5 工业通用) — 暂无部门经理, 汇报给 CEO ═══
  ["GRT008", "GRT001"],                 // 马柯 (质量专员) → CEO
  ["GRT009", "GRT008"],                 // 史龙昌 (激光切作班组长) → 马柯
  ["GRT011", "GRT009"],                 // 张超 (激光) → 史龙昌
  ["GRT012", "GRT009"],                 // 李兴伟 (冷作) → 史龙昌
  ["GRT068", "GRT008"],                 // 李亚超 (CNC) → 马柯
  ["GRT069", "GRT008"],                 // 李鹏飞 (数控车工) → 马柯
  ["GRT073", "GRT008"],                 // 范威 (CNC) → 马柯
  ["GRT102", "GRT008"],                 // 张飞 (机加工铣工) → 马柯
];

// ── Seed Execution ──

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[Seed] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   GRT 组织上下级关系种入 — Phase 1.1                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // 确保 grt_employees 表存在
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS grt_employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(200),
        department VARCHAR(100),
        "roleType" VARCHAR(20) DEFAULT 'office',
        jurisdiction VARCHAR(10) DEFAULT 'CN',
        supervisor_id INTEGER,
        "contractType" VARCHAR(20) DEFAULT 'full_time',
        weekly_hours_limit INTEGER DEFAULT 40,
        is_exempt SMALLINT DEFAULT 0,
        "exemptionType" VARCHAR(20) DEFAULT 'none',
        hire_date DATE,
        timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
        is_active SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Step 1: 确保所有员工在 grt_employees 表中存在
    console.log("[1/3] 确保员工记录存在...");
    let ensured = 0;
    for (const [empId] of HIERARCHY) {
      const exists: any = await db.execute(
        sql`SELECT id FROM grt_employees WHERE employee_id = ${empId} LIMIT 1`
      );
      const rows = exists?.rows ?? exists ?? [];
      if (rows.length === 0) {
        // 从 users 表获取信息
        const userInfo: any = await db.execute(
          sql`SELECT name, email FROM users WHERE "openId" = ${empId} LIMIT 1`
        );
        const userRows = userInfo?.rows ?? userInfo ?? [];
        const name = userRows[0]?.name || empId;
        const email = userRows[0]?.email || null;

        // 从 HIERARCHY 推断部门 (通过 seed-real-users 的 EMPLOYEES 数组)
        await db.execute(sql`
          INSERT INTO grt_employees (employee_id, name, email, is_active)
          VALUES (${empId}, ${name}, ${email}, 1)
        `);
        ensured++;
      }
    }
    console.log(`  => ${ensured} 名员工新增到 grt_employees\n`);

    // Step 2: 建立 employee_id → grt_employees.id 映射
    console.log("[2/3] 建立工号映射...");
    const allEmps: any = await db.execute(
      sql`SELECT id, employee_id FROM grt_employees WHERE is_active = 1`
    );
    const empRows = allEmps?.rows ?? allEmps ?? [];
    const idMap = new Map<string, number>();
    for (const row of empRows) {
      idMap.set(row.employee_id, row.id);
    }
    console.log(`  => ${idMap.size} 名活跃员工映射完成\n`);

    // Step 3: 更新 supervisor_id
    console.log("[3/3] 写入上下级关系...");
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [empId, supervisorEmpId] of HIERARCHY) {
      const empDbId = idMap.get(empId);
      if (!empDbId) {
        errors.push(`${empId}: 员工不在 grt_employees 表中`);
        continue;
      }

      if (supervisorEmpId === null) {
        // CEO — 无上级
        await db.execute(
          sql`UPDATE grt_employees SET supervisor_id = NULL, updated_at = NOW() WHERE id = ${empDbId}`
        );
        updated++;
        continue;
      }

      const supervisorDbId = idMap.get(supervisorEmpId);
      if (!supervisorDbId) {
        errors.push(`${empId} → ${supervisorEmpId}: 主管工号不在 grt_employees 中`);
        continue;
      }

      await db.execute(
        sql`UPDATE grt_employees SET supervisor_id = ${supervisorDbId}, updated_at = NOW() WHERE id = ${empDbId}`
      );
      updated++;
    }

    console.log(`  => ${updated} 条上下级关系已写入`);
    if (skipped > 0) console.log(`  => ${skipped} 条跳过`);
    if (errors.length > 0) {
      console.log(`  => ${errors.length} 条错误:`);
      for (const err of errors) console.log(`     [!] ${err}`);
    }

    // Step 4: 验证 — 打印组织树
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                   组织架构验证                              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    const tree: any = await db.execute(sql`
      SELECT e.employee_id, e.name, e.department,
             s.employee_id AS supervisor_emp_id, s.name AS supervisor_name
      FROM grt_employees e
      LEFT JOIN grt_employees s ON e.supervisor_id = s.id
      WHERE e.is_active = 1
      ORDER BY e.supervisor_id NULLS FIRST, e.department, e.name
    `);
    const treeRows = tree?.rows ?? tree ?? [];

    // 打印 CEO 及直接下属
    const ceo = treeRows.find((r: any) => !r.supervisor_emp_id);
    if (ceo) {
      console.log(`  ${ceo.name} (${ceo.employee_id}) — CEO`);
      const directReports = treeRows.filter((r: any) => r.supervisor_emp_id === ceo.employee_id);
      for (const dr of directReports) {
        console.log(`  ├─ ${dr.name} (${dr.employee_id}) — ${dr.department || ''}`);
        const subReports = treeRows.filter((r: any) => r.supervisor_emp_id === dr.employee_id);
        for (const sr of subReports) {
          const subSub = treeRows.filter((r: any) => r.supervisor_emp_id === sr.employee_id);
          console.log(`  │  ├─ ${sr.name} (${sr.employee_id}) [${subSub.length} 下属]`);
        }
      }
    }

    // 统计
    const withSupervisor = treeRows.filter((r: any) => r.supervisor_emp_id).length;
    const withoutSupervisor = treeRows.filter((r: any) => !r.supervisor_emp_id).length;
    console.log(`\n  有上级: ${withSupervisor}, 无上级(CEO): ${withoutSupervisor}, 总计: ${treeRows.length}`);

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

export { HIERARCHY };

const isDirectRun = process.argv[1]?.includes("seed-org-hierarchy");
if (isDirectRun) {
  seed();
}
