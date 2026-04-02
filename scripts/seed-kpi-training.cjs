/**
 * KPI培训课程体系种子数据 — 7大模块21门课程
 * 覆盖全公司45个岗位，按岗位族分类
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try {
      fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").split("\n").forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !vars[m[1]]) vars[m[1]] = m[2].trim();
      });
    } catch {}
  }
  return vars;
}

const courses = [
  // Module 1: KPI Foundation (ALL)
  { code:"KPI-101", title:"什么是KPI？从公司战略到个人目标", cat:"kpi_foundation", fmt:"video", dur:15, diff:"beginner", desc:"BSC四维度·GRT 6大战略目标·分解逻辑", roles:["all"], tags:["KPI","BSC","入门"] },
  { code:"KPI-102", title:"GRT年度目标协定制度详解", cat:"kpi_foundation", fmt:"document", dur:20, diff:"beginner", desc:"协定签署·维度设定·权重·ABCD档位·奖金映射", roles:["all"], tags:["协定","奖金"] },
  { code:"KPI-103", title:"GRT System绩效模块实操指南", cat:"kpi_foundation", fmt:"practice", dur:10, diff:"beginner", desc:"赋能引擎→目标进度→绩效中心→职业灯塔 5页面", roles:["all"], tags:["实操","系统"] },
  { code:"KPI-104", title:"每日计划与总结·积分制度", cat:"kpi_foundation", fmt:"video", dur:10, diff:"beginner", desc:"9:00计划+17:00总结=+10积分/天·积分等级·年终关联", roles:["all"], tags:["积分","习惯"] },
  { code:"KPI-105", title:"GRT 2026-2030三条发展路线", cat:"kpi_foundation", fmt:"video", dur:12, diff:"beginner", desc:"激进5亿/稳健3亿/保守2亿·岗位影响·全球化", roles:["all"], tags:["灯塔","路线"] },
  // Module 2: Sales KPI
  { code:"KPI-201", title:"销售工程师KPI：线索到订单全漏斗", cat:"kpi_sales", fmt:"video", dur:20, diff:"intermediate", desc:"漏斗各阶段指标·客户分级·订单目标设定", roles:["bu_sales","sales_rep","sales_director"], tags:["销售","漏斗"] },
  { code:"KPI-202", title:"战略客户开拓与管理KPI", cat:"kpi_sales", fmt:"document", dur:15, diff:"advanced", desc:"战略客户定义(>2000万)·健康分·NPS·复购", roles:["bu_sales","sales_director"], tags:["战略客户"] },
  { code:"KPI-203", title:"销售团队管理KPI·目标分解", cat:"kpi_sales", fmt:"practice", dur:25, diff:"advanced", desc:"指标分解·辅导方法·陪访制度·TSDCKL提升", roles:["sales_director","bu_gm"], tags:["团队","分解"] },
  // Module 3: Engineering KPI
  { code:"KPI-301", title:"机械/电气工程师KPI体系", cat:"kpi_engineering", fmt:"video", dur:18, diff:"intermediate", desc:"设计产出·图纸质量·BOM准确·ECN·交付率·创新", roles:["bu_mech","bu_elec","engineer"], tags:["工程师","质量"] },
  { code:"KPI-302", title:"项目经理KPI·M0到M12全流程指标", cat:"kpi_engineering", fmt:"document", dur:20, diff:"intermediate", desc:"阶段准时率·成本控制·变更频次·客户满意·FAT通过", roles:["bu_pm","project_manager"], tags:["PM","M0-M12"] },
  { code:"KPI-303", title:"技术创新与专利KPI", cat:"kpi_engineering", fmt:"video", dur:12, diff:"advanced", desc:"创新产出·专利申请·工艺改进·标准化·知识库", roles:["bu_mech","bu_elec","engineer"], tags:["创新","专利"] },
  // Module 4: Support Functions KPI
  { code:"KPI-401", title:"财务人员KPI：准确·及时·合规", cat:"kpi_support", fmt:"video", dur:15, diff:"intermediate", desc:"凭证准确·报销时效·结账及时·审计问题·对账差异", roles:["finance_manager","finance_specialist"], tags:["财务","合规"] },
  { code:"KPI-402", title:"HR人员KPI：招聘·培训·绩效", cat:"kpi_support", fmt:"video", dur:15, diff:"intermediate", desc:"招聘完成率·30天留存·培训执行·评估及时·满意度", roles:["hr_manager","hr_specialist","hr_director"], tags:["HR","招聘"] },
  { code:"KPI-403", title:"采购与供应链KPI", cat:"kpi_support", fmt:"document", dur:15, diff:"intermediate", desc:"成本节约·交期准时·来料合格·库存周转·安全库存", roles:["procurement_eng"], tags:["采购","供应链"] },
  // Module 5: Production KPI
  { code:"KPI-501", title:"产线员工KPI：效率·质量·安全", cat:"kpi_production", fmt:"video", dur:12, diff:"beginner", desc:"OEE效率·工序合格·安全零事故·工时利用·5S评分", roles:["production_worker","floor_operator","team_lead"], tags:["生产","OEE"] },
  { code:"KPI-502", title:"质量工程师KPI·IATF 16949指标", cat:"kpi_production", fmt:"document", dur:18, diff:"intermediate", desc:"DPPM·客诉响应·8D关闭·SPC失控·内审不符合", roles:["quality_eng","qc_manager"], tags:["质量","IATF"] },
  // Module 6: Service KPI
  { code:"KPI-601", title:"售后工程师KPI：响应·解决·满意", cat:"kpi_service", fmt:"video", dur:15, diff:"intermediate", desc:"SLA响应·首次解决率·NPS·远程比例·备件准确", roles:["cs_engineer"], tags:["售后","SLA"] },
  // Module 7: Management KPI
  { code:"KPI-701", title:"如何给下属设定合理的KPI", cat:"kpi_management", fmt:"video", dur:20, diff:"advanced", desc:"SMART原则·挑战vs可达·权重技巧·避免冲突", roles:["dept_manager","bu_gm","director","sales_director","project_manager"], tags:["管理","SMART"] },
  { code:"KPI-702", title:"绩效面谈技巧·正向反馈与改进", cat:"kpi_management", fmt:"video", dur:18, diff:"advanced", desc:"SBI反馈法·面谈模板(30min)·低绩效处理·PIP", roles:["dept_manager","bu_gm","director","hr_manager"], tags:["面谈","反馈"] },
  { code:"KPI-703", title:"绩效校准会议·从主观到公正", cat:"kpi_management", fmt:"practice", dur:25, diff:"expert", desc:"校准流程·强制分布vs自由·跨部门对齐·消除偏见", roles:["director","hr_manager","bu_gm"], tags:["校准","公正"] },
  { code:"KPI-704", title:"TSDCKL六维能力模型深度解读", cat:"kpi_management", fmt:"document", dur:15, diff:"intermediate", desc:"技术T·软技能S·设计D·沟通C·知识K·领导L 评分标准与晋升关联", roles:["all"], tags:["TSDCKL","能力"] },
];

async function main() {
  const ENV = loadEnv();
  const c = new Client({ connectionString: ENV.DATABASE_URL });
  await c.connect();

  let ok = 0, err = 0;
  for (const co of courses) {
    try {
      await c.query(`INSERT INTO training_materials (code, title, category, format, description, duration_minutes, difficulty,
        tags, target_roles, is_public, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::json,$9::json,true,'active',NOW(),NOW())
        ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, tags=EXCLUDED.tags, target_roles=EXCLUDED.target_roles, updated_at=NOW()`,
        [co.code, co.title, co.cat, co.fmt, co.desc, co.dur, co.diff, JSON.stringify(co.tags), JSON.stringify(co.roles)]);
      ok++;
    } catch (e) { console.log("ERR " + co.code + ": " + e.message.substring(0, 60)); err++; }
  }

  console.log(`\n=== KPI培训课程体系 ===`);
  console.log(`成功: ${ok}  失败: ${err}  总计: ${courses.length}`);
  const r = await c.query("SELECT category, COUNT(*) as cnt, SUM(duration_minutes) as mins FROM training_materials GROUP BY category ORDER BY category");
  r.rows.forEach(row => console.log(`  ${row.category.padEnd(20)} ${row.cnt}门  ${row.mins}分钟`));
  const total = await c.query("SELECT COUNT(*) as cnt, SUM(duration_minutes) as mins FROM training_materials");
  console.log(`  ${"TOTAL".padEnd(20)} ${total.rows[0].cnt}门  ${total.rows[0].mins}分钟`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
