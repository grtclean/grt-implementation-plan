/**
 * CEO视角：全员年度目标协定 + KPI维度批量生成
 * 111名员工 × 4-6个KPI维度 = ~500+个维度目标
 * 按岗位族+事业部运营目标自动分配
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try { fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").split("\n").forEach(l => { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !vars[m[1]]) vars[m[1]] = m[2].trim(); }); } catch {}
  }
  return vars;
}

// ═══ 岗位族KPI模板 ═══
const KPI_TEMPLATES = {
  // 销售族
  sales: {
    dims: [
      { code: "REVENUE", name: "个人/团队营收", weight: 30, target: "完成事业部分配营收目标" },
      { code: "NEW_CLIENT", name: "新客户开发", weight: 20, target: "新客户数量与质量" },
      { code: "CLIENT_MGMT", name: "客户管理与满意度", weight: 15, target: "客户续单率≥85%+NPS≥8" },
      { code: "TEAM_BUILD", name: "团队/协作能力", weight: 15, target: "团队成员TSDCKL提升" },
      { code: "MARKET", name: "市场洞察与品牌", weight: 10, target: "行业分析+展会+方案输出" },
      { code: "DIGITAL", name: "数字化执行", weight: 10, target: "GRT System使用率>90%" },
    ],
    bonusCap: 6, levels: { A: 6, B: 4, C: 2, D: 0 },
  },
  // 机械/电气工程师
  engineer: {
    dims: [
      { code: "DELIVERY", name: "项目交付质量", weight: 30, target: "设计文件准时率≥95%+一次通过率≥90%" },
      { code: "INNOVATION", name: "技术创新", weight: 20, target: "工艺改进≥2项/专利/标准化贡献" },
      { code: "QUALITY", name: "设计质量", weight: 20, target: "BOM准确率≥98%+ECN≤2次/项目" },
      { code: "CAPABILITY", name: "能力提升(TSDCKL)", weight: 15, target: "至少2个维度提升1级" },
      { code: "COLLAB", name: "跨部门协作", weight: 10, target: "项目协同评价≥良好" },
      { code: "DIGITAL", name: "数字化工具", weight: 5, target: "PDM/GRT System使用规范" },
    ],
    bonusCap: 4, levels: { A: 4, B: 3, C: 1, D: 0 },
  },
  // 项目经理
  pm: {
    dims: [
      { code: "ONTIME", name: "项目按时交付", weight: 30, target: "M0-M12各阶段准时率≥92%" },
      { code: "COST", name: "成本控制", weight: 20, target: "实际成本≤预算105%" },
      { code: "QUALITY", name: "交付质量(FAT)", weight: 20, target: "FAT一次通过率≥95%" },
      { code: "CLIENT_SAT", name: "客户满意度", weight: 15, target: "SAT验收评分≥90" },
      { code: "TEAM_LEAD", name: "团队管理", weight: 10, target: "团队效能提升+知识沉淀" },
      { code: "DIGITAL", name: "项目数字化", weight: 5, target: "GRT System项目管理100%在线" },
    ],
    bonusCap: 5, levels: { A: 5, B: 3, C: 1, D: 0 },
  },
  // 财务
  finance: {
    dims: [
      { code: "ACCURACY", name: "财务准确性", weight: 30, target: "凭证差错率<0.1%+报表及时" },
      { code: "TIMELINESS", name: "处理时效", weight: 25, target: "报销3日+月结5日内+对账无差异" },
      { code: "COMPLIANCE", name: "合规与审计", weight: 20, target: "审计问题0项+税务合规100%" },
      { code: "COST_OPT", name: "成本优化建议", weight: 10, target: "提出≥3项成本优化建议" },
      { code: "CAPABILITY", name: "专业能力提升", weight: 10, target: "TSDCKL财务维度提升" },
      { code: "DIGITAL", name: "系统使用", weight: 5, target: "金蝶+GRT System熟练使用" },
    ],
    bonusCap: 3, levels: { A: 3, B: 2, C: 1, D: 0 },
  },
  // 生产/产线
  production: {
    dims: [
      { code: "OUTPUT", name: "产出效率", weight: 30, target: "工时利用率≥90%+OEE达标" },
      { code: "QUALITY", name: "工序质量", weight: 25, target: "合格率≥98%+返工率<2%" },
      { code: "SAFETY", name: "安全与5S", weight: 20, target: "安全事故0+5S评分≥85" },
      { code: "SKILL", name: "技能提升", weight: 15, target: "技能等级提升1级(预设中级)" },
      { code: "COMPLIANCE", name: "纪律与出勤", weight: 10, target: "出勤率≥98%+计划提交率≥80%" },
    ],
    bonusCap: 2, levels: { A: 2, B: 1.5, C: 1, D: 0 },
  },
  // 质量
  quality: {
    dims: [
      { code: "DPPM", name: "质量指标(DPPM)", weight: 30, target: "DPPM≤500+客诉24h响应" },
      { code: "AUDIT", name: "体系审核", weight: 20, target: "内审不符合项≤3+IATF维持" },
      { code: "IMPROVEMENT", name: "持续改进", weight: 20, target: "8D关闭率≥95%+CAPA有效率" },
      { code: "PREVENTION", name: "预防措施", weight: 15, target: "FMEA更新+SPC监控覆盖率" },
      { code: "CAPABILITY", name: "能力与培训", weight: 10, target: "质量工具培训≥4次/年" },
      { code: "DIGITAL", name: "质量数字化", weight: 5, target: "GRT质量模块使用率>90%" },
    ],
    bonusCap: 3, levels: { A: 3, B: 2, C: 1, D: 0 },
  },
  // 售后
  service: {
    dims: [
      { code: "RESPONSE", name: "响应时效(SLA)", weight: 25, target: "4h响应+24h方案+SLA达标≥95%" },
      { code: "RESOLVE", name: "问题解决率", weight: 25, target: "首次解决率≥80%+远程解决≥50%" },
      { code: "SATISFACTION", name: "客户满意度", weight: 20, target: "NPS≥8+满意度≥90%" },
      { code: "KNOWLEDGE", name: "知识沉淀", weight: 15, target: "工单→知识库转化≥10条/月" },
      { code: "CAPABILITY", name: "技能提升", weight: 10, target: "TSDCKL服务维度提升1级" },
      { code: "DIGITAL", name: "系统使用", weight: 5, target: "售后工程师工作台100%使用" },
    ],
    bonusCap: 3, levels: { A: 3, B: 2, C: 1, D: 0 },
  },
  // HR/行政
  hr_admin: {
    dims: [
      { code: "RECRUIT", name: "招聘完成率", weight: 25, target: "岗位需求30日内完成≥80%" },
      { code: "TRAINING", name: "培训执行", weight: 20, target: "培训计划执行率≥90%" },
      { code: "PERF_MGMT", name: "绩效管理", weight: 20, target: "评估及时率100%+校准完成" },
      { code: "EMPLOYEE_SAT", name: "员工满意度", weight: 15, target: "内部满意度调查≥80分" },
      { code: "COMPLIANCE", name: "劳动合规", weight: 10, target: "劳动纠纷0+合规检查通过" },
      { code: "DIGITAL", name: "HR数字化", weight: 10, target: "GRT System HR模块100%使用" },
    ],
    bonusCap: 3, levels: { A: 3, B: 2, C: 1, D: 0 },
  },
  // 管理层(总监+经理)
  management: {
    dims: [
      { code: "BU_REVENUE", name: "事业部营收达成", weight: 25, target: "事业部年度营收目标完成率" },
      { code: "TEAM_PERF", name: "团队绩效", weight: 20, target: "团队A+B档占比≥60%" },
      { code: "DELIVERY", name: "交付与质量", weight: 20, target: "项目准时率≥92%+FPY≥95%" },
      { code: "TALENT", name: "人才培养", weight: 15, target: "关键岗位后备≥1人+离职率<10%" },
      { code: "INNOVATION", name: "创新与改进", weight: 10, target: "流程改进≥3项+成本降低≥5%" },
      { code: "STRATEGY", name: "战略执行", weight: 10, target: "OKR完成率≥85%" },
    ],
    bonusCap: 6, levels: { A: 6, B: 4, C: 2, D: 0 },
  },
  // 通用/行政支持
  general: {
    dims: [
      { code: "TASK_QUALITY", name: "工作质量", weight: 30, target: "任务完成质量评分≥80" },
      { code: "EFFICIENCY", name: "工作效率", weight: 25, target: "任务按时完成率≥90%" },
      { code: "CAPABILITY", name: "能力提升", weight: 20, target: "TSDCKL至少1维度提升" },
      { code: "COLLAB", name: "协作与态度", weight: 15, target: "同事协作评价≥良好" },
      { code: "COMPLIANCE", name: "纪律与出勤", weight: 10, target: "出勤率≥98%+计划提交≥80%" },
    ],
    bonusCap: 2, levels: { A: 2, B: 1.5, C: 1, D: 0 },
  },
};

// 岗位→族映射
function getFamily(dept, pos) {
  if (/销售|市场/.test(pos)) return "sales";
  if (/项目经理|项目工程师/.test(pos) && !/采购/.test(pos)) return "pm";
  if (/机械|电气|IT工程师|助理.*工程师/.test(pos)) return "engineer";
  if (/会计|财务|总账|仓库/.test(pos)) return "finance";
  if (/采购|供应链|PMC/.test(pos)) return "finance";
  if (/质量/.test(pos)) return "quality";
  if (/售后/.test(pos)) return "service";
  if (/人事|行政|前台|后勤/.test(pos)) return "hr_admin";
  if (/董事长|总监|经理|主管/.test(pos) && !/助理/.test(pos)) return "management";
  if (/装配|焊工|激光|冷作|CNC|数控|机加工|班组/.test(pos)) return "production";
  return "general";
}

async function main() {
  const ENV = loadEnv();
  const c = new Client({ connectionString: ENV.DATABASE_URL });
  await c.connect();
  const year = 2026;

  const emps = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/employees.json"), "utf-8")).employees;
  // Get user IDs from DB
  const userMap = {};
  const users = await c.query('SELECT id, "openId", name FROM users');
  users.rows.forEach(u => { userMap[u.openId] = u.id; });

  let created = 0, dimCount = 0, skipped = 0;
  const familyStats = {};

  for (const emp of emps) {
    const userId = userMap[emp.id];
    if (!userId) { skipped++; continue; }

    const family = getFamily(emp.department, emp.position);
    const tpl = KPI_TEMPLATES[family] || KPI_TEMPLATES.general;
    familyStats[family] = (familyStats[family] || 0) + 1;

    // Check if agreement already exists
    const existing = await c.query('SELECT id FROM annual_goal_agreements WHERE employee_id = $1 AND year = $2 LIMIT 1', [userId, year]);
    let agId;
    if (existing.rows.length > 0) {
      agId = existing.rows[0].id;
      // Update
      await c.query(`UPDATE annual_goal_agreements SET
        employee_name = $1, employee_open_id = $2, department = $3,
        performance_levels_json = $4, bonus_cap_months = $5, updated_at = NOW()
        WHERE id = $6`,
        [emp.name, emp.id, emp.department,
         JSON.stringify({ D: { label: "待改进", bonusMonths: tpl.levels.D }, C: { label: "合格", bonusMonths: tpl.levels.C }, B: { label: "良好", bonusMonths: tpl.levels.B }, A: { label: "优秀", bonusMonths: tpl.levels.A } }),
         tpl.bonusCap, agId]);
    } else {
      const [row] = (await c.query(`INSERT INTO annual_goal_agreements (employee_id, employee_name, employee_open_id,
        manager_id, manager_name, year, status, department, bu_code,
        performance_levels_json, bonus_cap_months, created_at, updated_at)
        VALUES ($1,$2,$3, 162,'倪亚东', $4,'active',$5,$6, $7,$8, NOW(),NOW())
        RETURNING id`,
        [userId, emp.name, emp.id, year, emp.department,
         emp.department.includes("一") ? "BU1" : emp.department.includes("二") ? "BU2" : emp.department.includes("三") ? "BU3" : emp.department.includes("四") ? "BU4" : emp.department.includes("十") ? "BU5" : "HQ",
         JSON.stringify({ D: { label: "待改进", bonusMonths: tpl.levels.D }, C: { label: "合格", bonusMonths: tpl.levels.C }, B: { label: "良好", bonusMonths: tpl.levels.B }, A: { label: "优秀", bonusMonths: tpl.levels.A } }),
         tpl.bonusCap])).rows;
      agId = row.id;
      created++;
    }

    // Upsert dimensions
    await c.query('DELETE FROM annual_goal_dimensions WHERE agreement_id = $1', [agId]);
    for (const dim of tpl.dims) {
      // 产线人员预设中间值
      const baseScore = family === "production" ? 50 : Math.floor(Math.random() * 15 + 5);
      await c.query(`INSERT INTO annual_goal_dimensions (agreement_id, dimension_code, dimension_name, weight, kpi_targets_json, current_score, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [agId, dim.code, dim.name, dim.weight, JSON.stringify({ target: dim.target, position: emp.position, department: emp.department }), baseScore]);
      dimCount++;
    }

    // Create Q1-Q4 checkpoints if not exist
    const cpExists = await c.query('SELECT COUNT(*) as cnt FROM annual_goal_checkpoints WHERE agreement_id = $1', [agId]);
    if (parseInt(cpExists.rows[0].cnt) === 0) {
      for (const [type, date] of [["Q1","2026-03-31"],["Q2","2026-06-30"],["Q3","2026-09-30"],["Q4","2026-12-31"]]) {
        await c.query(`INSERT INTO annual_goal_checkpoints (agreement_id, checkpoint_type, scheduled_date, status, created_at, updated_at)
          VALUES ($1,$2,$3,$4,NOW(),NOW())`, [agId, type, date, type === "Q1" ? "completed" : "pending"]);
      }
    }
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  全员KPI体系批量生成完成 (CEO视角)                        ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  年度: ${year}   员工: ${emps.length}   新建协定: ${created}   跳过: ${skipped}        ║`);
  console.log(`║  维度总数: ${dimCount}                                        ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  for (const [fam, cnt] of Object.entries(familyStats).sort((a, b) => b[1] - a[1])) {
    const tpl = KPI_TEMPLATES[fam];
    console.log(`║  ${fam.padEnd(14)} ${String(cnt).padStart(3)}人  ${tpl.dims.length}维度  奖金上限${tpl.bonusCap}月         ║`);
  }
  console.log("╚══════════════════════════════════════════════════════════╝");

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
