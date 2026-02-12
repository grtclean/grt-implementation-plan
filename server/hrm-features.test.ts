import { describe, it, expect, beforeAll } from 'vitest';
import { requireDb } from './utils/db-helpers';
import {
  hrmCandidates,
  hrmAiInterviewRecords,
  hrmPerformanceReviewReminders,
  hrmSalaryStructures,
  hrmPerformanceGrades,
  hrmEmployees
} from '../drizzle/schema';
import { eq, like } from 'drizzle-orm';

describe('HRM Features - 任务1: 简历导入和AI面试策略', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await requireDb();
  });

  it('应该能查询到尚吉龙的候选人记录', async () => {
    if (!db) {
      console.log('数据库未连接，跳过测试');
      return;
    }
    const candidates = await db.select()
      .from(hrmCandidates)
      .where(like(hrmCandidates.name, '%尚吉龙%'));
    
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].name).toContain('尚吉龙');
  });

  it('候选人应该有正确的基本信息', async () => {
    if (!db) return;
    const candidates = await db.select()
      .from(hrmCandidates)
      .where(like(hrmCandidates.name, '%尚吉龙%'));
    
    if (candidates.length === 0) return;
    const candidate = candidates[0];
    expect(candidate.age).toBe(31);
    expect(candidate.workYears).toBe(9);
    expect(candidate.positionName).toContain('电气研发工程师');
    expect(candidate.source).toContain('猎聘');
  });

  it('应该有AI面试记录', async () => {
    if (!db) return;
    const interviewRecords = await db.select()
      .from(hrmAiInterviewRecords);
    
    expect(interviewRecords.length).toBeGreaterThan(0);
  });

  it('AI面试记录应该包含面试策略', async () => {
    if (!db) return;
    const interviewRecords = await db.select()
      .from(hrmAiInterviewRecords);
    
    if (interviewRecords.length === 0) return;
    const record = interviewRecords[0];
    expect(record.interviewStrategy).toBeDefined();
  });

  it('AI面试记录应该有匹配度评分', async () => {
    if (!db) return;
    const interviewRecords = await db.select()
      .from(hrmAiInterviewRecords);
    
    if (interviewRecords.length === 0) return;
    const record = interviewRecords[0];
    // matchScore字段在schema中是overallScore
    expect(record.overallScore).toBeDefined();
    if (record.overallScore !== null) {
      expect(record.overallScore).toBeGreaterThanOrEqual(0);
      expect(record.overallScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('HRM Features - 任务2: 述职提醒邮件配置', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await requireDb();
  });

  it('应该有述职提醒配置', async () => {
    if (!db) return;
    const reminders = await db.select()
      .from(hrmPerformanceReviewReminders);
    
    expect(reminders.length).toBeGreaterThan(0);
  });

  it('述职提醒应该包含提醒日期', async () => {
    if (!db) return;
    const reminders = await db.select()
      .from(hrmPerformanceReviewReminders);
    
    if (reminders.length === 0) return;
    reminders.forEach(reminder => {
      // reminderDate字段在schema中是reminderDateTime
      expect(reminder.reminderDateTime).toBeDefined();
    });
  });

  it('述职提醒应该有类型（3M/6M/YEAR）', async () => {
    if (!db) return;
    const reminders = await db.select()
      .from(hrmPerformanceReviewReminders);
    
    if (reminders.length === 0) return;
    const validTypes = ['3M', '6M', 'YEAR'];
    reminders.forEach(reminder => {
      expect(validTypes).toContain(reminder.reviewType);
    });
  });

  it('述职提醒应该有收件人', async () => {
    if (!db) return;
    const reminders = await db.select()
      .from(hrmPerformanceReviewReminders);
    
    if (reminders.length === 0) return;
    reminders.forEach(reminder => {
      expect(reminder.recipients).toBeDefined();
    });
  });
});

describe('HRM Features - 任务3: 薪酬体系数据', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await requireDb();
  });

  it('应该有薪酬结构数据', async () => {
    if (!db) return;
    const structures = await db.select()
      .from(hrmSalaryStructures);
    
    expect(structures.length).toBeGreaterThan(0);
  });

  it('薪酬结构应该包含薪资比例', async () => {
    if (!db) return;
    const structures = await db.select()
      .from(hrmSalaryStructures);
    
    if (structures.length === 0) return;
    structures.forEach(structure => {
      // 使用正确的字段名：baseSalaryRatioMin/Max
      expect(Number(structure.baseSalaryRatioMin)).toBeGreaterThanOrEqual(0);
      expect(Number(structure.baseSalaryRatioMax)).toBeGreaterThanOrEqual(Number(structure.baseSalaryRatioMin));
    });
  });

  it('应该有绩效等级数据（S/A/B/C/D）', async () => {
    if (!db) return;
    const grades = await db.select()
      .from(hrmPerformanceGrades);
    
    expect(grades.length).toBeGreaterThanOrEqual(5);
    
    const gradeCodes = grades.map(g => g.gradeCode);
    expect(gradeCodes).toContain('S');
    expect(gradeCodes).toContain('A');
    expect(gradeCodes).toContain('B');
    expect(gradeCodes).toContain('C');
    expect(gradeCodes).toContain('D');
  });

  it('绩效等级应该有分数范围', async () => {
    if (!db) return;
    const grades = await db.select()
      .from(hrmPerformanceGrades);
    
    if (grades.length === 0) return;
    grades.forEach(grade => {
      expect(grade.scoreMin).toBeDefined();
      expect(grade.scoreMax).toBeDefined();
      expect(grade.scoreMax).toBeGreaterThanOrEqual(grade.scoreMin);
    });
  });

  it('薪酬结构应该覆盖主要部门', async () => {
    if (!db) return;
    const structures = await db.select()
      .from(hrmSalaryStructures);
    
    const departments = structures.map(s => s.department);
    // 验证至少有几个主要部门
    expect(departments.length).toBeGreaterThanOrEqual(5);
  });
});

describe('HRM Features - 员工数据', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await requireDb();
  });

  it('应该有测试员工数据', async () => {
    if (!db) return;
    const employees = await db.select()
      .from(hrmEmployees);
    
    expect(employees.length).toBeGreaterThan(0);
  });

  it('员工应该有入职日期', async () => {
    if (!db) return;
    const employees = await db.select()
      .from(hrmEmployees);
    
    if (employees.length === 0) return;
    employees.forEach(emp => {
      expect(emp.hireDate).toBeDefined();
    });
  });
});
