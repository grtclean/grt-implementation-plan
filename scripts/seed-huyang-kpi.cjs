/**
 * 胡杨(GRT049) 2026年度KPI体系
 * 8个维度·4个检查点·2027延伸规划
 */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try { fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").split("\n").forEach(l => { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !vars[m[1]]) vars[m[1]] = m[2].trim(); }); } catch {}
  }
  return vars;
}

async function main() {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL });
  await c.connect();

  const agId = 5; // 胡杨的年度协定ID

  // 1. 更新协定
  await c.query(`UPDATE annual_goal_agreements SET
    employee_name = '胡杨', employee_open_id = 'GRT049', manager_id = 162, manager_name = '倪亚东',
    department = 'AI数智部', bu_code = 'HQ',
    career_path_option_json = $1, career_path_accepted = true,
    performance_levels_json = $2, bonus_cap_months = 6, updated_at = NOW()
  WHERE id = $3`, [
    JSON.stringify({ accepted: true, desc: "IT工程师→GRT System架构师→全球数字化总监→CTO" }),
    JSON.stringify({ D:{label:"待改进",bonusMonths:0}, C:{label:"合格",bonusMonths:2}, B:{label:"良好",bonusMonths:4}, A:{label:"优秀",bonusMonths:6} }),
    agId
  ]);

  // 2. 维度
  await c.query("DELETE FROM annual_goal_dimensions WHERE agreement_id = $1", [agId]);
  const dims = [
    ["GRT_SYSTEM_CN", "GRT System中国全面上线", 25,
     JSON.stringify({target:"Q2全功能上线+13沙盘+工程模拟; Q3方案85%+工程30%; Q4方案95%+工程50%",
       q1:"✅核心模块开发+基础部署", q2:"4月中国完全上线·所有功能基本实现·13个沙盘含工程自动项目模拟",
       q3:"工程能力加强·方案有效性≥85%·工程有效性≥30%", q4:"方案≥95%·工程≥50%",
       y2027_q2:"辅助系统+各部门≥80%平台使用·全面高质量运行"}), 35],

    ["GRT_SYSTEM_US", "美国公司系统部署+培训", 20,
     JSON.stringify({target:"Q2美国上线+培训; Q3比中国晚1月功能同步",
       q2:"美国系统上线·培训到位·基础功能可用",
       q3:"欧美增加功能实现·含亚洲系统应有功能·比中国晚1个月同步",
       q4:"美国稳定运行·用户满意度≥80%",
       features:"多语言/时区/合规/税务/货币适配"}), 10],

    ["SPECIAL_PROJECTS", "特定项目(电气平台/GRTS/查特)", 20,
     JSON.stringify({target:"20%特定项目·GRTS电气工程自动化·含电导率精确测试与联网",
       q1:"✅查特项目表现优秀·电气平台实现能力突出",
       q2:"GRTS电气自动化V1·支持1-2个新项目·电导率准确测试与联网功能实现",
       q3:"GRTS覆盖电气标准化·BOM自动生成·工程模拟·16个客户端性能指标监控能力实现",
       q4:"GRTS工程自动化成熟·可复用率≥60%·16项性能指标全部联网监控",
       note:"含电导率精确测试联网+16个客户端性能指标监控能力"}), 20],

    ["PROJECT_SUPPORT", "国内国际项目支持(10%)", 10,
     JSON.stringify({target:"10%国内国际项目系统支持",
       q1:"支持查特项目(已完成)", q2:"覆盖≥2个项目", q3:"≥4个项目+SOP", q4:"≥6个项目·10%达标"}), 15],

    ["ENGINEERING_QUALITY", "工程方案质量与实现", 10,
     JSON.stringify({target:"方案有效性→Q3≥85%→Q4≥95%; 工程有效性→Q3≥30%→Q4≥50%",
       measurement:"方案有效性=客户接受率; 工程有效性=自动化实现比例",
       q3:"方案≥85%·工程≥30%", q4:"方案≥95%·工程≥50%"}), 10],

    ["TEAM_COLLAB", "部门协同与平台使用率", 5,
     JSON.stringify({target:"各部门≥80%平台使用率",
       q2:"核心部门培训完成", q3:"全部门培训·使用率≥60%", q4:"使用率≥75%",
       y2027:"各部门≥80%高质量使用"}), 8],

    ["INNOVATION_AI", "AI与技术创新", 5,
     JSON.stringify({target:"Copilot+Agent+智能决策落地",
       q2:"Copilot日活≥30%", q3:"AI辅助方案生成", q4:"AI采纳率≥40%"}), 12],

    ["PERSONAL_GROWTH", "个人能力(TSDCKL)", 5,
     JSON.stringify({target:"3维度提升1级·英语强化",
       q2:"T+D提升·架构验证", q3:"C提升·美国团队协作", q4:"L提升·带2-3人技术团队"}), 10],
  ];

  for (const [code, name, weight, kpi, score] of dims) {
    await c.query(`INSERT INTO annual_goal_dimensions (agreement_id, dimension_code, dimension_name, weight, kpi_targets_json, current_score, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`, [agId, code, name, weight, kpi, score]);
  }

  // 3. 检查点
  await c.query("DELETE FROM annual_goal_checkpoints WHERE agreement_id = $1", [agId]);
  const cps = [
    ["Q1", "2026-03-31", "completed", 78, "B", "Q1表现良好:查特项目电气平台突出·GRT System核心开发按计划·架构能力验证"],
    ["Q2", "2026-06-30", "in_progress", null, null, null],
    ["Q3", "2026-09-30", "pending", null, null, null],
    ["Q4", "2026-12-31", "pending", null, null, null],
  ];
  for (const [type, date, status, score, level, comments] of cps) {
    await c.query(`INSERT INTO annual_goal_checkpoints (agreement_id, checkpoint_type, scheduled_date, actual_date, status,
      overall_score, performance_level_code, manager_comments, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [agId, type, date, status === "completed" ? date : null, status, score, level, comments]);
  }

  // 4. Persona
  try {
    await c.query(`INSERT INTO employee_persona_profiles (employee_id, employee_name, employee_code, department, position, year,
      persona_score, persona_tier, motivation_score, team_interaction_score, client_recognition_score,
      peer_approval_score, manager_confidence_score, career_aspirations, long_term_goal,
      communication_style, emotional_resilience) VALUES (164,'胡杨','GRT049','AI数智部','IT工程师/GRT System架构师',2026,
      82,'high',88,78,75,82,85,'GRT System全球架构师·主导数字化转型','3年全球数字化总监→5年CTO方向',
      'written','high') ON CONFLICT DO NOTHING`);
  } catch {}

  // 5. 密码
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("Grt12345", salt);
  await c.query('UPDATE users SET "loginMethod" = $1 WHERE "openId" = $2', ["local:" + hash, "GRT049"]);

  // Verify
  const vD = await c.query("SELECT dimension_name, weight, current_score FROM annual_goal_dimensions WHERE agreement_id = $1 ORDER BY weight DESC", [agId]);
  const vC = await c.query("SELECT checkpoint_type, status, overall_score FROM annual_goal_checkpoints WHERE agreement_id = $1 ORDER BY scheduled_date", [agId]);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  胡杨(GRT049) 2026年度KPI体系                                ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║  登录: GRT049 / Grt12345                                    ║");
  console.log("║  岗位: AI数智部·IT工程师→GRT System架构师→CTO方向             ║");
  console.log("║  奖金: A=6月 B=4月 C=2月 D=0月                              ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  vD.rows.forEach(d => console.log("║  " + (d.dimension_name + "(" + d.weight + "%)").padEnd(38) + "当前:" + String(d.current_score).padStart(3) + "     ║"));
  console.log("╠══════════════════════════════════════════════════════════════╣");
  vC.rows.forEach(cp => console.log("║  " + cp.checkpoint_type.padEnd(6) + (cp.status === "completed" ? "✅ " + cp.overall_score + "分" : cp.status === "in_progress" ? "🔄 进行中" : "⏳ 待考察").padEnd(20) + "                    ║"));
  console.log("╚══════════════════════════════════════════════════════════════╝");

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
