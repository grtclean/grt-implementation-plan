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
