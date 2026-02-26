/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          GRT SYSTEM — RBAC Permission Seed Script               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                ║
 * ║  Seeds the complete RBAC permission system:                    ║
 * ║  • 278 discrete permissions across 16 business modules         ║
 * ║  • 14 organizational roles (alongside existing tiger-team)     ║
 * ║  • ~1000 role-permission mappings from authorization matrix    ║
 * ║                                                                ║
 * ║  Idempotent: safe to run multiple times (skip-if-exists).      ║
 * ║  Run:  npx tsx server/seed-rbac-permissions.ts                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { roles, permissions, rolePermissions } from "../drizzle/permission-schema";

// ── Permission Definitions ──────────────────────────────

interface PermDef {
  code: string;
  name: string;
  category: string;
  module: string;
  action: string;
  level: number; // 1=basic, 2=intermediate, 3=advanced, 4=admin
}

const PERMISSIONS: PermDef[] = [
  // ── 1. SYSTEM ADMINISTRATION (26) ──
  { code: "system:users:view", name: "View user list and profiles", category: "system", module: "system", action: "view", level: 4 },
  { code: "system:users:create", name: "Create new user accounts", category: "system", module: "system", action: "create", level: 4 },
  { code: "system:users:edit", name: "Edit user profiles and status", category: "system", module: "system", action: "edit", level: 4 },
  { code: "system:users:delete", name: "Deactivate/delete user accounts", category: "system", module: "system", action: "delete", level: 4 },
  { code: "system:roles:manage", name: "Create/edit/delete roles", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:permissions:assign", name: "Assign permissions to roles/users", category: "system", module: "system", action: "assign", level: 4 },
  { code: "system:permissions:blacklist", name: "Manage permission blacklist", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:permissions:temporary", name: "Grant temporary permissions", category: "system", module: "system", action: "create", level: 4 },
  { code: "system:audit:view", name: "View audit logs", category: "system", module: "system", action: "view", level: 3 },
  { code: "system:menu:manage", name: "Manage navigation menu structure", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:org:manage", name: "Manage organization structure", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:scheduler:view", name: "View scheduled jobs", category: "system", module: "system", action: "view", level: 3 },
  { code: "system:scheduler:manage", name: "Create/edit/trigger scheduled jobs", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:security:dashboard", name: "Access security dashboard", category: "system", module: "system", action: "view", level: 3 },
  { code: "system:compliance:view", name: "View compliance dashboard", category: "system", module: "system", action: "view", level: 2 },
  { code: "system:compliance:manage", name: "Manage compliance calendar", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:errors:view", name: "View error logs", category: "system", module: "system", action: "view", level: 3 },
  { code: "system:webhooks:manage", name: "Manage webhook configurations", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:notifications:config", name: "Configure notification channels", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:erp:config", name: "Configure ERP integration", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:deployment:manage", name: "System deployment operations", category: "system", module: "system", action: "execute", level: 4 },
  { code: "system:monitoring:view", name: "View system monitoring dashboard", category: "system", module: "system", action: "view", level: 3 },
  { code: "system:naming:manage", name: "Manage naming rules", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:data:migrate", name: "Execute data migrations", category: "system", module: "system", action: "execute", level: 4 },
  { code: "system:dingtalk:config", name: "Configure DingTalk integration", category: "system", module: "system", action: "manage", level: 4 },
  { code: "system:microsoft:config", name: "Configure Microsoft Graph settings", category: "system", module: "system", action: "manage", level: 4 },

  // ── 2. SALES & CRM (21) ──
  { code: "crm:customers:view", name: "View customer records", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:customers:create", name: "Create new customers", category: "crm", module: "crm", action: "create", level: 2 },
  { code: "crm:customers:edit", name: "Edit customer information", category: "crm", module: "crm", action: "edit", level: 2 },
  { code: "crm:customers:delete", name: "Delete customer records", category: "crm", module: "crm", action: "delete", level: 3 },
  { code: "crm:opportunities:view", name: "View sales opportunities", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:opportunities:manage", name: "Create/edit opportunities", category: "crm", module: "crm", action: "manage", level: 2 },
  { code: "crm:contacts:view", name: "View contacts", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:contacts:manage", name: "Create/edit contacts", category: "crm", module: "crm", action: "manage", level: 2 },
  { code: "crm:leads:view", name: "View lead pipeline", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:leads:manage", name: "Create/convert/edit leads", category: "crm", module: "crm", action: "manage", level: 2 },
  { code: "crm:quotations:view", name: "View quotations", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:quotations:create", name: "Create new quotations", category: "crm", module: "crm", action: "create", level: 2 },
  { code: "crm:quotations:approve", name: "Approve/reject quotations", category: "crm", module: "crm", action: "approve", level: 3 },
  { code: "crm:contracts:view", name: "View contracts", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:contracts:manage", name: "Create/edit contracts", category: "crm", module: "crm", action: "manage", level: 3 },
  { code: "crm:nda:manage", name: "Manage NDA/NPA documents", category: "crm", module: "crm", action: "manage", level: 3 },
  { code: "crm:materials:view", name: "View sales materials library", category: "crm", module: "crm", action: "view", level: 1 },
  { code: "crm:analytics:view", name: "View sales analytics", category: "crm", module: "crm", action: "view", level: 2 },
  { code: "crm:forecast:view", name: "View AI sales forecast", category: "crm", module: "crm", action: "view", level: 3 },
  { code: "crm:churn:view", name: "View customer churn predictions", category: "crm", module: "crm", action: "view", level: 3 },
  { code: "crm:portal:access", name: "Access customer portal", category: "crm", module: "crm", action: "view", level: 1 },

  // ── 3. R&D DESIGN (20) ──
  { code: "rnd:requirements:view", name: "View requirements", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:requirements:manage", name: "Create/edit requirements", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:solutions:view", name: "View solution designs", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:solutions:manage", name: "Create/edit solution designs", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:mechanical:view", name: "View mechanical designs", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:mechanical:manage", name: "Create/edit mechanical designs", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:electrical:view", name: "View electrical designs", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:electrical:manage", name: "Create/edit electrical designs", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:bom:view", name: "View BOM structures", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:bom:manage", name: "Create/edit/import BOM", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:bom:verify", name: "Run BOM verification", category: "rnd", module: "rnd", action: "execute", level: 2 },
  { code: "rnd:bom:freeze", name: "Freeze BOM for production", category: "rnd", module: "rnd", action: "approve", level: 3 },
  { code: "rnd:plm:access", name: "Access PLM workbench", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:documents:view", name: "View technical documents", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:documents:manage", name: "Upload/edit tech documents", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:vault:access", name: "Access project vault", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:drawings:view", name: "View drawing library", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:drawings:manage", name: "Upload/manage drawings", category: "rnd", module: "rnd", action: "manage", level: 2 },
  { code: "rnd:3d:view", name: "View 3D models", category: "rnd", module: "rnd", action: "view", level: 1 },
  { code: "rnd:eco:review", name: "Review ECO cost impact", category: "rnd", module: "rnd", action: "approve", level: 3 },
  { code: "rnd:digital-twin:view", name: "View digital twin hub", category: "rnd", module: "rnd", action: "view", level: 1 },

  // ── 4. PROJECT MANAGEMENT (20) ──
  { code: "project:list:view", name: "View project list", category: "project", module: "project", action: "view", level: 1 },
  { code: "project:create", name: "Create new projects", category: "project", module: "project", action: "create", level: 2 },
  { code: "project:edit", name: "Edit project details", category: "project", module: "project", action: "edit", level: 2 },
  { code: "project:delete", name: "Delete/archive projects", category: "project", module: "project", action: "delete", level: 4 },
  { code: "project:stage-gate:view", name: "View stage gate status", category: "project", module: "project", action: "view", level: 1 },
  { code: "project:stage-gate:manage", name: "Manage stage gate transitions", category: "project", module: "project", action: "execute", level: 3 },
  { code: "project:m1:manage", name: "Manage M1 kickoff", category: "project", module: "project", action: "execute", level: 3 },
  { code: "project:m7m9:manage", name: "Manage M7-M9 delivery tracking", category: "project", module: "project", action: "execute", level: 3 },
  { code: "project:tasks:view", name: "View project tasks (Kanban)", category: "project", module: "project", action: "view", level: 1 },
  { code: "project:tasks:manage", name: "Create/edit/assign tasks", category: "project", module: "project", action: "manage", level: 2 },
  { code: "project:gantt:view", name: "View Gantt chart", category: "project", module: "project", action: "view", level: 1 },
  { code: "project:risks:view", name: "View risk register", category: "project", module: "project", action: "view", level: 1 },
  { code: "project:risks:manage", name: "Create/edit/mitigate risks", category: "project", module: "project", action: "manage", level: 2 },
  { code: "project:sop:view", name: "View SOP library", category: "project", module: "project", action: "view", level: 1 },
  { code: "project:sop:manage", name: "Create/edit SOPs", category: "project", module: "project", action: "manage", level: 2 },
  { code: "project:documents:manage", name: "Manage phase documents", category: "project", module: "project", action: "manage", level: 2 },
  { code: "project:delivery:manage", name: "Manage deliverables", category: "project", module: "project", action: "manage", level: 2 },
  { code: "project:certification:manage", name: "Manage regional certifications", category: "project", module: "project", action: "manage", level: 3 },
  { code: "project:compliance:manage", name: "Manage equipment compliance", category: "project", module: "project", action: "manage", level: 3 },
  { code: "project:cockpit:view", name: "View Project 360 cockpit", category: "project", module: "project", action: "view", level: 2 },

  // ── 5. MANUFACTURING (46) ──
  { code: "mfg:command:view", name: "View production command center", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:dashboard:view", name: "View production dashboard", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:process:view", name: "View process management", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:process:manage", name: "Create/edit processes", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:scheduling:view", name: "View scheduling", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:scheduling:run", name: "Execute scheduling algorithm", category: "mfg", module: "mfg", action: "execute", level: 3 },
  { code: "mfg:scheduling:dispatch", name: "Dispatch tasks to workers", category: "mfg", module: "mfg", action: "execute", level: 3 },
  { code: "mfg:steps:view", name: "View production steps", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:steps:manage", name: "Create/edit production steps", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:execution:view", name: "View production execution", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:execution:report", name: "Report work events", category: "mfg", module: "mfg", action: "create", level: 1 },
  { code: "mfg:qc:view", name: "View QC records", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:qc:manage", name: "Create/edit QC inspections", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:qc:approve", name: "Approve QC results", category: "mfg", module: "mfg", action: "approve", level: 3 },
  { code: "mfg:spc:view", name: "View SPC control charts", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:ncr:view", name: "View NCR non-conformances", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:ncr:manage", name: "Create/edit NCRs", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:interlock:manage", name: "Manage quality interlocks", category: "mfg", module: "mfg", action: "manage", level: 3 },
  { code: "mfg:ppap:manage", name: "Manage PPAP packages", category: "mfg", module: "mfg", action: "manage", level: 3 },
  { code: "mfg:fmea:view", name: "View FMEA analysis", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:fmea:manage", name: "Create/edit FMEA", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:8d:manage", name: "Manage 8D/CAPA workbench", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:msa:manage", name: "Manage MSA analysis", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:control-plan:manage", name: "Manage control plans", category: "mfg", module: "mfg", action: "manage", level: 3 },
  { code: "mfg:safety:manage", name: "Manage safety rules", category: "mfg", module: "mfg", action: "manage", level: 3 },
  { code: "mfg:materials:view", name: "View material tracking", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:materials:manage", name: "Manage material flow", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:inventory:view", name: "View inventory dashboard", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:inventory:manage", name: "Manage inventory optimization", category: "mfg", module: "mfg", action: "manage", level: 3 },
  { code: "mfg:workers:view", name: "View worker management", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:workers:manage", name: "Create/edit worker records", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:workers:import", name: "Import worker data", category: "mfg", module: "mfg", action: "execute", level: 3 },
  { code: "mfg:workers:performance", name: "View worker performance", category: "mfg", module: "mfg", action: "view", level: 2 },
  { code: "mfg:shift:manage", name: "Manage shift handover records", category: "mfg", module: "mfg", action: "manage", level: 1 },
  { code: "mfg:kiosk:access", name: "Access workshop kiosk terminal", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:machine:login", name: "Machine access login", category: "mfg", module: "mfg", action: "execute", level: 1 },
  { code: "mfg:oee:view", name: "View OEE dashboard", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:fat:manage", name: "Manage FAT coordination", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:sat:execute", name: "Execute FAT/SAT testing", category: "mfg", module: "mfg", action: "execute", level: 2 },
  { code: "mfg:uwb:view", name: "View UWB positioning data", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:uwb:manage", name: "Manage UWB devices/zones", category: "mfg", module: "mfg", action: "manage", level: 3 },
  { code: "mfg:ccd:view", name: "View CCD integration data", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:daily-report:view", name: "View production daily report", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:efficiency:view", name: "View production efficiency", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:exceptions:view", name: "View exception reports", category: "mfg", module: "mfg", action: "view", level: 1 },
  { code: "mfg:cleanliness:manage", name: "Manage cleanliness inspections", category: "mfg", module: "mfg", action: "manage", level: 2 },
  { code: "mfg:certificate:generate", name: "Generate product certificates", category: "mfg", module: "mfg", action: "execute", level: 2 },
  { code: "mfg:monthly-report:view", name: "View quality monthly report", category: "mfg", module: "mfg", action: "view", level: 2 },
  { code: "mfg:process-trials:manage", name: "Manage process trial workbench", category: "mfg", module: "mfg", action: "manage", level: 2 },

  // ── 6. SUPPLY CHAIN (15) ──
  { code: "supply:workbench:view", name: "View supply chain workbench", category: "supply", module: "supply", action: "view", level: 1 },
  { code: "supply:materials:view", name: "View material management", category: "supply", module: "supply", action: "view", level: 1 },
  { code: "supply:materials:manage", name: "Manage materials", category: "supply", module: "supply", action: "manage", level: 2 },
  { code: "supply:procurement:view", name: "View procurement", category: "supply", module: "supply", action: "view", level: 1 },
  { code: "supply:procurement:manage", name: "Create/edit procurement orders", category: "supply", module: "supply", action: "manage", level: 2 },
  { code: "supply:procurement:approve", name: "Approve procurement requests", category: "supply", module: "supply", action: "approve", level: 3 },
  { code: "supply:warehouse:view", name: "View warehouse management", category: "supply", module: "supply", action: "view", level: 1 },
  { code: "supply:warehouse:manage", name: "Manage warehouse operations", category: "supply", module: "supply", action: "manage", level: 2 },
  { code: "supply:planning:view", name: "View supply chain planning", category: "supply", module: "supply", action: "view", level: 2 },
  { code: "supply:rfq:manage", name: "Manage RFQ kanban", category: "supply", module: "supply", action: "manage", level: 2 },
  { code: "supply:spares:manage", name: "Manage spare parts", category: "supply", module: "supply", action: "manage", level: 2 },
  { code: "supply:risk:view", name: "View supplier risk radar", category: "supply", module: "supply", action: "view", level: 2 },
  { code: "supply:supplier:assess", name: "Conduct supplier assessments", category: "supply", module: "supply", action: "manage", level: 2 },
  { code: "supply:erp:view", name: "View ERP integration data", category: "supply", module: "supply", action: "view", level: 2 },
  { code: "supply:inventory:optimize", name: "Run inventory optimization", category: "supply", module: "supply", action: "execute", level: 3 },

  // ── 7. CUSTOMER SERVICE (16) ──
  { code: "service:workbench:view", name: "View after-sales workbench", category: "service", module: "service", action: "view", level: 1 },
  { code: "service:installation:manage", name: "Manage field installations", category: "service", module: "service", action: "manage", level: 2 },
  { code: "service:sat:manage", name: "Manage SAT testing", category: "service", module: "service", action: "manage", level: 2 },
  { code: "service:acceptance:manage", name: "Manage final acceptance", category: "service", module: "service", action: "manage", level: 3 },
  { code: "service:tickets:view", name: "View service tickets", category: "service", module: "service", action: "view", level: 1 },
  { code: "service:tickets:manage", name: "Create/edit service tickets", category: "service", module: "service", action: "manage", level: 2 },
  { code: "service:feedback:view", name: "View customer feedback", category: "service", module: "service", action: "view", level: 1 },
  { code: "service:feedback:manage", name: "Respond to customer feedback", category: "service", module: "service", action: "manage", level: 2 },
  { code: "service:field:dashboard", name: "Access field engineer dashboard", category: "service", module: "service", action: "view", level: 1 },
  { code: "service:diagnosis:use", name: "Use AI fault diagnosis", category: "service", module: "service", action: "execute", level: 2 },
  { code: "service:maintenance:plan", name: "Use AI maintenance planning", category: "service", module: "service", action: "execute", level: 2 },
  { code: "service:remote:assist", name: "Use AI remote assistance", category: "service", module: "service", action: "execute", level: 2 },
  { code: "service:sla:view", name: "View SLA dashboard", category: "service", module: "service", action: "view", level: 2 },
  { code: "service:nps:manage", name: "Manage NPS surveys", category: "service", module: "service", action: "manage", level: 2 },
  { code: "service:repair:portal", name: "Access customer repair portal", category: "service", module: "service", action: "view", level: 1 },
  { code: "service:kb:feedback", name: "Feed tickets to knowledge base", category: "service", module: "service", action: "execute", level: 2 },

  // ── 8. HUMAN RESOURCES (30) ──
  { code: "hr:employees:view", name: "View employee list", category: "hr", module: "hr", action: "view", level: 1 },
  { code: "hr:employees:create", name: "Create employee records", category: "hr", module: "hr", action: "create", level: 3 },
  { code: "hr:employees:edit", name: "Edit employee records", category: "hr", module: "hr", action: "edit", level: 3 },
  { code: "hr:employees:delete", name: "Deactivate employee records", category: "hr", module: "hr", action: "delete", level: 4 },
  { code: "hr:employees:import", name: "Bulk import employees", category: "hr", module: "hr", action: "execute", level: 3 },
  { code: "hr:recruitment:view", name: "View recruitment pipeline", category: "hr", module: "hr", action: "view", level: 2 },
  { code: "hr:recruitment:manage", name: "Manage recruitment", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:attendance:view", name: "View attendance records", category: "hr", module: "hr", action: "view", level: 1 },
  { code: "hr:attendance:manage", name: "Manage attendance", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:offboarding:manage", name: "Manage employee offboarding", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:lifecycle:view", name: "View HR lifecycle", category: "hr", module: "hr", action: "view", level: 2 },
  { code: "hr:performance:self", name: "View own performance", category: "hr", module: "hr", action: "view", level: 1 },
  { code: "hr:performance:team", name: "View team performance", category: "hr", module: "hr", action: "view", level: 2 },
  { code: "hr:performance:dept", name: "View department performance", category: "hr", module: "hr", action: "view", level: 2 },
  { code: "hr:performance:bu", name: "View BU performance overview", category: "hr", module: "hr", action: "view", level: 3 },
  { code: "hr:performance:manage", name: "Edit/manage KPI assignments", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:compensation:view", name: "View own compensation", category: "hr", module: "hr", action: "view", level: 1 },
  { code: "hr:compensation:manage", name: "Manage compensation records", category: "hr", module: "hr", action: "manage", level: 4 },
  { code: "hr:salary:approve", name: "Approve salary changes", category: "hr", module: "hr", action: "approve", level: 4 },
  { code: "hr:salary:report", name: "View salary reports", category: "hr", module: "hr", action: "view", level: 3 },
  { code: "hr:bonus:manage", name: "Manage bonus allocations", category: "hr", module: "hr", action: "manage", level: 4 },
  { code: "hr:delegation:manage", name: "Manage delegation settings", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:training:view", name: "View training catalog", category: "hr", module: "hr", action: "view", level: 1 },
  { code: "hr:training:manage", name: "Manage training programs", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:compliance:view", name: "View labor compliance", category: "hr", module: "hr", action: "view", level: 2 },
  { code: "hr:bu-team:manage", name: "Manage BU team composition", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:visitor:request", name: "Submit visitor requests", category: "hr", module: "hr", action: "create", level: 1 },
  { code: "hr:status:manage", name: "Manage user status", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:planning:annual", name: "Manage annual planning", category: "hr", module: "hr", action: "manage", level: 3 },
  { code: "hr:supervisor:dashboard", name: "Access supervisor workbench", category: "hr", module: "hr", action: "view", level: 2 },

  // ── 9. CAPABILITY SYSTEM (13) ──
  { code: "capability:profile:self", name: "View own capability profile", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:profile:others", name: "View others capability profiles", category: "capability", module: "capability", action: "view", level: 2 },
  { code: "capability:dashboard:view", name: "View capability dashboard", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:matrix:view", name: "View capability matrix board", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:matrix:manage", name: "Manage capability matrix", category: "capability", module: "capability", action: "manage", level: 3 },
  { code: "capability:certificates:view", name: "View certificates", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:certificates:manage", name: "Issue/revoke certificates", category: "capability", module: "capability", action: "manage", level: 3 },
  { code: "capability:badges:view", name: "View badges", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:badges:award", name: "Award badges", category: "capability", module: "capability", action: "create", level: 2 },
  { code: "capability:path:view", name: "View learning path", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:leaderboard:view", name: "View leaderboard", category: "capability", module: "capability", action: "view", level: 1 },
  { code: "capability:evidence:submit", name: "Submit evidence", category: "capability", module: "capability", action: "create", level: 1 },
  { code: "capability:evidence:review", name: "Review submitted evidence", category: "capability", module: "capability", action: "approve", level: 2 },

  // ── 10. FINANCE (15) ──
  { code: "finance:expense:view", name: "View own expense reports", category: "finance", module: "finance", action: "view", level: 1 },
  { code: "finance:expense:create", name: "Create expense reports", category: "finance", module: "finance", action: "create", level: 1 },
  { code: "finance:expense:approve", name: "Approve expense reports", category: "finance", module: "finance", action: "approve", level: 3 },
  { code: "finance:trip:view", name: "View trip requests", category: "finance", module: "finance", action: "view", level: 1 },
  { code: "finance:trip:create", name: "Create trip requests", category: "finance", module: "finance", action: "create", level: 1 },
  { code: "finance:trip:approve", name: "Approve trip requests", category: "finance", module: "finance", action: "approve", level: 3 },
  { code: "finance:travel:dashboard", name: "View travel dashboard", category: "finance", module: "finance", action: "view", level: 1 },
  { code: "finance:budget:view", name: "View budget allocations", category: "finance", module: "finance", action: "view", level: 2 },
  { code: "finance:budget:manage", name: "Manage budgets", category: "finance", module: "finance", action: "manage", level: 3 },
  { code: "finance:budget:approve", name: "Approve budget overruns", category: "finance", module: "finance", action: "approve", level: 4 },
  { code: "finance:cost:view", name: "View cost management", category: "finance", module: "finance", action: "view", level: 2 },
  { code: "finance:cost:manage", name: "Manage cost entries", category: "finance", module: "finance", action: "manage", level: 3 },
  { code: "finance:cost:standards", name: "Configure cost standards", category: "finance", module: "finance", action: "manage", level: 4 },
  { code: "finance:analytics:view", name: "View AI budget analysis", category: "finance", module: "finance", action: "view", level: 2 },
  { code: "finance:vat:calculator", name: "Use VAT calculator", category: "finance", module: "finance", action: "execute", level: 1 },

  // ── 11. AI INTELLIGENCE (24) ──
  { code: "ai:hub:access", name: "Access AI hub", category: "ai", module: "ai", action: "view", level: 1 },
  { code: "ai:assistant:chat", name: "Use AI chat assistant", category: "ai", module: "ai", action: "execute", level: 1 },
  { code: "ai:kpi:assistant", name: "Use AI KPI assistant", category: "ai", module: "ai", action: "execute", level: 2 },
  { code: "ai:purchase:assistant", name: "Use AI purchase assistant", category: "ai", module: "ai", action: "execute", level: 2 },
  { code: "ai:quality:assistant", name: "Use AI quality assistant", category: "ai", module: "ai", action: "execute", level: 2 },
  { code: "ai:service:assistant", name: "Use AI service assistant", category: "ai", module: "ai", action: "execute", level: 2 },
  { code: "ai:warning:view", name: "View AI early warnings", category: "ai", module: "ai", action: "view", level: 2 },
  { code: "ai:risk:view", name: "View AI risk predictions", category: "ai", module: "ai", action: "view", level: 2 },
  { code: "ai:rag:train", name: "Train knowledge base (RAG)", category: "ai", module: "ai", action: "execute", level: 4 },
  { code: "ai:rag:query", name: "Query knowledge base", category: "ai", module: "ai", action: "execute", level: 1 },
  { code: "ai:cases:view", name: "View historical cases", category: "ai", module: "ai", action: "view", level: 1 },
  { code: "ai:diagnostic:use", name: "Use AI diagnostic system", category: "ai", module: "ai", action: "execute", level: 2 },
  { code: "ai:effectiveness:view", name: "View AI effectiveness tracking", category: "ai", module: "ai", action: "view", level: 2 },
  { code: "ai:accuracy:admin", name: "Access AI accuracy dashboard", category: "ai", module: "ai", action: "view", level: 3 },
  { code: "ai:models:monitor", name: "Monitor model performance", category: "ai", module: "ai", action: "view", level: 3 },
  { code: "ai:models:train", name: "Schedule model training", category: "ai", module: "ai", action: "execute", level: 4 },
  { code: "ai:knowledge-graph:manage", name: "Manage knowledge graph", category: "ai", module: "ai", action: "manage", level: 4 },
  { code: "ai:genesis:access", name: "Access AI Genesis workspace", category: "ai", module: "ai", action: "view", level: 2 },
  { code: "ai:genesis:generate", name: "Generate AI proposals", category: "ai", module: "ai", action: "execute", level: 3 },
  { code: "ai:genesis:approve", name: "Approve AI-generated proposals", category: "ai", module: "ai", action: "approve", level: 3 },
  { code: "ai:agents:manage", name: "Manage AI agent fleet", category: "ai", module: "ai", action: "manage", level: 4 },
  { code: "ai:provisioning:manage", name: "Manage AI assistant provisioning", category: "ai", module: "ai", action: "manage", level: 4 },
  { code: "ai:localizer:use", name: "Use AI content localizer", category: "ai", module: "ai", action: "execute", level: 1 },
  { code: "ai:security:governance", name: "AI security & governance", category: "ai", module: "ai", action: "manage", level: 4 },

  // ── 12. AI DEVOPS (8) ──
  { code: "devops:matrix:view", name: "View dual AI collaboration matrix", category: "devops", module: "devops", action: "view", level: 1 },
  { code: "devops:concurrent:view", name: "View concurrent command center", category: "devops", module: "devops", action: "view", level: 1 },
  { code: "devops:concurrent:operate", name: "Claim/debug/mark-passed in CCC", category: "devops", module: "devops", action: "execute", level: 2 },
  { code: "devops:concurrent:approve", name: "Approve merges in CCC", category: "devops", module: "devops", action: "approve", level: 3 },
  { code: "devops:gemini:view", name: "View Gemini spec", category: "devops", module: "devops", action: "view", level: 1 },
  { code: "devops:simulator:access", name: "Access simulator", category: "devops", module: "devops", action: "execute", level: 2 },
  { code: "devops:deployment:manage", name: "Manage system deployment", category: "devops", module: "devops", action: "execute", level: 3 },
  { code: "devops:effectiveness:view", name: "View AI effectiveness", category: "devops", module: "devops", action: "view", level: 1 },

  // ── 13. STRATEGIC PLANNING (8) ──
  { code: "strategy:hub:access", name: "Access strategy hub", category: "strategy", module: "strategy", action: "view", level: 2 },
  { code: "strategy:okr:view", name: "View OKR matrix", category: "strategy", module: "strategy", action: "view", level: 1 },
  { code: "strategy:okr:manage", name: "Create/edit OKRs", category: "strategy", module: "strategy", action: "manage", level: 3 },
  { code: "strategy:certification:manage", name: "Manage certifications", category: "strategy", module: "strategy", action: "manage", level: 3 },
  { code: "strategy:agenda:view", name: "View annual agenda", category: "strategy", module: "strategy", action: "view", level: 2 },
  { code: "strategy:agenda:manage", name: "Manage annual agenda", category: "strategy", module: "strategy", action: "manage", level: 4 },
  { code: "strategy:growth:view", name: "View global growth tracker", category: "strategy", module: "strategy", action: "view", level: 2 },
  { code: "strategy:change:manage", name: "Manage change governance", category: "strategy", module: "strategy", action: "manage", level: 3 },

  // ── 14. SMART OA (9) ──
  { code: "oa:forms:view", name: "View form directory", category: "oa", module: "oa", action: "view", level: 1 },
  { code: "oa:forms:manage", name: "Create/edit forms", category: "oa", module: "oa", action: "manage", level: 2 },
  { code: "oa:dashboard:view", name: "View OA command center", category: "oa", module: "oa", action: "view", level: 1 },
  { code: "oa:questionnaire:manage", name: "Manage questionnaires", category: "oa", module: "oa", action: "manage", level: 2 },
  { code: "oa:meeting:view", name: "View morning meeting board", category: "oa", module: "oa", action: "view", level: 1 },
  { code: "oa:reports:view", name: "View briefing center", category: "oa", module: "oa", action: "view", level: 1 },
  { code: "oa:reports:manage", name: "Create/edit reports", category: "oa", module: "oa", action: "manage", level: 2 },
  { code: "oa:vision:lobby", name: "View lobby global screen", category: "oa", module: "oa", action: "view", level: 1 },
  { code: "oa:vision:shopfloor", name: "View shopfloor master board", category: "oa", module: "oa", action: "view", level: 1 },

  // ── 15. COLLABORATION (10) ──
  { code: "collab:docs:view", name: "View collaboration documents", category: "collab", module: "collab", action: "view", level: 1 },
  { code: "collab:docs:manage", name: "Create/edit documents", category: "collab", module: "collab", action: "manage", level: 1 },
  { code: "collab:spreadsheet:view", name: "View spreadsheets", category: "collab", module: "collab", action: "view", level: 1 },
  { code: "collab:spreadsheet:edit", name: "Edit spreadsheets", category: "collab", module: "collab", action: "edit", level: 1 },
  { code: "collab:community:access", name: "Access community", category: "collab", module: "collab", action: "view", level: 1 },
  { code: "collab:community:post", name: "Post in community", category: "collab", module: "collab", action: "create", level: 1 },
  { code: "collab:workspace:view", name: "View workspaces", category: "collab", module: "collab", action: "view", level: 1 },
  { code: "collab:workspace:manage", name: "Manage workspaces", category: "collab", module: "collab", action: "manage", level: 2 },
  { code: "collab:meeting:hub", name: "Access meeting hub", category: "collab", module: "collab", action: "view", level: 1 },
  { code: "collab:cross-border:sync", name: "Cross-border data sync", category: "collab", module: "collab", action: "execute", level: 3 },

  // ── 16. POS SYSTEM (6) ──
  { code: "pos:dashboard:view", name: "View POS dashboard", category: "pos", module: "pos", action: "view", level: 1 },
  { code: "pos:projects:manage", name: "Manage POS projects", category: "pos", module: "pos", action: "manage", level: 2 },
  { code: "pos:customers:manage", name: "Manage POS customers", category: "pos", module: "pos", action: "manage", level: 2 },
  { code: "pos:procurement:manage", name: "Manage POS procurement", category: "pos", module: "pos", action: "manage", level: 2 },
  { code: "pos:mes:sync", name: "POS MES synchronization", category: "pos", module: "pos", action: "execute", level: 3 },
  { code: "pos:connectors:config", name: "Configure POS connectors", category: "pos", module: "pos", action: "manage", level: 4 },

  // ── 17. WORKSPACE (6) ──
  { code: "workspace:dashboard:view", name: "View personal dashboard", category: "workspace", module: "workspace", action: "view", level: 1 },
  { code: "workspace:profile:view", name: "View own profile", category: "workspace", module: "workspace", action: "view", level: 1 },
  { code: "workspace:profile:edit", name: "Edit own profile", category: "workspace", module: "workspace", action: "edit", level: 1 },
  { code: "workspace:notifications:view", name: "View notifications", category: "workspace", module: "workspace", action: "view", level: 1 },
  { code: "workspace:favorites:manage", name: "Manage favorites", category: "workspace", module: "workspace", action: "manage", level: 1 },
  { code: "workspace:preferences:manage", name: "Manage preferences", category: "workspace", module: "workspace", action: "manage", level: 1 },
];

// ── Role Definitions (14 Organizational Roles) ─────────

interface RoleDef {
  name: string;
  displayName: string;
  displayNameZh: string;
  description: string;
  roleType: string;
  category: string;
  level: number;
  defaultDataScope: string;
}

const ORG_ROLES: RoleDef[] = [
  { name: "super_admin", displayName: "Super Admin", displayNameZh: "超级管理员", description: "Full system access. All permissions granted.", roleType: "system", category: "system", level: 10, defaultDataScope: "all" },
  { name: "ceo", displayName: "CEO / CTO", displayNameZh: "总经理/技术总监", description: "Executive leadership. View all modules, approve strategic decisions.", roleType: "system", category: "executive", level: 8, defaultDataScope: "all" },
  { name: "vp", displayName: "Vice President", displayNameZh: "副总裁", description: "VP-level access. View most modules, approve within scope.", roleType: "system", category: "executive", level: 7, defaultDataScope: "all" },
  { name: "director", displayName: "Department Director", displayNameZh: "部门总监", description: "Department-level management. Full access within own department.", roleType: "business", category: "management", level: 5, defaultDataScope: "department" },
  { name: "hr_director", displayName: "HR Director", displayNameZh: "人力资源总监", description: "Full HR module access. Employee data across all departments.", roleType: "business", category: "management", level: 5, defaultDataScope: "all_employees" },
  { name: "sales_director", displayName: "Sales Director", displayNameZh: "销售总监", description: "Full CRM access. Sales pipeline and customer management.", roleType: "business", category: "management", level: 5, defaultDataScope: "department" },
  { name: "project_manager", displayName: "Project Manager", displayNameZh: "项目经理", description: "Project-level management. Full project and task control.", roleType: "business", category: "operations", level: 3, defaultDataScope: "project_team" },
  { name: "production_supervisor", displayName: "Production Supervisor", displayNameZh: "生产主管", description: "Production floor management. Scheduling, dispatch, worker management.", roleType: "business", category: "operations", level: 3, defaultDataScope: "department" },
  { name: "qc_manager", displayName: "QC Manager", displayNameZh: "质量经理", description: "Quality management. QC inspections, NCR, FMEA, 8D/CAPA.", roleType: "business", category: "operations", level: 3, defaultDataScope: "department" },
  { name: "engineer", displayName: "Engineer", displayNameZh: "工程师", description: "Technical contributor. R&D, design, and technical documentation.", roleType: "technical", category: "technical", level: 1, defaultDataScope: "self+project" },
  { name: "sales_rep", displayName: "Sales Representative", displayNameZh: "销售代表", description: "Sales operations. Customer management and opportunity tracking.", roleType: "business", category: "business", level: 1, defaultDataScope: "self+assigned" },
  { name: "floor_operator", displayName: "Floor Operator", displayNameZh: "车间操作员", description: "Production floor worker. Kiosk access and work reporting.", roleType: "business", category: "operations", level: 1, defaultDataScope: "self" },
  { name: "customer", displayName: "Customer Portal", displayNameZh: "客户", description: "External customer. Portal access, tickets, and feedback.", roleType: "external", category: "external", level: 0, defaultDataScope: "own_data" },
  { name: "guest", displayName: "Guest / Visitor", displayNameZh: "访客", description: "Read-only guest access. Minimal permissions.", roleType: "external", category: "external", level: 0, defaultDataScope: "none" },
];

// ── Authorization Matrix (Role → Permission codes) ─────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // super_admin gets ALL permissions
  super_admin: PERMISSIONS.map(p => p.code),

  ceo: [
    // System: view-only for users, audit, security, compliance, scheduler, monitoring
    "system:users:view", "system:permissions:assign", "system:audit:view",
    "system:scheduler:view", "system:security:dashboard", "system:compliance:view",
    "system:org:manage", "system:deployment:manage", "system:permissions:temporary",
    "system:monitoring:view",
    // CRM: view + strategic approvals
    "crm:customers:view", "crm:opportunities:view", "crm:leads:view",
    "crm:quotations:view", "crm:quotations:approve", "crm:contracts:view",
    "crm:contracts:manage", "crm:nda:manage", "crm:analytics:view",
    "crm:forecast:view", "crm:churn:view",
    // R&D: view
    "rnd:requirements:view", "rnd:solutions:view", "rnd:bom:view",
    "rnd:bom:freeze", "rnd:plm:access", "rnd:documents:view",
    "rnd:3d:view", "rnd:eco:review", "rnd:digital-twin:view",
    // Project: view + create/edit
    "project:list:view", "project:create", "project:edit",
    "project:stage-gate:view", "project:stage-gate:manage",
    "project:m1:manage", "project:tasks:view", "project:gantt:view",
    "project:risks:view", "project:cockpit:view",
    // Manufacturing: view dashboards
    "mfg:command:view", "mfg:dashboard:view", "mfg:scheduling:view",
    "mfg:spc:view", "mfg:materials:view", "mfg:inventory:view",
    "mfg:workers:performance", "mfg:oee:view", "mfg:uwb:view",
    "mfg:daily-report:view", "mfg:fat:manage",
    // Supply: view
    "supply:workbench:view", "supply:materials:view", "supply:procurement:view",
    "supply:procurement:approve", "supply:warehouse:view", "supply:planning:view",
    "supply:rfq:manage", "supply:spares:manage", "supply:risk:view", "supply:erp:view",
    // Service: view
    "service:workbench:view", "service:tickets:view", "service:feedback:view",
    "service:acceptance:manage", "service:sla:view",
    // HR: view + compensation approve
    "hr:employees:view", "hr:recruitment:view", "hr:attendance:view",
    "hr:performance:self", "hr:performance:team", "hr:performance:dept",
    "hr:performance:bu", "hr:compensation:manage", "hr:salary:approve",
    "hr:training:view", "hr:bu-team:manage", "hr:compliance:view",
    // Finance: view + approve
    "finance:expense:view", "finance:expense:create", "finance:expense:approve",
    "finance:trip:view", "finance:trip:create", "finance:trip:approve",
    "finance:travel:dashboard", "finance:budget:view", "finance:budget:manage",
    "finance:budget:approve", "finance:cost:view", "finance:analytics:view",
    // AI: full
    "ai:hub:access", "ai:assistant:chat", "ai:rag:train", "ai:rag:query",
    "ai:genesis:access", "ai:genesis:generate", "ai:genesis:approve",
    "ai:agents:manage", "ai:models:monitor", "ai:models:train",
    "ai:accuracy:admin", "ai:knowledge-graph:manage", "ai:security:governance",
    // DevOps
    "devops:matrix:view", "devops:concurrent:view", "devops:concurrent:approve",
    "devops:gemini:view", "devops:effectiveness:view",
    // Strategy: full
    "strategy:hub:access", "strategy:okr:view", "strategy:okr:manage",
    "strategy:agenda:view", "strategy:agenda:manage", "strategy:growth:view",
    "strategy:change:manage",
    // OA
    "oa:forms:view", "oa:dashboard:view", "oa:meeting:view",
    "oa:reports:view", "oa:vision:lobby", "oa:vision:shopfloor",
    // Workspace (everyone)
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  vp: [
    "system:audit:view", "system:security:dashboard", "system:compliance:view",
    "system:org:manage", "system:monitoring:view",
    // CRM
    "crm:customers:view", "crm:opportunities:view", "crm:leads:view",
    "crm:quotations:view", "crm:quotations:approve", "crm:contracts:view",
    "crm:contracts:manage", "crm:nda:manage", "crm:analytics:view", "crm:forecast:view",
    // R&D
    "rnd:requirements:view", "rnd:solutions:view", "rnd:bom:view",
    "rnd:bom:freeze", "rnd:plm:access", "rnd:documents:view",
    "rnd:3d:view", "rnd:eco:review", "rnd:digital-twin:view",
    // Project
    "project:list:view", "project:create", "project:edit",
    "project:stage-gate:view", "project:stage-gate:manage", "project:m1:manage",
    "project:tasks:view", "project:gantt:view", "project:risks:view", "project:cockpit:view",
    // Manufacturing
    "mfg:command:view", "mfg:dashboard:view", "mfg:scheduling:view",
    "mfg:spc:view", "mfg:materials:view", "mfg:inventory:view",
    "mfg:workers:performance", "mfg:oee:view", "mfg:uwb:view",
    "mfg:daily-report:view", "mfg:fat:manage",
    // Supply
    "supply:workbench:view", "supply:materials:view", "supply:procurement:view",
    "supply:procurement:approve", "supply:warehouse:view", "supply:planning:view",
    "supply:risk:view", "supply:erp:view",
    // Service
    "service:workbench:view", "service:tickets:view", "service:feedback:view",
    "service:acceptance:manage", "service:sla:view",
    // HR
    "hr:employees:view", "hr:attendance:view",
    "hr:performance:self", "hr:performance:team", "hr:performance:dept",
    "hr:performance:bu", "hr:salary:approve", "hr:training:view",
    "hr:bu-team:manage", "hr:compliance:view",
    // Finance
    "finance:expense:view", "finance:expense:create", "finance:expense:approve",
    "finance:trip:view", "finance:trip:create", "finance:trip:approve",
    "finance:travel:dashboard", "finance:budget:view", "finance:budget:approve",
    "finance:cost:view", "finance:analytics:view",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    "ai:genesis:access", "ai:genesis:approve",
    "ai:models:monitor", "ai:security:governance",
    // DevOps
    "devops:matrix:view", "devops:concurrent:view", "devops:concurrent:approve",
    "devops:gemini:view", "devops:effectiveness:view",
    // Strategy
    "strategy:hub:access", "strategy:okr:view", "strategy:okr:manage",
    "strategy:agenda:view", "strategy:growth:view", "strategy:change:manage",
    // OA
    "oa:forms:view", "oa:dashboard:view", "oa:meeting:view",
    "oa:reports:view", "oa:vision:lobby", "oa:vision:shopfloor",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  director: [
    "system:compliance:view",
    // CRM: view
    "crm:customers:view", "crm:opportunities:view",
    // R&D: full within department
    "rnd:requirements:view", "rnd:requirements:manage", "rnd:solutions:view",
    "rnd:solutions:manage", "rnd:mechanical:view", "rnd:mechanical:manage",
    "rnd:electrical:view", "rnd:electrical:manage", "rnd:bom:view", "rnd:bom:manage",
    "rnd:bom:freeze", "rnd:plm:access", "rnd:documents:view", "rnd:documents:manage",
    "rnd:drawings:view", "rnd:drawings:manage", "rnd:3d:view",
    "rnd:eco:review", "rnd:digital-twin:view",
    // Project
    "project:list:view", "project:create", "project:edit",
    "project:stage-gate:view", "project:stage-gate:manage", "project:m1:manage",
    "project:tasks:view", "project:tasks:manage", "project:gantt:view",
    "project:risks:view", "project:risks:manage", "project:sop:view",
    "project:sop:manage", "project:documents:manage", "project:delivery:manage",
    "project:cockpit:view",
    // Manufacturing: full
    "mfg:command:view", "mfg:dashboard:view", "mfg:process:view", "mfg:process:manage",
    "mfg:scheduling:view", "mfg:scheduling:run", "mfg:scheduling:dispatch",
    "mfg:steps:view", "mfg:steps:manage", "mfg:execution:view",
    "mfg:qc:view", "mfg:qc:approve", "mfg:spc:view",
    "mfg:ncr:view", "mfg:ncr:manage", "mfg:ppap:manage",
    "mfg:fmea:view", "mfg:control-plan:manage", "mfg:safety:manage",
    "mfg:materials:view", "mfg:materials:manage", "mfg:inventory:view", "mfg:inventory:manage",
    "mfg:workers:view", "mfg:workers:manage", "mfg:workers:performance",
    "mfg:oee:view", "mfg:fat:manage", "mfg:uwb:view",
    "mfg:daily-report:view", "mfg:shift:manage",
    // Supply
    "supply:workbench:view", "supply:materials:view", "supply:materials:manage",
    "supply:procurement:view", "supply:procurement:manage", "supply:procurement:approve",
    "supply:warehouse:view", "supply:warehouse:manage", "supply:planning:view",
    "supply:rfq:manage", "supply:spares:manage", "supply:risk:view", "supply:erp:view",
    // Service
    "service:workbench:view", "service:installation:manage", "service:sat:manage",
    "service:acceptance:manage", "service:tickets:view", "service:tickets:manage",
    "service:feedback:view", "service:feedback:manage", "service:diagnosis:use",
    "service:sla:view",
    // HR: view + team
    "hr:employees:view", "hr:attendance:view",
    "hr:performance:self", "hr:performance:team", "hr:performance:dept",
    "hr:training:view", "hr:bu-team:manage",
    // Finance
    "finance:expense:view", "finance:expense:create", "finance:expense:approve",
    "finance:trip:view", "finance:trip:create", "finance:trip:approve",
    "finance:travel:dashboard", "finance:budget:view",
    "finance:cost:view",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    "ai:genesis:access",
    // DevOps
    "devops:matrix:view", "devops:concurrent:view", "devops:concurrent:operate",
    "devops:concurrent:approve", "devops:gemini:view", "devops:effectiveness:view",
    // Strategy
    "strategy:hub:access", "strategy:okr:view", "strategy:okr:manage",
    "strategy:agenda:view", "strategy:growth:view",
    // OA
    "oa:forms:view", "oa:forms:manage", "oa:dashboard:view",
    "oa:questionnaire:manage", "oa:meeting:view",
    "oa:reports:view", "oa:reports:manage",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  hr_director: [
    // HR: full
    "hr:employees:view", "hr:employees:create", "hr:employees:edit", "hr:employees:delete",
    "hr:employees:import", "hr:recruitment:view", "hr:recruitment:manage",
    "hr:attendance:view", "hr:attendance:manage", "hr:offboarding:manage",
    "hr:lifecycle:view", "hr:performance:self", "hr:performance:team",
    "hr:performance:dept", "hr:performance:bu", "hr:performance:manage",
    "hr:compensation:view", "hr:compensation:manage", "hr:salary:approve",
    "hr:salary:report", "hr:bonus:manage", "hr:delegation:manage",
    "hr:training:view", "hr:training:manage", "hr:compliance:view",
    "hr:bu-team:manage", "hr:visitor:request", "hr:status:manage",
    "hr:planning:annual", "hr:supervisor:dashboard",
    // Cross-module views
    "hr:employees:view", "project:list:view", "mfg:workers:view", "mfg:workers:performance",
    // Finance
    "finance:expense:view", "finance:expense:create",
    "finance:trip:view", "finance:trip:create", "finance:travel:dashboard",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  sales_director: [
    // CRM: full
    "crm:customers:view", "crm:customers:create", "crm:customers:edit", "crm:customers:delete",
    "crm:opportunities:view", "crm:opportunities:manage",
    "crm:contacts:view", "crm:contacts:manage",
    "crm:leads:view", "crm:leads:manage",
    "crm:quotations:view", "crm:quotations:create", "crm:quotations:approve",
    "crm:contracts:view", "crm:contracts:manage",
    "crm:nda:manage", "crm:materials:view", "crm:analytics:view",
    "crm:forecast:view", "crm:churn:view",
    // Project: view
    "project:list:view", "project:gantt:view", "project:cockpit:view",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    // Finance
    "finance:expense:view", "finance:expense:create",
    "finance:trip:view", "finance:trip:create", "finance:travel:dashboard",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  project_manager: [
    // CRM: view
    "crm:customers:view", "crm:quotations:view", "crm:contracts:view",
    // R&D
    "rnd:requirements:view", "rnd:requirements:manage", "rnd:solutions:view",
    "rnd:mechanical:view", "rnd:electrical:view", "rnd:bom:view",
    "rnd:plm:access", "rnd:documents:view", "rnd:drawings:view", "rnd:3d:view",
    "rnd:digital-twin:view",
    // Project: full
    "project:list:view", "project:create", "project:edit",
    "project:stage-gate:view", "project:stage-gate:manage", "project:m1:manage",
    "project:m7m9:manage", "project:tasks:view", "project:tasks:manage",
    "project:gantt:view", "project:risks:view", "project:risks:manage",
    "project:sop:view", "project:sop:manage", "project:documents:manage",
    "project:delivery:manage", "project:cockpit:view",
    // Manufacturing: view
    "mfg:command:view", "mfg:dashboard:view", "mfg:scheduling:view",
    "mfg:materials:view",
    // Supply: view
    "supply:workbench:view", "supply:materials:view", "supply:procurement:view",
    // Service
    "service:workbench:view", "service:installation:manage", "service:sat:manage",
    "service:acceptance:manage", "service:tickets:view",
    "service:feedback:view",
    // HR: view
    "hr:employees:view", "hr:attendance:view",
    "hr:performance:self", "hr:performance:team",
    "hr:training:view",
    // Finance
    "finance:expense:view", "finance:expense:create",
    "finance:trip:view", "finance:trip:create", "finance:travel:dashboard",
    "finance:budget:view",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    // DevOps
    "devops:matrix:view", "devops:concurrent:view", "devops:concurrent:operate",
    "devops:gemini:view",
    // Strategy
    "strategy:okr:view",
    // OA
    "oa:forms:view", "oa:dashboard:view", "oa:meeting:view", "oa:reports:view",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  production_supervisor: [
    // Manufacturing: operational
    "mfg:command:view", "mfg:dashboard:view", "mfg:process:view",
    "mfg:scheduling:view", "mfg:scheduling:run", "mfg:scheduling:dispatch",
    "mfg:steps:view", "mfg:steps:manage", "mfg:execution:view", "mfg:execution:report",
    "mfg:qc:view", "mfg:spc:view", "mfg:ncr:view",
    "mfg:safety:manage", "mfg:materials:view", "mfg:materials:manage",
    "mfg:inventory:view", "mfg:workers:view", "mfg:workers:manage",
    "mfg:workers:performance", "mfg:kiosk:access", "mfg:oee:view",
    "mfg:uwb:view", "mfg:daily-report:view", "mfg:shift:manage",
    // Supply: view warehouse
    "supply:warehouse:view", "supply:spares:manage",
    // HR
    "hr:attendance:view", "hr:performance:self", "hr:performance:team",
    "hr:training:view",
    // Finance
    "finance:expense:view", "finance:expense:create",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  qc_manager: [
    // Manufacturing: QC focus
    "mfg:command:view", "mfg:dashboard:view", "mfg:process:view",
    "mfg:scheduling:view", "mfg:steps:view",
    "mfg:qc:view", "mfg:qc:manage", "mfg:qc:approve",
    "mfg:spc:view", "mfg:ncr:view", "mfg:ncr:manage",
    "mfg:ppap:manage", "mfg:fmea:view", "mfg:fmea:manage",
    "mfg:8d:manage", "mfg:msa:manage", "mfg:control-plan:manage",
    "mfg:safety:manage", "mfg:materials:view",
    "mfg:oee:view", "mfg:cleanliness:manage",
    "mfg:monthly-report:view", "mfg:process-trials:manage",
    // HR
    "hr:performance:self", "hr:performance:team",
    "hr:training:view",
    // Finance
    "finance:expense:view", "finance:expense:create",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  engineer: [
    // R&D: edit within projects
    "rnd:requirements:view", "rnd:requirements:manage",
    "rnd:solutions:view", "rnd:solutions:manage",
    "rnd:mechanical:view", "rnd:mechanical:manage",
    "rnd:electrical:view", "rnd:electrical:manage",
    "rnd:bom:view", "rnd:bom:manage", "rnd:bom:verify",
    "rnd:plm:access", "rnd:documents:view", "rnd:documents:manage",
    "rnd:vault:access", "rnd:drawings:view", "rnd:drawings:manage",
    "rnd:3d:view", "rnd:digital-twin:view",
    // Project
    "project:list:view", "project:tasks:view", "project:tasks:manage",
    "project:gantt:view", "project:risks:view", "project:risks:manage",
    "project:sop:view", "project:documents:manage", "project:delivery:manage",
    "project:stage-gate:view",
    // Manufacturing
    "mfg:command:view", "mfg:dashboard:view", "mfg:process:view", "mfg:process:manage",
    "mfg:steps:view", "mfg:steps:manage", "mfg:spc:view",
    "mfg:ncr:view", "mfg:ncr:manage", "mfg:ppap:manage",
    "mfg:fmea:view", "mfg:fmea:manage", "mfg:8d:manage",
    "mfg:control-plan:manage", "mfg:safety:manage",
    "mfg:materials:view", "mfg:oee:view", "mfg:uwb:view",
    "mfg:fat:manage", "mfg:sat:execute",
    // Supply
    "supply:materials:view",
    // Service
    "service:workbench:view", "service:installation:manage",
    "service:sat:manage", "service:tickets:view", "service:tickets:manage",
    "service:feedback:view", "service:diagnosis:use",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    // DevOps
    "devops:matrix:view", "devops:concurrent:view", "devops:concurrent:operate",
    "devops:gemini:view", "devops:effectiveness:view",
    // Strategy
    "strategy:okr:view",
    // Finance
    "finance:expense:view", "finance:expense:create",
    "finance:trip:view", "finance:trip:create",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
    // HR
    "hr:attendance:view", "hr:performance:self", "hr:training:view",
    "hr:compensation:view",
  ],

  sales_rep: [
    // CRM
    "crm:customers:view", "crm:customers:create", "crm:customers:edit",
    "crm:opportunities:view", "crm:opportunities:manage",
    "crm:contacts:view", "crm:contacts:manage",
    "crm:leads:view", "crm:leads:manage",
    "crm:quotations:view", "crm:quotations:create",
    "crm:contracts:view", "crm:nda:manage",
    "crm:materials:view", "crm:analytics:view",
    // Project
    "project:list:view",
    // Service
    "service:tickets:view", "service:feedback:view",
    // AI
    "ai:hub:access", "ai:assistant:chat", "ai:rag:query",
    // Finance
    "finance:expense:view", "finance:expense:create",
    "finance:trip:view", "finance:trip:create",
    // Strategy
    "strategy:okr:view",
    // HR
    "hr:attendance:view", "hr:performance:self", "hr:training:view",
    "hr:compensation:view",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  floor_operator: [
    // Manufacturing: limited
    "mfg:steps:view", "mfg:execution:view", "mfg:execution:report",
    "mfg:safety:manage", "mfg:materials:view", "mfg:kiosk:access",
    "mfg:machine:login", "mfg:shift:manage",
    // HR
    "hr:attendance:view", "hr:performance:self", "hr:training:view",
    "hr:compensation:view",
    // Finance
    "finance:expense:view", "finance:expense:create",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view", "workspace:favorites:manage", "workspace:preferences:manage",
  ],

  customer: [
    // CRM: portal only
    "crm:portal:access",
    // Service: limited
    "service:tickets:view", "service:tickets:manage",
    "service:feedback:view", "service:feedback:manage",
    "service:repair:portal",
    // Workspace
    "workspace:dashboard:view", "workspace:profile:view", "workspace:profile:edit",
    "workspace:notifications:view",
  ],

  guest: [
    // Minimal
    "workspace:dashboard:view", "workspace:profile:view",
  ],
};

// ── Seed Execution ──────────────────────────────────────

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[RBAC Seed] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   GRT RBAC — Permission & Role Seed Script          ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  try {
    // ── Step 1: Seed permissions ──

    console.log(`[1/3] Seeding ${PERMISSIONS.length} permissions...`);
    const permIdMap = new Map<string, number>();
    let permCreated = 0;
    let permSkipped = 0;

    for (const permDef of PERMISSIONS) {
      const existing = await db.select().from(permissions).where(eq(permissions.code, permDef.code));
      if (existing.length > 0) {
        permIdMap.set(permDef.code, existing[0].id);
        permSkipped++;
        continue;
      }

      const [created] = await db.insert(permissions).values({
        code: permDef.code,
        name: permDef.name,
        category: permDef.category,
        module: permDef.module,
        action: permDef.action,
        level: permDef.level,
        isActive: true,
      }).returning();

      permIdMap.set(permDef.code, created.id);
      permCreated++;
    }

    console.log(`  => ${permCreated} created, ${permSkipped} skipped (already exist).\n`);

    // ── Step 2: Seed roles ──

    console.log(`[2/3] Seeding ${ORG_ROLES.length} organizational roles...`);
    const roleIdMap = new Map<string, number>();
    let rolesCreated = 0;
    let rolesSkipped = 0;

    for (const roleDef of ORG_ROLES) {
      const existing = await db.select().from(roles).where(eq(roles.name, roleDef.name));
      if (existing.length > 0) {
        roleIdMap.set(roleDef.name, existing[0].id);
        rolesSkipped++;
        continue;
      }

      const [created] = await db.insert(roles).values({
        name: roleDef.name,
        displayName: roleDef.displayName,
        displayNameZh: roleDef.displayNameZh,
        description: roleDef.description,
        roleType: roleDef.roleType,
        category: roleDef.category,
        level: roleDef.level,
        defaultDataScope: roleDef.defaultDataScope,
        isActive: true,
      }).returning();

      roleIdMap.set(roleDef.name, created.id);
      rolesCreated++;
      console.log(`  [+] Role "${roleDef.name}" (level=${roleDef.level})`);
    }

    console.log(`  => ${rolesCreated} created, ${rolesSkipped} skipped.\n`);

    // ── Step 3: Seed role-permission mappings ──

    console.log("[3/3] Seeding role-permission mappings...");
    let mappingsCreated = 0;
    let mappingsSkipped = 0;

    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleIdMap.get(roleName);
      if (!roleId) {
        console.warn(`  [!] Role "${roleName}" not found, skipping its permissions.`);
        continue;
      }

      for (const code of permCodes) {
        const permId = permIdMap.get(code);
        if (!permId) {
          // Permission not in our list (could be a typo or future permission)
          continue;
        }

        // Check if mapping already exists
        const existing = await db.select().from(rolePermissions)
          .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permId)));

        if (existing.length > 0) {
          mappingsSkipped++;
          continue;
        }

        await db.insert(rolePermissions).values({
          roleId,
          permissionId: permId,
        });
        mappingsCreated++;
      }

      const assignedCount = permCodes.filter(c => permIdMap.has(c)).length;
      console.log(`  [+] ${roleName}: ${assignedCount} permissions`);
    }

    console.log(`  => ${mappingsCreated} created, ${mappingsSkipped} skipped.\n`);

    // ── Summary ──

    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║              RBAC SEED COMPLETE                     ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║  Permissions: ${String(permCreated).padStart(4)} created / ${String(permSkipped).padStart(4)} existing     ║`);
    console.log(`║  Roles:       ${String(rolesCreated).padStart(4)} created / ${String(rolesSkipped).padStart(4)} existing     ║`);
    console.log(`║  Mappings:    ${String(mappingsCreated).padStart(4)} created / ${String(mappingsSkipped).padStart(4)} existing     ║`);
    console.log("╚══════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[RBAC Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
