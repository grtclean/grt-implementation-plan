/**
 * Project management — projects, phases, gates, milestones, tasks, team, documents, statistics
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, sql } from "drizzle-orm";
import { requireDb } from "./connection";
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("db");
import {
  projects, InsertProject, Project, projectPhases,
  projectGates, InsertProjectGate, projectMilestones, InsertProjectMilestone,
  projectTasks, InsertProjectTask, projectTeamMembers, InsertProjectTeamMember,
  projectDocuments, InsertProjectDocument,
} from "../../drizzle/schema";

// ============= Project Management Functions (v1.2) =============

// --- Projects ---

export async function createProject(data: InsertProject) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate project code
    const count = await db.select({ count: sql<number>`count(*)` }).from(projects);
    const code = `PRJ${String(count[0].count + 1).padStart(6, '0')}`;
    
    const result = await db.insert(projects).values({ ...data, projectCode: code });
    return { id: result[0].insertId, projectCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create project");
    throw error;
  }
}

export async function getAllProjects() {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projects).orderBy(desc(projects.createdAt)).limit(1000);
}

export async function getProjectById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projects).set(data).where(eq(projects.id, id));
  return getProjectById(id);
}

export async function deleteProject(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projects).where(eq(projects.id, id));
  return true;
}

// --- Project Phases (M0-M12 Template) ---

export async function initDefaultProjectPhases() {
  const db = await requireDb();
  if (!db) return null;

  // Check if phases already exist
  const existing = await db.select().from(projectPhases).limit(1000);
  if (existing.length > 0) {
    return { success: false, message: "Project phases already initialized" };
  }

  const defaultPhases = [
    { phaseCode: "M0", name: "市场机会", sequence: 0, standardDuration: 14, deliverables: "市场分析报告,客户需求文档", gateChecklist: "市场规模评估,竞争分析,客户痛点确认" },
    { phaseCode: "M1", name: "立项审批", sequence: 1, standardDuration: 7, deliverables: "立项申请书,可行性分析报告", gateChecklist: "技术可行性,商业可行性,资源评估" },
    { phaseCode: "M2", name: "需求分析", sequence: 2, standardDuration: 21, deliverables: "需求规格说明书,用户故事", gateChecklist: "需求完整性,需求可追溯性,干系人确认" },
    { phaseCode: "M3", name: "概念设计", sequence: 3, standardDuration: 14, deliverables: "概念设计文档,系统架构图", gateChecklist: "设计评审通过,技术方案确认" },
    { phaseCode: "M4", name: "详细设计", sequence: 4, standardDuration: 21, deliverables: "详细设计文档,接口规格", gateChecklist: "设计评审通过,测试计划确认" },
    { phaseCode: "M5", name: "开发实施", sequence: 5, standardDuration: 60, deliverables: "源代码,单元测试报告", gateChecklist: "代码评审通过,单元测试覆盖率" },
    { phaseCode: "M6", name: "系统测试", sequence: 6, standardDuration: 21, deliverables: "测试报告,缺陷清单", gateChecklist: "测试通过率,关键缺陷修复" },
    { phaseCode: "M7", name: "用户验收", sequence: 7, standardDuration: 14, deliverables: "验收报告,用户签字", gateChecklist: "功能验收,性能验收,用户培训完成" },
    { phaseCode: "M8", name: "试运行", sequence: 8, standardDuration: 30, deliverables: "试运行报告,问题清单", gateChecklist: "系统稳定性,用户反馈处理" },
    { phaseCode: "M9", name: "正式上线", sequence: 9, standardDuration: 7, deliverables: "上线报告,运维文档", gateChecklist: "上线检查清单,回滚方案确认" },
    { phaseCode: "M10", name: "运维支持", sequence: 10, standardDuration: 90, deliverables: "运维报告,SLA达成情况", gateChecklist: "系统可用性,问题响应时间" },
    { phaseCode: "M11", name: "项目总结", sequence: 11, standardDuration: 7, deliverables: "项目总结报告,经验教训", gateChecklist: "项目目标达成,成本控制,客户满意度" },
    { phaseCode: "M12", name: "项目关闭", sequence: 12, standardDuration: 3, deliverables: "项目关闭报告,资料归档", gateChecklist: "文档归档完成,资源释放,财务结算" },
  ];

  for (const phase of defaultPhases) {
    await db.insert(projectPhases).values(phase);
  }

  return { success: true, message: "Default project phases initialized" };
}

export async function getAllProjectPhases() {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectPhases).orderBy(projectPhases.sequence).limit(1000);
}

// --- Project Gates ---

export async function createProjectGate(data: InsertProjectGate) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectGates).values(data);
  return { id: result[0].insertId };
}

export async function getProjectGates(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectGates).where(eq(projectGates.projectId, projectId)).limit(1000);
}

export async function updateProjectGate(id: number, data: Partial<InsertProjectGate>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projectGates).set(data).where(eq(projectGates.id, id));
  const result = await db.select().from(projectGates).where(eq(projectGates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Initialize gates for a new project
export async function initProjectGates(projectId: number) {
  const db = await requireDb();
  if (!db) return null;

  const phases = await getAllProjectPhases();
  if (phases.length === 0) {
    await initDefaultProjectPhases();
  }

  const allPhases = await getAllProjectPhases();
  for (const phase of allPhases) {
    await db.insert(projectGates).values({
      projectId,
      phaseCode: phase.phaseCode,
      name: phase.name || `Gate ${phase.phaseCode}`,
      status: "pending",
    });
  }

  return { success: true, message: `Initialized ${allPhases.length} gates for project` };
}

// --- Project Milestones ---

export async function createProjectMilestone(data: InsertProjectMilestone) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectMilestones).values(data);
  return { id: result[0].insertId };
}

export async function getProjectMilestones(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectMilestones).where(eq(projectMilestones.projectId, projectId)).limit(1000);
}

export async function updateProjectMilestone(id: number, data: Partial<InsertProjectMilestone>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projectMilestones).set(data).where(eq(projectMilestones.id, id));
  const result = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteProjectMilestone(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectMilestones).where(eq(projectMilestones.id, id));
  return true;
}

// --- Project Tasks ---

export async function createProjectTask(data: InsertProjectTask) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectTasks).values(data);
  return { id: result[0].insertId };
}

export async function getProjectTasks(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)).limit(1000);
}

export async function updateProjectTask(id: number, data: Partial<InsertProjectTask>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projectTasks).set(data).where(eq(projectTasks.id, id));
  const result = await db.select().from(projectTasks).where(eq(projectTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteProjectTask(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectTasks).where(eq(projectTasks.id, id));
  return true;
}

// --- Project Team Members ---

export async function addProjectTeamMember(data: InsertProjectTeamMember) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectTeamMembers).values(data);
  return { id: result[0].insertId };
}

export async function getProjectTeamMembers(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectTeamMembers).where(eq(projectTeamMembers.projectId, projectId)).limit(1000);
}

export async function removeProjectTeamMember(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, id));
  return true;
}

// --- Project Documents ---

export async function createProjectDocument(data: InsertProjectDocument) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectDocuments).values(data);
  return { id: result[0].insertId };
}

export async function getProjectDocuments(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectDocuments).where(eq(projectDocuments.projectId, projectId)).limit(1000);
}

export async function deleteProjectDocument(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectDocuments).where(eq(projectDocuments.id, id));
  return true;
}

// --- Project Statistics ---

export async function getProjectStatistics() {
  const db = await requireDb();
  if (!db) return null;

  const allProjects = await db.select().from(projects).limit(1000);

  const stats = {
    total: allProjects.length,
    byStatus: {
      planning: allProjects.filter(p => p.status === "draft").length,
      active: allProjects.filter(p => p.status === "active").length,
      on_hold: allProjects.filter(p => p.status === "on_hold").length,
      completed: allProjects.filter(p => p.status === "completed").length,
      cancelled: allProjects.filter(p => p.status === "cancelled").length,
    },
    byType: {
      standard: allProjects.filter(p => p.type === "standard").length,
      key: allProjects.filter(p => p.type === "key").length,
      strategic: allProjects.filter(p => p.type === "strategic").length,
    },
    totalBudget: allProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
    totalActualCost: allProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0),
  };

  return stats;
}
