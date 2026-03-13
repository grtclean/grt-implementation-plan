/**
 * 军团化批量配置服务
 *
 * 基于员工技能清单(TSDCKL)批量初始化数字助手军团:
 * 1. 读取员工名册 + TSDCKL能力评估
 * 2. 计算每位员工的M默认等级 (L1-L5)
 * 3. 创建M级主助理 (employeeAiAssistants)
 * 4. 创建L1-L5军团 (aiAgentFleet)
 * 5. 初始G-Token播种
 * 6. 自动激活默认等级Agent
 */

import { requireDb } from "../db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { hrmEmployees, employeeAiAssistants } from "../../drizzle/schema";
import { employeeCompetenceAssessments, employeeCapabilities, employeeDomainScores } from "../../drizzle/hr-competence-schema";
import { aiAgentFleet, gTokenLedger } from "../../drizzle/ai-agent-fleet-schema";
import { mapPositionToRole, getPresetByRole, generateAssistantCode, generateAssistantName, buildPersonalityConfig, type PromptContext } from "../../shared/ai-assistant-presets";
import { AGENT_LEVEL_CONFIGS, generateAgentCode, generateAgentDid, generateAgentName, type AgentLevel } from "../../shared/ai-agent-levels";
import { getWorkstationConfig } from "../../shared/role-workstation-config";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("legion-provisioning");

// ─── Types ──────────────────────────────────────────────

export interface EmployeeSkillMapping {
  employeeId: number;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  roleId: string;
  roleName: string;
  tsdckl: { t: number; s: number; d: number; c: number; k: number; l: number } | null;
  skillAvg: number;
  computedLevel: AgentLevel;
  hasMaster: boolean;
  hasFleet: boolean;
  fleetActiveLevel: number | null;
}

export interface LegionProvisionResult {
  totalEmployees: number;
  mastersCreated: number;
  mastersSkipped: number;
  fleetsCreated: number;
  fleetsSkipped: number;
  agentsActivated: number;
  gTokensSeeded: number;
  errors: string[];
  details: { employeeCode: string; name: string; level: AgentLevel; action: string }[];
}

export interface LegionOverview {
  totalEmployees: number;
  withMaster: number;
  withFleet: number;
  withActiveAgent: number;
  totalAgents: number;
  totalGTokens: number;
  byLevel: Record<number, number>;
  byDepartment: Record<string, { total: number; provisioned: number; active: number }>;
  byRole: Record<string, number>;
}

// ─── TSDCKL → M-Level 计算 ──────────────────────────────

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "系统全局管理，包括用户权限、系统配置、安全合规",
  director: "公司战略决策，跨事业部资源协调与绩效管理",
  bu_gm: "事业部全面经营管理",
  bu_pm: "项目全生命周期管理，跨部门协调",
  bu_sales: "客户开发、商机管理、技术方案与报价",
  bu_mech: "机械部分的设计和技术支持",
  bu_elec: "电气控制系统的设计和技术支持",
  procurement_eng: "物料采购和供应商管理",
  cs_engineer: "现场安装、调试和售后服务",
  dept_manager: "部门管理，包括预算审批、团队管理",
  team_lead: "团队管理，可评估下属绩效",
  hr_manager: "人力资源管理，全员数据访问",
  hr_specialist: "员工信息管理、招聘、培训执行",
  finance_manager: "财务管理，薪酬和预算审批",
  finance_specialist: "费用报销和发票管理",
  production_worker: "产线操作，工时打卡和工序执行",
  quality_eng: "来料/过程/成品质量检验与体系维护",
  employee: "日常工作任务执行与个人发展",
};

/**
 * 从TSDCKL分数计算M默认等级
 *
 * 算法:
 * 1. 取TSDCKL六项平均分 (0-100 scale)
 * 2. 结合岗位权重: 管理岗L偏重, 技术岗T/D偏重, 销售岗S/C偏重
 * 3. 映射: <40→L1, 40-54→L2, 55-69→L3, 70-84→L4, ≥85→L5
 * 4. 管理岗至少L3, 总监至少L4
 */
export function computeSkillLevel(
  tsdckl: { t: number; s: number; d: number; c: number; k: number; l: number } | null,
  roleId: string,
): AgentLevel {
  // 无评估数据 → 使用岗位默认
  if (!tsdckl) {
    const wsConfig = getWorkstationConfig(roleId);
    return wsConfig.defaultAgentLevel;
  }

  const { t, s, d, c, k, l } = tsdckl;

  // 岗位权重矩阵
  let weightedScore: number;
  switch (roleId) {
    case "director":
    case "bu_gm":
      // 管理岗: L*30% + K*20% + C*20% + S*15% + T*10% + D*5%
      weightedScore = l * 0.30 + k * 0.20 + c * 0.20 + s * 0.15 + t * 0.10 + d * 0.05;
      break;
    case "bu_mech":
    case "bu_elec":
    case "quality_eng":
      // 技术岗: T*30% + D*20% + K*20% + S*10% + C*10% + L*10%
      weightedScore = t * 0.30 + d * 0.20 + k * 0.20 + s * 0.10 + c * 0.10 + l * 0.10;
      break;
    case "bu_sales":
      // 销售岗: S*25% + C*25% + K*15% + T*15% + D*10% + L*10%
      weightedScore = s * 0.25 + c * 0.25 + k * 0.15 + t * 0.15 + d * 0.10 + l * 0.10;
      break;
    case "bu_pm":
    case "dept_manager":
      // 项目/部门管理: L*25% + C*20% + K*20% + S*15% + T*10% + D*10%
      weightedScore = l * 0.25 + c * 0.20 + k * 0.20 + s * 0.15 + t * 0.10 + d * 0.10;
      break;
    default:
      // 通用: 等权
      weightedScore = (t + s + d + c + k + l) / 6;
  }

  // 映射到L1-L5
  let level: AgentLevel;
  if (weightedScore >= 85) level = 5;
  else if (weightedScore >= 70) level = 4;
  else if (weightedScore >= 55) level = 3;
  else if (weightedScore >= 40) level = 2;
  else level = 1;

  // 管理岗底线保障
  if (["director", "bu_gm"].includes(roleId) && level < 4) level = 4;
  if (["dept_manager", "bu_pm", "hr_manager", "finance_manager"].includes(roleId) && level < 3) level = 3;

  return level;
}

/**
 * 解析TSDCKL分数字符串为数字 (支持 "85", "A-", "4/5" 等格式)
 */
function parseScore(s: string | null | undefined): number {
  if (!s) return 0;
  const str = s.trim();
  // 纯数字
  const num = parseFloat(str);
  if (!isNaN(num)) return Math.min(100, Math.max(0, num));
  // 等级制 A/B/C/D
  const gradeMap: Record<string, number> = {
    "A+": 95, "A": 90, "A-": 85,
    "B+": 80, "B": 75, "B-": 70,
    "C+": 65, "C": 60, "C-": 55,
    "D+": 50, "D": 45, "D-": 40,
    "E": 30, "F": 20,
  };
  if (gradeMap[str.toUpperCase()]) return gradeMap[str.toUpperCase()];
  // x/5 制
  const slashMatch = str.match(/^(\d+(?:\.\d+)?)\s*\/\s*5$/);
  if (slashMatch) return Math.round((parseFloat(slashMatch[1]) / 5) * 100);
  return 50; // 默认中等
}

// ─── 批量获取员工技能映射 ────────────────────────────────

export async function getEmployeeSkillMappings(): Promise<EmployeeSkillMapping[]> {
  const db = await requireDb();

  // 1. 所有在职员工
  const employees = await db
    .select({
      id: hrmEmployees.id,
      employeeCode: hrmEmployees.employeeCode,
      name: hrmEmployees.name,
      department: hrmEmployees.department,
      position: hrmEmployees.position,
      level: hrmEmployees.level,
    })
    .from(hrmEmployees)
    .where(or(eq(hrmEmployees.status, "regular"), eq(hrmEmployees.status, "probation")))
    .limit(1000);

  // 2. TSDCKL评估 (最新一条)
  let assessments: Record<number, { t: number; s: number; d: number; c: number; k: number; l: number }> = {};
  try {
    const rows = await db
      .select()
      .from(employeeCompetenceAssessments)
      .orderBy(desc(employeeCompetenceAssessments.assessedAt))
      .limit(1000);

    for (const row of rows) {
      if (!assessments[row.employeeId]) {
        assessments[row.employeeId] = {
          t: parseScore(row.tScore),
          s: parseScore(row.sScore),
          d: parseScore(row.dScore),
          c: parseScore(row.cScore),
          k: parseScore(row.kScore),
          l: parseScore(row.lScore),
        };
      }
    }
  } catch {
    // table may not exist
  }

  // 3. 已有Master助理
  const masters = await db
    .select({ employeeId: employeeAiAssistants.employeeId })
    .from(employeeAiAssistants)
    .limit(1000);
  const masterSet = new Set(masters.map((m) => m.employeeId));

  // 4. 已有Fleet agents
  let fleetMap: Record<number, { levels: number[]; activeLevel: number | null }> = {};
  try {
    const agents = await db
      .select({
        employeeId: aiAgentFleet.employeeId,
        level: aiAgentFleet.level,
        status: aiAgentFleet.status,
      })
      .from(aiAgentFleet)
      .limit(5000);

    for (const a of agents) {
      if (!fleetMap[a.employeeId]) {
        fleetMap[a.employeeId] = { levels: [], activeLevel: null };
      }
      fleetMap[a.employeeId].levels.push(a.level);
      if (a.status === "active" && (fleetMap[a.employeeId].activeLevel === null || a.level > fleetMap[a.employeeId].activeLevel!)) {
        fleetMap[a.employeeId].activeLevel = a.level;
      }
    }
  } catch {
    // table may not exist
  }

  // 5. 构建映射
  return employees.map((emp) => {
    const roleId = mapPositionToRole(emp.position, emp.department);
    const tsdckl = assessments[emp.id] || null;
    const skillAvg = tsdckl ? Math.round((tsdckl.t + tsdckl.s + tsdckl.d + tsdckl.c + tsdckl.k + tsdckl.l) / 6) : 0;
    const wsConfig = getWorkstationConfig(roleId);

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      roleId,
      roleName: wsConfig.roleName,
      tsdckl,
      skillAvg,
      computedLevel: computeSkillLevel(tsdckl, roleId),
      hasMaster: masterSet.has(emp.id),
      hasFleet: !!fleetMap[emp.id] && fleetMap[emp.id].levels.length >= 5,
      fleetActiveLevel: fleetMap[emp.id]?.activeLevel ?? null,
    };
  });
}

// ─── 军团化批量初始化 ────────────────────────────────────

export async function batchProvisionLegion(): Promise<LegionProvisionResult> {
  const db = await requireDb();
  const result: LegionProvisionResult = {
    totalEmployees: 0,
    mastersCreated: 0,
    mastersSkipped: 0,
    fleetsCreated: 0,
    fleetsSkipped: 0,
    agentsActivated: 0,
    gTokensSeeded: 0,
    errors: [],
    details: [],
  };

  try {
    const mappings = await getEmployeeSkillMappings();
    result.totalEmployees = mappings.length;

    for (const emp of mappings) {
      try {
        // ── Step 1: Create Master assistant if needed ──
        if (!emp.hasMaster) {
          const preset = getPresetByRole(emp.roleId);
          const ctx: PromptContext = {
            ownerName: emp.name,
            ownerCode: emp.employeeCode,
            department: emp.department,
            position: emp.position,
            roleDescription: ROLE_DESCRIPTIONS[emp.roleId] || "日常工作任务执行",
          };

          await db.insert(employeeAiAssistants).values({
            employeeId: emp.employeeId,
            assistantCode: generateAssistantCode(emp.employeeCode),
            assistantName: generateAssistantName(emp.name),
            assistantType: preset.assistantType as any,
            personalityConfig: buildPersonalityConfig(emp.roleId, ctx),
            knowledgeDomains: JSON.stringify(preset.knowledgeDomains),
            skillLevels: JSON.stringify({ computedLevel: emp.computedLevel, tsdckl: emp.tsdckl }),
            status: "active" as const,
          });
          result.mastersCreated++;
        } else {
          result.mastersSkipped++;
        }

        // ── Step 2: Create L1-L5 fleet if needed ──
        if (!emp.hasFleet) {
          // Get master ID
          const [master] = await db
            .select({ id: employeeAiAssistants.id, personalityConfig: employeeAiAssistants.personalityConfig })
            .from(employeeAiAssistants)
            .where(eq(employeeAiAssistants.employeeId, emp.employeeId))
            .limit(1);

          if (master) {
            // Check existing agents
            const existing = await db
              .select({ level: aiAgentFleet.level })
              .from(aiAgentFleet)
              .where(eq(aiAgentFleet.employeeId, emp.employeeId))
              .limit(10);
            const existingLevels = new Set(existing.map((a) => a.level));

            let masterConfig: Record<string, unknown> = {};
            try {
              if (master.personalityConfig) masterConfig = JSON.parse(master.personalityConfig);
            } catch { /* ignore */ }

            const agentValues = [];
            for (let lvl = 1; lvl <= 5; lvl++) {
              const level = lvl as AgentLevel;
              if (existingLevels.has(level)) continue;

              const cfg = AGENT_LEVEL_CONFIGS[level];
              const personalityConfig = {
                ...masterConfig,
                levelModifier: cfg.promptModifier,
                level,
                computedDefaultLevel: emp.computedLevel,
              };

              agentValues.push({
                masterAssistantId: master.id,
                employeeId: emp.employeeId,
                agentCode: generateAgentCode(emp.employeeCode, level),
                agentDid: generateAgentDid(emp.employeeCode, level),
                agentName: generateAgentName(emp.name, level),
                level,
                personalityConfig: JSON.stringify(personalityConfig),
                capabilityMask: JSON.stringify(cfg.defaultCapabilities),
                maxTaskComplexity: cfg.maxTaskComplexity,
                autonomyLevel: cfg.autonomyLevel,
                dataScope: cfg.dataScope,
                canBidTasks: level >= 3,
                maxConcurrentTasks: cfg.maxConcurrentTasks,
                bidPriceRangeLow: String(cfg.bidPriceRangeLow),
                bidPriceRangeHigh: String(cfg.bidPriceRangeHigh),
                status: level === emp.computedLevel ? ("active" as const) : ("inactive" as const),
                activatedAt: level === emp.computedLevel ? new Date().toISOString() : null,
              });
            }

            if (agentValues.length > 0) {
              await db.insert(aiAgentFleet).values(agentValues);
              result.fleetsCreated += agentValues.length;

              // Count activated
              const activated = agentValues.filter((v) => v.status === "active").length;
              result.agentsActivated += activated;
            }
          }
        } else {
          result.fleetsSkipped++;
        }

        // ── Step 3: Seed G-Tokens for default level agent ──
        if (!emp.hasFleet && !emp.fleetActiveLevel) {
          try {
            const [defaultAgent] = await db
              .select({ id: aiAgentFleet.id, agentCode: aiAgentFleet.agentCode, gTokenBalance: aiAgentFleet.gTokenBalance })
              .from(aiAgentFleet)
              .where(and(
                eq(aiAgentFleet.employeeId, emp.employeeId),
                eq(aiAgentFleet.level, emp.computedLevel),
              ))
              .limit(1);

            if (defaultAgent) {
              const seedAmount = emp.computedLevel * 50; // L1=50, L2=100, L3=150, L4=200, L5=250
              const currentBalance = parseFloat(defaultAgent.gTokenBalance || "0");

              if (currentBalance === 0) {
                const newBalance = currentBalance + seedAmount;
                await db
                  .update(aiAgentFleet)
                  .set({
                    gTokenBalance: newBalance.toFixed(4),
                    totalEarned: newBalance.toFixed(4),
                  })
                  .where(eq(aiAgentFleet.id, defaultAgent.id));

                await db.insert(gTokenLedger).values({
                  agentId: defaultAgent.id,
                  employeeId: emp.employeeId,
                  agentCode: defaultAgent.agentCode,
                  txType: "bonus",
                  amount: seedAmount.toFixed(4),
                  balanceAfter: newBalance.toFixed(4),
                  referenceType: "admin_adjustment",
                  description: `军团初始化播种: L${emp.computedLevel} 默认等级激活奖励`,
                });
                result.gTokensSeeded += seedAmount;
              }
            }
          } catch {
            // G-Token seeding is best-effort
          }
        }

        result.details.push({
          employeeCode: emp.employeeCode,
          name: emp.name,
          level: emp.computedLevel,
          action: emp.hasMaster && emp.hasFleet ? "skip" : emp.hasMaster ? "fleet_created" : "full_init",
        });
      } catch (err: any) {
        result.errors.push(`${emp.name}(${emp.employeeCode}): ${err.message}`);
        log.error({ err, employeeId: emp.employeeId }, "legion provision error");
      }
    }

    log.info({
      total: result.totalEmployees,
      masters: result.mastersCreated,
      fleets: result.fleetsCreated,
      activated: result.agentsActivated,
      gTokens: result.gTokensSeeded,
      errors: result.errors.length,
    }, "legion batch provision complete");
  } catch (err: any) {
    result.errors.push(`批量初始化失败: ${err.message}`);
    log.error({ err }, "legion batch provision fatal");
  }

  return result;
}

// ─── 军团概览统计 ────────────────────────────────────────

export async function getLegionOverview(): Promise<LegionOverview> {
  const db = await requireDb();

  // Employees
  const employees = await db
    .select({
      id: hrmEmployees.id,
      department: hrmEmployees.department,
      position: hrmEmployees.position,
    })
    .from(hrmEmployees)
    .where(or(eq(hrmEmployees.status, "regular"), eq(hrmEmployees.status, "probation")))
    .limit(1000);

  // Masters
  const masters = await db
    .select({ employeeId: employeeAiAssistants.employeeId })
    .from(employeeAiAssistants)
    .limit(1000);
  const masterSet = new Set(masters.map((m) => m.employeeId));

  // Fleet
  let agents: { employeeId: number; level: number; status: string; gTokenBalance: string }[] = [];
  try {
    agents = await db
      .select({
        employeeId: aiAgentFleet.employeeId,
        level: aiAgentFleet.level,
        status: aiAgentFleet.status,
        gTokenBalance: aiAgentFleet.gTokenBalance,
      })
      .from(aiAgentFleet)
      .limit(5000);
  } catch { /* table may not exist */ }

  const fleetEmployees = new Set(agents.map((a) => a.employeeId));
  const activeEmployees = new Set(agents.filter((a) => a.status === "active").map((a) => a.employeeId));

  // By level
  const byLevel: Record<number, number> = {};
  for (const a of agents) {
    byLevel[a.level] = (byLevel[a.level] || 0) + 1;
  }

  // Total G-Tokens
  const totalGTokens = agents.reduce((sum, a) => sum + parseFloat(a.gTokenBalance || "0"), 0);

  // By department
  const byDepartment: Record<string, { total: number; provisioned: number; active: number }> = {};
  for (const emp of employees) {
    const dept = emp.department || "未分配";
    if (!byDepartment[dept]) byDepartment[dept] = { total: 0, provisioned: 0, active: 0 };
    byDepartment[dept].total++;
    if (fleetEmployees.has(emp.id)) byDepartment[dept].provisioned++;
    if (activeEmployees.has(emp.id)) byDepartment[dept].active++;
  }

  // By role
  const byRole: Record<string, number> = {};
  for (const emp of employees) {
    const roleId = mapPositionToRole(emp.position, emp.department);
    byRole[roleId] = (byRole[roleId] || 0) + 1;
  }

  return {
    totalEmployees: employees.length,
    withMaster: masterSet.size,
    withFleet: fleetEmployees.size,
    withActiveAgent: activeEmployees.size,
    totalAgents: agents.length,
    totalGTokens: Math.round(totalGTokens * 100) / 100,
    byLevel,
    byDepartment,
    byRole,
  };
}
