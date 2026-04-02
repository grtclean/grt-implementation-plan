/**
 * GRT HR Competence — IATF 16949 Flat TSDCKL Assessment Schema
 * 
 * Six Competency Domains:
 *   T — Technical Power (硬核技术力)
 *   S — Soft Skills (软性通用力)
 *   D — Design & Innovation (设计与创新力)
 *   C — Communication & Collaboration (沟通协作力)
 *   K — Knowledge & Standards (专业标准力)
 *   L — Leadership & Strategy (领导与战略力)
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const employeeCompetenceAssessments = pgTable(
  "employee_competence_assessments",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull(),
    employeeName: varchar("employee_name", { length: 100 }).notNull(),
    department: varchar("department", { length: 100 }),
    position: varchar("position", { length: 100 }),
    tScore: varchar("t_score", { length: 50 }),
    sScore: varchar("s_score", { length: 50 }),
    dScore: varchar("d_score", { length: 50 }),
    cScore: varchar("c_score", { length: 50 }),
    kScore: varchar("k_score", { length: 50 }),
    lScore: varchar("l_score", { length: 50 }),
    assessedAt: timestamp("assessed_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_eca_employee").on(table.employeeId),
    index("idx_eca_department").on(table.department),
    unique("uq_eca_employee_assessed").on(table.employeeId, table.assessedAt),
  ]
);

export type EmployeeCompetenceAssessment = InferSelectModel<typeof employeeCompetenceAssessments>;
export type NewEmployeeCompetenceAssessment = InferInsertModel<typeof employeeCompetenceAssessments>;

// ══════════════════════════════════════════════════════
// Legacy detailed tables (used by seed-competency-model.ts)
// These complement the flat assessment table above with
// granular rubric definitions and per-skill tracking.
// ══════════════════════════════════════════════════════

export const competencyRubrics = pgTable(
  "competency_rubrics",
  {
    id: serial("id").primaryKey(),
    jobRole: varchar("job_role", { length: 100 }).notNull(),
    domain: varchar("domain", { length: 10 }).notNull(),
    level: integer("level").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_rubric_role_domain_level").on(table.jobRole, table.domain, table.level),
    index("idx_rubric_job_role").on(table.jobRole),
  ]
);

export const skillDictionary = pgTable(
  "skill_dictionary",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    nameZh: varchar("name_zh", { length: 200 }).notNull(),
    domain: varchar("domain", { length: 10 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    isCertifiable: boolean("is_certifiable").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_skill_domain").on(table.domain),
  ]
);

export const employeeCapabilities = pgTable(
  "employee_capabilities",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull(),
    skillId: integer("skill_id").notNull(),
    currentLevel: integer("current_level").default(1),
    targetLevel: integer("target_level").default(3),
    assessedBy: varchar("assessed_by", { length: 100 }),
    certifiedBy: varchar("certified_by", { length: 100 }),
    certificationExpiryDate: varchar("certification_expiry_date", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_emp_skill").on(table.employeeId, table.skillId),
    index("idx_emp_cap_employee").on(table.employeeId),
  ]
);

export const employeeDomainScores = pgTable(
  "employee_domain_scores",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull(),
    domain: varchar("domain", { length: 10 }).notNull(),
    currentLevel: integer("current_level").default(1),
    score: varchar("score", { length: 20 }),
    assessedBy: varchar("assessed_by", { length: 100 }),
    assessmentPeriod: varchar("assessment_period", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_emp_domain_period").on(table.employeeId, table.domain, table.assessmentPeriod),
    index("idx_eds_employee").on(table.employeeId),
  ]
);
