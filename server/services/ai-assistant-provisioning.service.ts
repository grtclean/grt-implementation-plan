/**
 * AI助理自动配置服务
 *
 * 核心功能：
 * 1. 批量为所有员工创建AI助理
 * 2. 单个员工配置
 * 3. 按角色刷新系统提示词
 * 4. 配置状态概览
 * 5. 上下文构建（给sendMessage用）
 */

import { requireDb } from "../db";
import { eq, and, inArray, like, or, desc, sql, isNull, isNotNull } from "drizzle-orm";
import {
  hrmEmployees,
  employeeAiAssistants,
  projectTasks,
  meetings,
} from "../../drizzle/schema";
import { employeeCompetenceAssessments } from "../../drizzle/hr-competence-schema";
import {
  mapPositionToRole,
  getPresetByRole,
  generateAssistantName,
  generateAssistantCode,
  buildEmployeeSystemPrompt,
  buildPersonalityConfig,
  ROLE_AI_PRESETS,
  type PromptContext,
} from "../../shared/ai-assistant-presets";

// ─── 类型 ──────────────────────────────────────────────────

export interface ProvisionResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface ProvisioningStatus {
  totalEmployees: number;
  provisionedCount: number;
  pendingCount: number;
  byDepartment: Record<string, { total: number; provisioned: number }>;
}

interface EmployeeRow {
  id: number;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  level: string | null;
  status: string;
}

// ─── 角色描述映射（从ROLE_CONFIGS复制关键信息） ──────────────

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
  employee: "日常工作任务执行与个人发展",
};

// ─── 批量配置所有员工 ──────────────────────────────────────

export async function provisionAllEmployees(): Promise<ProvisionResult> {
  const db = await requireDb();
  const result: ProvisionResult = { created: 0, skipped: 0, errors: [] };

  try {
    // 1. 查询所有在职/试用期员工
    const employees = await db
      .select({
        id: hrmEmployees.id,
        employeeCode: hrmEmployees.employeeCode,
        name: hrmEmployees.name,
        department: hrmEmployees.department,
        position: hrmEmployees.position,
        level: hrmEmployees.level,
        status: hrmEmployees.status,
      })
      .from(hrmEmployees)
      .where(
        or(
          eq(hrmEmployees.status, "regular"),
          eq(hrmEmployees.status, "probation"),
        )
      )
      .limit(1000);

    if (employees.length === 0) {
      result.errors.push("未找到在职员工");
      return result;
    }

    // 2. 查询已有的AI助理记录
    const existingAssistants = await db
      .select({ employeeId: employeeAiAssistants.employeeId })
      .from(employeeAiAssistants)
      .limit(1000);

    const existingSet = new Set(existingAssistants.map((a) => a.employeeId));

    // 3. 过滤出未配置的员工
    const pendingEmployees = employees.filter((e) => !existingSet.has(e.id));

    if (pendingEmployees.length === 0) {
      result.skipped = employees.length;
      return result;
    }

    // 4. 为每个未配置员工构建记录
    const insertValues = [];
    for (const emp of pendingEmployees) {
      try {
        const roleId = mapPositionToRole(emp.position, emp.department);

        // guest 不配置
        if (roleId === "guest") {
          result.skipped++;
          continue;
        }

        const preset = getPresetByRole(roleId);
        const ctx: PromptContext = {
          ownerName: emp.name,
          ownerCode: emp.employeeCode,
          department: emp.department,
          position: emp.position,
          roleDescription: ROLE_DESCRIPTIONS[roleId] || "日常工作任务执行",
        };

        insertValues.push({
          employeeId: emp.id,
          assistantCode: generateAssistantCode(emp.employeeCode),
          assistantName: generateAssistantName(emp.name),
          assistantType: preset.assistantType as any,
          personalityConfig: buildPersonalityConfig(roleId, ctx),
          knowledgeDomains: JSON.stringify(preset.knowledgeDomains),
          status: "active" as const,
        });
      } catch (err: any) {
        result.errors.push(`员工${emp.name}(${emp.employeeCode}): ${err.message}`);
      }
    }

    // 5. 批量写入（分批，每批100条）
    const BATCH_SIZE = 100;
    for (let i = 0; i < insertValues.length; i += BATCH_SIZE) {
      const batch = insertValues.slice(i, i + BATCH_SIZE);
      await db.insert(employeeAiAssistants).values(batch);
    }

    result.created = insertValues.length;
    result.skipped = employees.length - pendingEmployees.length;
  } catch (err: any) {
    result.errors.push(`批量配置失败: ${err.message}`);
  }

  return result;
}

// ─── GRT 96人真实花名册（与工资表一致） ──────────────────
// [employeeCode, name, department, position]
const GRT_REAL_ROSTER: Array<[string, string, string, string]> = [
  ["GRT001","倪亚东","总裁办","董事长"],
  ["GRT080","刘奥运","AI数智部","董事长助理"],
  ["GRT049","胡杨","AI数智部","IT工程师"],
  ["GRT062","朱宇浩","事业二部","生产工程师兼项目及IT工程师"],

  ["GRT083","刘坤","AI数智部","市场主管"],
  ["GRT103","朱文韬","AI数智部","市场专员"],
  ["GRT105","倪微薇","AI数智部","AI数智&人事行政部经理"],
  ["GRT002","黄晓兰","财务部","出纳/银行账户执行"],
  ["GRT054","王秀萍","财务部","总账会计/财务复核"],
  ["GRT101","王汝月","财务部","财务专员/报销初审"],
  ["GRT066","李新正","财务部","仓库管理员"],
  ["GRT079_2","马鹏风","财务部","供应链工程师"],
  ["GRT067","沙建梅","人事行政部","人事行政主管"],
  ["GRT053","段天珠","人事行政部","前法"],
  ["GRT100","田炜钰","人事行政部","行政前台"],
  ["GRT095","王爱云","人事行政部","后勤助理"],
  ["GRT004","戴晓燕","事业一部","高级销售经理"],
  ["GRT005","金晓锋","事业一部","制造质量经理"],
  ["GRT022","李大鹏","事业一部","电气工程师"],
  ["GRT063","刘健康","事业一部","销售与项目工程师"],
  ["GRT020","张洵","事业一部","采购与项目工程师"],
  ["GRT057","滕顺英","事业一部","采购与项目工程师"],
  ["GRT043","韩保程","事业一部","销售与项目工程师"],
  ["GRT093","李柯瑶","事业一部","销售与项目工程师"],
  ["GRT104","董纾雨","事业一部","销售与项目工程师"],
  ["GRT030","匡凯旋","事业一部","售后服务主管"],
  ["GRT014","廉龙海","事业一部","售后技工"],
  ["GRT028","朱明华","事业一部","售后技工"],
  ["GRT040","曾春贵","事业一部","售后技工"],
  ["GRT015","杜显文","事业一部","电气班组副班长"],
  ["GRT046","吕雪冬","事业一部","电气班组班长"],
  ["GRT087","梅奥杰","事业一部","助理电气工程师"],
  ["GRT088","高嘉义","事业一部","助理电气工程师"],
  ["GRT090","陈加丽","事业一部","助理机械研发工程师"],
  ["GRT010","吴卫成","事业一部","机械装配"],
  ["GRT016","曹庆伟","事业一部","机械装配"],

  ["GRT039","侯德朋","事业一部","机械装配"],
  ["GRT041","张良","事业一部","机械装配"],
  ["GRT052","赵强","事业一部","机械装配"],
  ["GRT059","焦斌","事业一部","机械装配"],
  ["GRT079","阎建华","事业一部","机械装配"],
  ["GRT031","沈龙翔","事业一部","电气装配"],
  ["GRT036","韩品来","事业一部","电气装配"],
  ["GRT051","崔聪聪","事业一部","电气装配"],
  ["GRT071","刘琛杨","事业一部","电气装配"],
  ["GRT072","赵铖杰","事业一部","电气装配"],
  ["GRT017","田坪珍","事业一部","焊工"],
  ["GRT082","沈富高","事业一部","焊工"],
  ["GRT064","强兵兵","事业一部","激光切割"],
  ["GRT061","李明遂","事业一部","数控车工"],
  ["GRT047","嵇国华","事业一部","协作辅助"],
  ["GRT094","徐树奎","事业二部","事业二部经理"],
  ["GRT006","洪香龙","事业二部","机械设计经理"],
  ["GRT044","洪小东","事业二部","机械研发工程师"],
  ["GRT097","钱佳奇","事业二部","电气工程师"],
  ["GRT065","蔡瑞","事业二部","机械研发工程师"],
  ["GRT099","殷金刚","事业二部","机械研发工程师"],
  ["GRT038","马林山","事业二部","装配班组长"],
  ["GRT074","王金涛","事业二部","机械装配"],
  ["GRT058","周辉","事业三部","事业三部经理"],
  ["GRT007","孙坚","事业三部","电气主管"],
  ["GRT055","沈迎凤","事业三部","采购经理"],
  ["GRT003","倪亚琴","事业三部","采购与项目工程师"],
  ["GRT019","冯艳","事业三部","销售与项目工程师"],
  ["GRT035","王志强","事业三部","销售与项目工程师"],
  ["GRT089","罗小玲","事业三部","助理机械研发工程师"],
  ["GRT013","孙淼","事业三部","机械装配"],
  ["GRT021","张松松","事业三部","机械装配"],
  ["GRT025","肖博雅","事业三部","机械装配"],
  ["GRT032","王犇","事业三部","机械装配"],
  ["GRT034","王勇","事业三部","机械装配"],
  ["GRT042","刘建年","事业三部","机械装配"],
  ["GRT050","蕾翠林","事业三部","机械装配"],
  ["GRT060","杨会龙","事业三部","机械装配"],
  ["GRT075","胡绍杰","事业三部","机械装配"],
  ["GRT076","王森","事业三部","机械装配"],
  ["GRT077","吴阳洋","事业三部","机械装配"],
  ["GRT084","蒋秋瑞","事业三部","机械装配"],
  ["GRT023","杨之雲","事业三部","电气装配"],
  ["GRT029","殷小勇","事业三部","电气装配"],
  ["GRT056","陈成成","事业三部","焊工"],
  ["GRT037","黄潇潇","事业三部","文员"],
  ["GRT018","孙国祥","事业四部","电气工程师"],
  ["GRT024","张腾飞","事业四部","机加工班组长"],
  ["GRT008","马柯","事业十部","质量专员"],
  ["GRT009","史龙昌","事业十部","激光切作班组长"],
  ["GRT011","张超","事业十部","激光"],
  ["GRT012","李兴伟","事业十部","冷作"],
  ["GRT068","李亚超","事业十部","CNC操作工"],
  ["GRT069","李鹏飞","事业十部","数控车工"],
  ["GRT073","范威","事业十部","CNC操作工"],
  ["GRT102","张飞","事业十部","机加工铣工"],
  ["GRT045","杨勇","事业三部","生产工程师兼项目经理"],
  ["GRT081","马康风","财务部","供应链助理工程师"],
];

// ─── 重新配置所有员工（用真实花名册，不依赖hrm_employees） ────

export async function reprovisionAllEmployees(): Promise<ProvisionResult> {
  const db = await requireDb();
  const result: ProvisionResult = { created: 0, skipped: 0, errors: [] };

  try {
    // 1. 清除所有旧助理记录
    await db.delete(employeeAiAssistants).where(sql`1=1`);

    // 2. 先尝试从hrm_employees匹配ID，匹配不到则用序号
    const hrmRows = await db.select({ id: hrmEmployees.id, employeeCode: hrmEmployees.employeeCode })
      .from(hrmEmployees).limit(1000);
    const codeToId = new Map<string, number>();
    for (const r of hrmRows) codeToId.set(r.employeeCode, r.id);

    // 3. 为每个真实员工构建记录
    const insertValues = [];
    let fallbackId = 90000;
    for (const [code, name, dept, position] of GRT_REAL_ROSTER) {
      try {
        const empId = codeToId.get(code) ?? ++fallbackId;
        const roleId = mapPositionToRole(position, dept);
        if (roleId === "guest") { result.skipped++; continue; }
        const preset = getPresetByRole(roleId);
        const ctx: PromptContext = {
          ownerName: name,
          ownerCode: code,
          department: dept,
          position: position,
          roleDescription: ROLE_DESCRIPTIONS[roleId] || "\u65E5\u5E38\u5DE5\u4F5C\u4EFB\u52A1\u6267\u884C",
        };
        insertValues.push({
          employeeId: empId,
          assistantCode: generateAssistantCode(code),
          assistantName: generateAssistantName(name),
          assistantType: preset.assistantType as any,
          personalityConfig: buildPersonalityConfig(roleId, ctx),
          knowledgeDomains: JSON.stringify(preset.knowledgeDomains),
          status: "active" as const,
        });
      } catch (err: any) {
        result.errors.push(`${name}(${code}): ${err.message}`);
      }
    }

    // 4. 批量写入
    const BATCH_SIZE = 100;
    for (let i = 0; i < insertValues.length; i += BATCH_SIZE) {
      await db.insert(employeeAiAssistants).values(insertValues.slice(i, i + BATCH_SIZE));
    }

    result.created = insertValues.length;
    result.skipped += GRT_REAL_ROSTER.length - insertValues.length - result.skipped;
  } catch (err: any) {
    result.errors.push(`\u91CD\u65B0\u914D\u7F6E\u5931\u8D25: ${err.message}`);
  }

  return result;
}

// ─── 为单个员工配置 ──────────────────────────────────────

export async function provisionSingleEmployee(employeeId: number): Promise<ProvisionResult> {
  const db = await requireDb();
  const result: ProvisionResult = { created: 0, skipped: 0, errors: [] };

  try {
    // 查询员工
    const [emp] = await db
      .select({
        id: hrmEmployees.id,
        employeeCode: hrmEmployees.employeeCode,
        name: hrmEmployees.name,
        department: hrmEmployees.department,
        position: hrmEmployees.position,
        level: hrmEmployees.level,
        status: hrmEmployees.status,
      })
      .from(hrmEmployees)
      .where(eq(hrmEmployees.id, employeeId))
      .limit(1);

    if (!emp) {
      result.errors.push(`员工ID ${employeeId} 不存在`);
      return result;
    }

    // 检查是否已有助理
    const [existing] = await db
      .select({ id: employeeAiAssistants.id })
      .from(employeeAiAssistants)
      .where(eq(employeeAiAssistants.employeeId, employeeId))
      .limit(1);

    if (existing) {
      // 已存在则更新配置
      const roleId = mapPositionToRole(emp.position, emp.department);
      const preset = getPresetByRole(roleId);
      const ctx: PromptContext = {
        ownerName: emp.name,
        ownerCode: emp.employeeCode,
        department: emp.department,
        position: emp.position,
        roleDescription: ROLE_DESCRIPTIONS[roleId] || "日常工作任务执行",
      };

      await db
        .update(employeeAiAssistants)
        .set({
          assistantName: generateAssistantName(emp.name),
          assistantType: preset.assistantType as any,
          personalityConfig: buildPersonalityConfig(roleId, ctx),
          knowledgeDomains: JSON.stringify(preset.knowledgeDomains),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(employeeAiAssistants.id, existing.id));

      result.skipped = 1; // updated, not new
      return result;
    }

    // 创建新助理
    const roleId = mapPositionToRole(emp.position, emp.department);
    const preset = getPresetByRole(roleId);
    const ctx: PromptContext = {
      ownerName: emp.name,
      ownerCode: emp.employeeCode,
      department: emp.department,
      position: emp.position,
      roleDescription: ROLE_DESCRIPTIONS[roleId] || "日常工作任务执行",
    };

    await db.insert(employeeAiAssistants).values({
      employeeId: emp.id,
      assistantCode: generateAssistantCode(emp.employeeCode),
      assistantName: generateAssistantName(emp.name),
      assistantType: preset.assistantType as any,
      personalityConfig: buildPersonalityConfig(roleId, ctx),
      knowledgeDomains: JSON.stringify(preset.knowledgeDomains),
      status: "active" as const,
    });

    result.created = 1;
  } catch (err: any) {
    result.errors.push(err.message);
  }

  return result;
}

// ─── 按角色刷新所有助理的系统提示词 ──────────────────────

export async function refreshPresetsByRole(roleId?: string): Promise<ProvisionResult> {
  const db = await requireDb();
  const result: ProvisionResult = { created: 0, skipped: 0, errors: [] };

  try {
    // 查询所有有AI助理的员工
    const rows = await db
      .select({
        assistantId: employeeAiAssistants.id,
        employeeId: employeeAiAssistants.employeeId,
        personalityConfig: employeeAiAssistants.personalityConfig,
        empName: hrmEmployees.name,
        empCode: hrmEmployees.employeeCode,
        empDept: hrmEmployees.department,
        empPosition: hrmEmployees.position,
      })
      .from(employeeAiAssistants)
      .innerJoin(hrmEmployees, eq(hrmEmployees.id, employeeAiAssistants.employeeId));

    for (const row of rows) {
      try {
        const currentRoleId = mapPositionToRole(row.empPosition, row.empDept);

        // 如果指定了roleId过滤，只刷新匹配的
        if (roleId && currentRoleId !== roleId) {
          result.skipped++;
          continue;
        }

        const preset = getPresetByRole(currentRoleId);
        const ctx: PromptContext = {
          ownerName: row.empName,
          ownerCode: row.empCode,
          department: row.empDept,
          position: row.empPosition,
          roleDescription: ROLE_DESCRIPTIONS[currentRoleId] || "日常工作任务执行",
        };

        await db
          .update(employeeAiAssistants)
          .set({
            assistantType: preset.assistantType as any,
            personalityConfig: buildPersonalityConfig(currentRoleId, ctx),
            knowledgeDomains: JSON.stringify(preset.knowledgeDomains),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(employeeAiAssistants.id, row.assistantId));

        result.created++; // reusing 'created' as 'refreshed'
      } catch (err: any) {
        result.errors.push(`助理${row.assistantId}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(err.message);
  }

  return result;
}

// ─── 配置状态概览 ───────────────────────────────────────

export async function getProvisioningStatus(): Promise<ProvisioningStatus> {
  const db = await requireDb();

  // 所有在职员工
  const employees = await db
    .select({
      id: hrmEmployees.id,
      department: hrmEmployees.department,
    })
    .from(hrmEmployees)
    .where(
      or(
        eq(hrmEmployees.status, "regular"),
        eq(hrmEmployees.status, "probation"),
      )
    )
    .limit(1000);

  // 所有已配置的助理
  const assistants = await db
    .select({
      employeeId: employeeAiAssistants.employeeId,
    })
    .from(employeeAiAssistants)
    .where(eq(employeeAiAssistants.status, "active"))
    .limit(1000);

  const provisionedSet = new Set(assistants.map((a) => a.employeeId));

  // 按部门统计
  const byDepartment: Record<string, { total: number; provisioned: number }> = {};
  for (const emp of employees) {
    const dept = emp.department || "未分配";
    if (!byDepartment[dept]) {
      byDepartment[dept] = { total: 0, provisioned: 0 };
    }
    byDepartment[dept].total++;
    if (provisionedSet.has(emp.id)) {
      byDepartment[dept].provisioned++;
    }
  }

  return {
    totalEmployees: employees.length,
    provisionedCount: assistants.length,
    pendingCount: employees.length - assistants.length,
    byDepartment,
  };
}

// ─── 列表查询（JOIN员工表） ──────────────────────────────

export async function listAllAssistants(params?: {
  department?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  let query = db
    .select({
      id: employeeAiAssistants.id,
      employeeId: employeeAiAssistants.employeeId,
      assistantCode: employeeAiAssistants.assistantCode,
      assistantName: employeeAiAssistants.assistantName,
      assistantType: employeeAiAssistants.assistantType,
      personalityConfig: employeeAiAssistants.personalityConfig,
      status: employeeAiAssistants.status,
      lastActiveAt: employeeAiAssistants.lastActiveAt,
      createdAt: employeeAiAssistants.createdAt,
      empName: hrmEmployees.name,
      empCode: hrmEmployees.employeeCode,
      empDept: hrmEmployees.department,
      empPosition: hrmEmployees.position,
    })
    .from(employeeAiAssistants)
    .leftJoin(hrmEmployees, eq(hrmEmployees.id, employeeAiAssistants.employeeId))
    .orderBy(desc(employeeAiAssistants.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = await query;

  // 客户端过滤（Drizzle动态where拼接限制）
  let filtered = rows;
  if (params?.department) {
    filtered = filtered.filter((r) => r.empDept === params.department);
  }
  if (params?.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.empName?.toLowerCase().includes(s) ||
        r.empCode?.toLowerCase().includes(s) ||
        r.assistantName?.toLowerCase().includes(s)
    );
  }

  // 解析 personalityConfig 获取 roleId
  const items = filtered.map((r) => {
    let rolePreset = "employee";
    try {
      if (r.personalityConfig) {
        const cfg = JSON.parse(r.personalityConfig);
        rolePreset = cfg.roleId || "employee";
      }
    } catch {}
    return {
      ...r,
      rolePreset,
    };
  });

  return { items, total: items.length };
}

// ─── Context Builder（给sendMessage增强用） ───────────────

export async function buildOwnerContext(
  employeeId: number,
  config: any,
): Promise<string> {
  const db = await requireDb();
  const sections: string[] = [];

  // 1. 最近5条会议记录
  try {
    const recentMeetings = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        startTime: meetings.startTime,
        status: meetings.status,
        description: meetings.description,
      })
      .from(meetings)
      .where(eq(meetings.createdBy, employeeId))
      .orderBy(desc(meetings.startTime))
      .limit(5);

    if (recentMeetings.length > 0) {
      const meetingLines = recentMeetings.map(
        (m) => `- [${m.startTime?.slice(0, 10) || "未知"}] ${m.title}（${m.status}）`
      );
      sections.push(`【最近会议】\n${meetingLines.join("\n")}`);
    }
  } catch {
    // meetings table may not exist — skip silently
  }

  // 2. 当前活跃任务
  try {
    const activeTasks = await db
      .select({
        id: projectTasks.id,
        name: projectTasks.name,
        status: projectTasks.status,
        priority: projectTasks.priority,
        plannedEndDate: projectTasks.plannedEndDate,
        completionPercent: projectTasks.completionPercent,
      })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.assigneeId, employeeId),
          or(
            eq(projectTasks.status, "in_progress" as any),
            eq(projectTasks.status, "todo" as any),
            eq(projectTasks.status, "backlog" as any),
          )
        )
      )
      .orderBy(desc(projectTasks.priority))
      .limit(10);

    if (activeTasks.length > 0) {
      const taskLines = activeTasks.map(
        (t) =>
          `- [${t.priority}/${t.status}] ${t.name} (完成度${t.completionPercent || 0}%${t.plannedEndDate ? `, 截止${t.plannedEndDate.slice(0, 10)}` : ""})`
      );
      sections.push(`【当前任务】\n${taskLines.join("\n")}`);
    }
  } catch {
    // projectTasks table may not exist — skip silently
  }

  // 3. 最新能力评估（TSDCKL）
  try {
    const [assessment] = await db
      .select()
      .from(employeeCompetenceAssessments)
      .where(eq(employeeCompetenceAssessments.employeeId, employeeId))
      .orderBy(desc(employeeCompetenceAssessments.assessedAt))
      .limit(1);

    if (assessment) {
      sections.push(
        `【TSDCKL能力评估】\n` +
          `T-技术力: ${assessment.tScore || "未评"} | ` +
          `S-软技能: ${assessment.sScore || "未评"} | ` +
          `D-设计力: ${assessment.dScore || "未评"} | ` +
          `C-沟通力: ${assessment.cScore || "未评"} | ` +
          `K-标准力: ${assessment.kScore || "未评"} | ` +
          `L-领导力: ${assessment.lScore || "未评"}`
      );
    }
  } catch {
    // competence table may not exist — skip silently
  }

  // 4. 关注领域（从config）
  if (config?.focusAreas && Array.isArray(config.focusAreas)) {
    sections.push(`【重点关注】\n${config.focusAreas.join("、")}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : "";
}
