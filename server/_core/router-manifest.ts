/**
 * Router Manifest — declarative registry of all tRPC routers.
 *
 * Each entry catalogs:
 * - domain: business domain for grouping
 * - authLevel: current authentication level (public = no auth, protected = user required, permission = RBAC, admin = admin only)
 * - buScoped: whether queries should be filtered by BU context
 * - owner: primary responsible role
 * - status: maturity level (production = DB-backed + tested, beta = DB-backed, stub = mock/hardcoded)
 * - procedureCount: approximate number of procedures (for complexity assessment)
 *
 * This manifest is the source of truth for gateway audit reports and
 * the migration plan from publicProcedure → protectedProcedure.
 */

export type RouterDomain =
  | "core"
  | "pm"
  | "hr"
  | "finance"
  | "quality"
  | "sales"
  | "manufacturing"
  | "supply-chain"
  | "ai"
  | "platform"
  | "meeting"
  | "service";

export type RouterAuthLevel = "public" | "protected" | "permission" | "admin";
export type RouterStatus = "production" | "beta" | "stub";

export interface RouterManifest {
  name: string;
  file: string;
  domain: RouterDomain;
  authLevel: RouterAuthLevel;
  buScoped: boolean;
  owner: string;
  status: RouterStatus;
  procedureCount: number;
}

export const ROUTER_MANIFEST: RouterManifest[] = [
  // ===== Core / System =====
  { name: "system", file: "_core/systemRouter.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "health", file: "routers.ts (inline)", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 1 },
  { name: "echo", file: "routers.ts (inline)", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 1 },
  { name: "auth", file: "routers/auth.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "security", file: "security/securityRouter.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "admin", status: "production", procedureCount: 6 },
  { name: "permission", file: "permission-management/permission.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 8 },
  { name: "rolePermission", file: "permissions/permission.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "permissionManagement", file: "routers/permission-management.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 6 },
  { name: "menu", file: "menu-management/menu.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "users", file: "routers/users.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "userProfile", file: "routers/user-profile.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "employee", status: "production", procedureCount: 3 },
  { name: "scheduler", file: "routers/scheduler.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "monitoring", file: "monitoring/monitoring.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "governance", file: "routers/governance.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "beta", procedureCount: 8 },
  { name: "aiSecurityGovernance", file: "routers/ai-security-governance.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "beta", procedureCount: 6 },
  { name: "dataMigration", file: "routers/data-migration.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "architecture", file: "services/architecture.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },

  // ===== Organization / BU =====
  { name: "org", file: "routers/org.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 5 },
  { name: "bu", file: "routers/bu.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "director", status: "production", procedureCount: 6 },
  { name: "buMapping", file: "routers/bu-mapping.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "admin", status: "production", procedureCount: 8 },

  // ===== Project Management =====
  { name: "project", file: "routers/project.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "production", procedureCount: 12 },
  { name: "projectGate", file: "routers/projectGate.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "production", procedureCount: 15 },

  { name: "taskBoard", file: "routers/task-board.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "production", procedureCount: 8 },
  { name: "taskCockpit", file: "routers/task-cockpit.router.ts", domain: "pm", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 6 },
  { name: "project360", file: "routers/project360.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "beta", procedureCount: 5 },

  { name: "m7m9", file: "delivery/delivery.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "beta", procedureCount: 8 },
  { name: "lifecycle", file: "lifecycle/lifecycle.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "beta", procedureCount: 5 },
  { name: "aiPlanning", file: "routers/ai-planning.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "production", procedureCount: 6 },
  { name: "planningDependency", file: "routers/planning-dependency.router.ts", domain: "pm", authLevel: "public", buScoped: false, owner: "bu_pm", status: "production", procedureCount: 4 },
  { name: "annualPlanning", file: "routers/annual-planning.router.ts", domain: "pm", authLevel: "public", buScoped: false, owner: "director", status: "production", procedureCount: 6 },
  { name: "stageGate", file: "modules/stageGate.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "beta", procedureCount: 5 },
  { name: "stageGateEnhanced", file: "modules/stageGateEnhanced.router.ts", domain: "pm", authLevel: "public", buScoped: true, owner: "bu_pm", status: "beta", procedureCount: 5 },

  // ===== HR =====
  { name: "hrm", file: "routers/hrm.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 15 },
  { name: "employee", file: "routers/employee.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 10 },
  { name: "employeeProfile", file: "routers/employee-profile.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 8 },
  { name: "employeeDA", file: "routers/employee-da.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 5 },
  { name: "hrLifecycle", file: "routers/hr-lifecycle.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 6 },
  { name: "offboarding", file: "offboarding/offboarding.router.ts", domain: "hr", authLevel: "protected", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 5 },
  { name: "competency", file: "routers/competency.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 8 },
  { name: "skillRecommendation", file: "routers/skill-recommendation.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 4 },
  { name: "trainingCertificate", file: "routers/training-certificate.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_specialist", status: "production", procedureCount: 5 },
  { name: "trainingAssessment", file: "routers/training-assessment.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_specialist", status: "production", procedureCount: 5 },
  { name: "capabilityEvidence", file: "capability-evidence/capability-evidence.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 6 },
  { name: "capabilityOs", file: "routers/capability-os.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "capabilitySystem", file: "routers/capability-system.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "excellenceCulture", file: "routers/excellence-culture.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 4 },
  { name: "certification", file: "certification/certification.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_specialist", status: "production", procedureCount: 6 },
  { name: "liquidWorkforce", file: "modules/liquidWorkforce.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "liquidWorkforceEnhanced", file: "modules/liquidWorkforceEnhanced.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "trainingEnhanced", file: "modules/trainingEnhanced.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 4 },

  // ===== KPI / Performance =====
  { name: "kpiPerformance", file: "kpi-performance/kpiPerformance.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 28 },
  { name: "performanceRecord", file: "routers/performance-record.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 8 },
  { name: "aiPerformance", file: "routers/ai-performance.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 8 },
  { name: "perfSalary", file: "perf-salary/perfSalary.router.ts", domain: "hr", authLevel: "protected", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 5 },

  // ===== Finance =====
  { name: "cost", file: "routers/cost.router.ts", domain: "finance", authLevel: "public", buScoped: true, owner: "finance_manager", status: "production", procedureCount: 10 },
  { name: "costAlert", file: "routers/cost-alert.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 5 },
  { name: "costStandards", file: "services/cost-standards.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "beta", procedureCount: 6 },
  { name: "expenseReport", file: "routers/expense-report.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_specialist", status: "production", procedureCount: 8 },
  { name: "expenseComparison", file: "routers/expense-comparison.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 5 },
  { name: "expenseComparisonExport", file: "routers/expense-comparison-export.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "stub", procedureCount: 3 },
  { name: "expenseForecast", file: "routers/expense-forecast.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 4 },
  { name: "budgetOverrunApproval", file: "routers/budget-overrun-approval.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 4 },
  { name: "expenseReportScheduler", file: "routers/expense-report-scheduler.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 3 },
  { name: "travelDashboard", file: "routers/travel-dashboard.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "finance_specialist", status: "stub", procedureCount: 3 },
  { name: "salaryBonus", file: "production-steps/salaryBonus.router.ts", domain: "finance", authLevel: "protected", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 6 },
  { name: "salaryReport", file: "production-steps/salaryReport.router.ts", domain: "finance", authLevel: "protected", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 4 },
  { name: "salaryApproval", file: "production-steps/salaryApproval.router.ts", domain: "finance", authLevel: "protected", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 4 },
  { name: "financeAgent", file: "routers/finance-agent.router.ts", domain: "finance", authLevel: "protected", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 8 },

  // ===== Quality =====
  { name: "fmea", file: "routers/fmea.router.ts", domain: "quality", authLevel: "public", buScoped: true, owner: "quality_eng", status: "production", procedureCount: 10 },
  { name: "fmeaDynamic", file: "routers/fmea-dynamic.router.ts", domain: "quality", authLevel: "public", buScoped: true, owner: "quality_eng", status: "beta", procedureCount: 8 },
  { name: "controlPlan", file: "routers/control-plan.router.ts", domain: "quality", authLevel: "public", buScoped: true, owner: "quality_eng", status: "production", procedureCount: 8 },
  { name: "ppap", file: "routers/ppap.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 8 },
  { name: "msa", file: "routers/msa.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 6 },
  { name: "eightDCapa", file: "routers/eight-d-capa.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 8 },
  { name: "cleanlinessQc", file: "cleanliness-qc/cleanlinessQc.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 6 },
  { name: "qualityAdvanced", file: "quality-advanced/qualityAdvanced.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 8 },
  { name: "qualityInterlock", file: "production-steps/qualityInterlock.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 5 },
  { name: "qualityMaterialPerformance", file: "production-steps/qualityMaterialPerformance.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 5 },
  { name: "compliance", file: "routers/compliance.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 10 },
  { name: "complianceCalendar", file: "routers/compliance-calendar.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 5 },

  { name: "regionalCompliance", file: "regional-compliance/regionalCompliance.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 8 },

  // ===== Sales / CRM =====
  { name: "crm", file: "crm/crm.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "production", procedureCount: 12 },
  { name: "contract", file: "contract/contract.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "production", procedureCount: 8 },
  { name: "leadImport", file: "routers/lead-import.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "production", procedureCount: 4 },
  { name: "leadAnalytics", file: "routers/lead-analytics.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "production", procedureCount: 5 },
  { name: "leadAutoFollow", file: "routers/lead-auto-follow.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "production", procedureCount: 4 },

  { name: "campaign", file: "routers/campaign.router.ts", domain: "sales", authLevel: "public", buScoped: false, owner: "bu_sales", status: "beta", procedureCount: 6 },
  { name: "aiSales", file: "modules/aiSales.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "beta", procedureCount: 5 },
  { name: "aiSalesEnhanced", file: "modules/aiSalesEnhanced.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "beta", procedureCount: 5 },
  { name: "serviceSalesAdvanced", file: "service-sales-advanced/serviceSalesAdvanced.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_sales", status: "beta", procedureCount: 6 },

  // ===== Manufacturing =====
  { name: "mes", file: "routers/mes.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "production", procedureCount: 10 },
  { name: "productionDashboard", file: "routers/production.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "production", procedureCount: 8 },
  { name: "productionExecution", file: "production-execution/production-execution.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 12 },
  { name: "productionAdvanced", file: "production-advanced/productionAdvanced.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "beta", procedureCount: 8 },
  { name: "processSteps", file: "production-steps/processSteps.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 8 },
  { name: "processManagement", file: "routers/processManagement.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "production", procedureCount: 6 },
  { name: "shiftHandover", file: "shift-handover/shiftHandover.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 6 },
  { name: "kiosk", file: "routers/kiosk.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 5 },
  { name: "safetyRule", file: "routers/safety-rule.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 6 },
  { name: "oeeDashboard", file: "routers/oee-dashboard.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "beta", procedureCount: 5 },
  { name: "smartScheduler", file: "routers/smart-scheduler.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "beta", procedureCount: 6 },
  { name: "ccdIntegration", file: "production-steps/ccdIntegration.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 4 },
  { name: "ccdWebSocket", file: "production-steps/ccdWebSocket.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 3 },

  // ===== Supply Chain =====
  { name: "supplyChain", file: "routers/supply-chain.router.ts", domain: "supply-chain", authLevel: "public", buScoped: true, owner: "procurement_eng", status: "production", procedureCount: 65 },
  { name: "warehouse", file: "routers/warehouse.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "procurement_eng", status: "production", procedureCount: 12 },
  { name: "smartInventory", file: "routers/smart-inventory.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "procurement_eng", status: "beta", procedureCount: 8 },
  { name: "supplierRisk", file: "routers/supplier-risk.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "procurement_eng", status: "beta", procedureCount: 6 },
  { name: "bom", file: "routers/bom.router.ts", domain: "supply-chain", authLevel: "public", buScoped: true, owner: "bu_mech", status: "production", procedureCount: 15 },
  { name: "bomVerification", file: "production-steps/bomVerification.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 4 },
  { name: "bomImport", file: "production-steps/bomImport.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 3 },
  { name: "bomExcelImport", file: "production-steps/bomExcelImport.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 3 },
  { name: "p2p", file: "routers/p2p-lifecycle.router.ts", domain: "supply-chain", authLevel: "public", buScoped: true, owner: "procurement_eng", status: "beta", procedureCount: 8 },
  { name: "erp", file: "erp/erp.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 8 },
  { name: "tiansiERP", file: "erp/tiansi-erp.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "finance_manager", status: "production", procedureCount: 6 },
  { name: "materials", file: "materials/material.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "procurement_eng", status: "production", procedureCount: 6 },
  { name: "procurement", file: "procurement/procurement.router.ts", domain: "supply-chain", authLevel: "public", buScoped: false, owner: "procurement_eng", status: "production", procedureCount: 8 },

  // ===== Service / After-Sales =====
  { name: "afterSales", file: "services/after-sales.router.ts", domain: "service", authLevel: "public", buScoped: true, owner: "cs_engineer", status: "production", procedureCount: 10 },
  { name: "customerRepair", file: "customer-repair/customerRepair.router.ts", domain: "service", authLevel: "public", buScoped: true, owner: "cs_engineer", status: "production", procedureCount: 8 },
  { name: "customerTicket", file: "customer-ticket/customerTicket.router.ts", domain: "service", authLevel: "public", buScoped: true, owner: "cs_engineer", status: "production", procedureCount: 8 },
  { name: "customerComm", file: "customer-ticket/customerComm.router.ts", domain: "service", authLevel: "public", buScoped: true, owner: "cs_engineer", status: "production", procedureCount: 5 },
  { name: "fieldService", file: "services/field-service.router.ts", domain: "service", authLevel: "public", buScoped: true, owner: "cs_engineer", status: "beta", procedureCount: 6 },
  { name: "fatSat", file: "services/fat-sat.router.ts", domain: "service", authLevel: "public", buScoped: true, owner: "cs_engineer", status: "beta", procedureCount: 6 },
  { name: "serviceDashboard", file: "routers/service-dashboard.router.ts", domain: "service", authLevel: "public", buScoped: false, owner: "cs_engineer", status: "beta", procedureCount: 10 },

  // ===== Meeting Intelligence =====
  { name: "meeting", file: "meeting-intelligence/meeting.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 10 },
  { name: "meetingTaskLoop", file: "meeting-intelligence/meeting-task-loop.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 6 },
  { name: "customerSolutionMeeting", file: "meeting-intelligence/customer-solution-meeting.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "bu_pm", status: "beta", procedureCount: 5 },
  { name: "smartMeeting", file: "routers/smart-meeting.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 12 },
  { name: "ime", file: "ime/ime.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 6 },

  // ===== AI Engines =====
  { name: "ai", file: "ai/ai.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "aiCanvas", file: "routers/ai-canvas.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 4 },
  { name: "aiTask", file: "routers/ai-task.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "aiChat", file: "routers/ai-chat.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 5 },
  { name: "aiSuggestion", file: "routers/ai-suggestion.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 4 },
  { name: "aiNotebook", file: "routers/ai-notebook.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 5 },
  { name: "employeeAiAssistant", file: "routers/employee-ai-assistant.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 6 },
  { name: "newAiAssistant", file: "routers/new-ai-assistant.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "beta", procedureCount: 4 },
  { name: "aiAssistant", file: "ai-assistants/ai-assistant.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 5 },
  { name: "roleAgent", file: "routers/role-agent.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 3 },
  { name: "aiAdapter", file: "ai-adapter/ai-adapter.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "aiAgentFleet", file: "routers/ai-agent-fleet.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 8 },
  { name: "aiExecutionMode", file: "routers/ai-execution-mode.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "aiTrigger", file: "routers/ai-trigger.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "aiServices", file: "ai-services/ai-services.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 8 },
  { name: "aiEarlyWarning", file: "services/ai-early-warning.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "director", status: "beta", procedureCount: 5 },
  { name: "aiIntervention", file: "routers/ai-intervention.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 6 },
  { name: "hrSandbox", file: "routers/hr-sandbox.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 5 },
  { name: "help", file: "routers/help.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 8 },
  { name: "genesis", file: "routers/genesis.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 10 },

  // ===== AI Intelligence (stub) =====
  { name: "projectIntelligence", file: "project-intelligence/projectIntelligence.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "bu_pm", status: "stub", procedureCount: 4 },
  { name: "operationsIntelligence", file: "operations-intelligence/operationsIntelligence.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "director", status: "stub", procedureCount: 4 },
  { name: "hrIntelligence", file: "hr-intelligence/hrIntelligence.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "hr_manager", status: "stub", procedureCount: 4 },
  { name: "salesFinanceIntelligence", file: "sales-finance-intelligence/salesFinanceIntelligence.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "finance_manager", status: "stub", procedureCount: 4 },
  { name: "rdServiceIntelligence", file: "rd-service-intelligence/rdServiceIntelligence.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "bu_mech", status: "stub", procedureCount: 4 },

  // ===== Platform / Integration =====
  { name: "dingtalk", file: "dingtalk/dingtalk.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "jiandaoyun", file: "routers/jiandaoyun.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 6 },
  { name: "microsoftGraph", file: "services/microsoft-graph.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "o365Sync", file: "services/o365-sync.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "syncDispatch", file: "routers/sync-dispatch.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "sync", file: "sync/sync.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "webhook", file: "routers/webhook.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "taskNotification", file: "meeting-intelligence/webhook-config.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 3 },
  { name: "vectorSearch", file: "services/vector-search.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "gamification", file: "services/gamification.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "performanceTrace", file: "services/performance-trace.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 4 },
  { name: "iotDigitalTwin", file: "services/iot-digital-twin.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "cloudHall", file: "routers/cloud-hall.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "director", status: "beta", procedureCount: 6 },
  { name: "docIntelligence", file: "doc-intelligence/doc-intelligence.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 5 },

  // ===== Strategy =====
  { name: "strategyGoals", file: "routers/strategy-goals.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "director", status: "stub", procedureCount: 3 },
  { name: "okr", file: "routers/okr.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "director", status: "beta", procedureCount: 9 },
  { name: "buSalesTarget", file: "routers/bu-sales-target.router.ts", domain: "sales", authLevel: "public", buScoped: true, owner: "bu_gm", status: "beta", procedureCount: 8 },

  // ===== Miscellaneous =====
  { name: "workspace", file: "routers/workspace.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "employee", status: "beta", procedureCount: 4 },
  { name: "collaborationDocs", file: "routers/collaboration-docs.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "employee", status: "beta", procedureCount: 6 },
  { name: "concurrentCommand", file: "routers/concurrent-command.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 8 },
  { name: "socialPlatformConfig", file: "routers/socialPlatformConfig.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "stub", procedureCount: 3 },
  { name: "uwb", file: "routers/uwb.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "dept_manager", status: "beta", procedureCount: 4 },
  { name: "scheduling", file: "routers/scheduling.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 5 },
  { name: "visitor", file: "visitor-management/visitor.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "capability", file: "capability-management/capability.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 5 },
  { name: "approval", file: "approval/approval.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "dept_manager", status: "production", procedureCount: 6 },
  { name: "oa", file: "routers/oa.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 8 },
  { name: "oaForms", file: "routers/oa-forms.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 17 },
  { name: "dailyPlan", file: "daily-plan/daily-plan.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "employee", status: "beta", procedureCount: 4 },
  { name: "delegation", file: "delegation/delegation.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "dept_manager", status: "production", procedureCount: 5 },
  { name: "pos", file: "pos/pos.router.ts", domain: "pm", authLevel: "public", buScoped: false, owner: "director", status: "beta", procedureCount: 5 },
  { name: "digitalTwin", file: "routers/digital-twin.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 6 },
  { name: "digitalThread", file: "routers/digital-thread.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 8 },
  { name: "vault", file: "routers/vault.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 5 },
  { name: "plm", file: "routers/plm.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 8 },
  { name: "carbonFootprint", file: "routers/carbon-footprint.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 8 },
  { name: "ecoImpact", file: "routers/eco-impact.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 5 },
  { name: "sop", file: "routers/sop-db.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 8 },
  { name: "sopEditor", file: "sop-editor/sopEditor.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "quality_eng", status: "production", procedureCount: 6 },
  { name: "sopInterlock", file: "routers/sop-interlock.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 4 },

  { name: "visionDashboard", file: "routers/vision-dashboard.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "director", status: "beta", procedureCount: 5 },
  { name: "reportCenter", file: "routers/report-center.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "director", status: "beta", procedureCount: 6 },
  { name: "cicd", file: "routers/cicd.router.ts", domain: "platform", authLevel: "admin", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "testEngine", file: "routers/test-engine.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 6 },
  { name: "violationEvent", file: "routers/violation-event.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 6 },
  { name: "automation", file: "routers/automation.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "projectAgent", file: "routers/project-agent.router.ts", domain: "ai", authLevel: "public", buScoped: true, owner: "bu_pm", status: "production", procedureCount: 8 },

  // ===== Gemini Modules =====
  { name: "socialCommunity", file: "modules/socialCommunity.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "socialCommunityEnhanced", file: "modules/socialCommunityEnhanced.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "hr_manager", status: "beta", procedureCount: 5 },
  { name: "personalAgent", file: "modules/personalAgent.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "beta", procedureCount: 5 },
  { name: "personalAgentEnhanced", file: "modules/personalAgentEnhanced.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "beta", procedureCount: 5 },
  { name: "securityEnhanced", file: "modules/securityEnhanced.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "gemini", file: "modules/geminiIntegration.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 8 },
  { name: "changeEvent", file: "modules/changeEvent.router.ts", domain: "pm", authLevel: "public", buScoped: false, owner: "bu_mech", status: "beta", procedureCount: 4 },
  { name: "knowledgeBase", file: "modules/knowledge-base.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "admin", status: "beta", procedureCount: 5 },
  { name: "caseLibrary", file: "meeting-intelligence/case-library.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 4 },

  // ===== Remaining stubs =====
  { name: "feedback", file: "routers/feedback.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "analytics", file: "routers/analytics.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "chatHistory", file: "routers/chat-history.router.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 4 },
  { name: "importHistory", file: "routers/import-history.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "migration", file: "routers/migration.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "devTasks", file: "routers/devTasks.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "questionnaire", file: "routers/questionnaire.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 5 },
  { name: "worker", file: "routers/worker.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 5 },
  { name: "agenda", file: "routers/agenda.router.ts", domain: "meeting", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 5 },
  { name: "naming", file: "routers/naming.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "community", file: "routers/community.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 4 },
  { name: "tripRequest", file: "routers/trip-request.router.ts", domain: "finance", authLevel: "public", buScoped: false, owner: "employee", status: "production", procedureCount: 5 },
  { name: "reportTemplate", file: "routers/report-template.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "taskExecutionLog", file: "routers/task-execution-log.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "processNotebook", file: "routers/process-notebook.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "production", procedureCount: 5 },
  { name: "templateUsageStats", file: "routers/template-usage-stats.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "fieldMapping", file: "routers/field-mapping.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "fieldMappingRecommend", file: "routers/field-mapping-recommend.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "stub", procedureCount: 3 },
  { name: "ruleVersion", file: "routers/rule-version.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "notificationChannelTest", file: "routers/notification-channel-test.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "redBlue", file: "routers/red-blue.router.ts", domain: "hr", authLevel: "public", buScoped: false, owner: "hr_manager", status: "production", procedureCount: 4 },
  { name: "ruleTemplate", file: "routers/rule-template.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "alertRule", file: "routers/alert-rule.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 4 },
  { name: "deadlockMonitor", file: "routers/deadlock-monitor.router.ts", domain: "core", authLevel: "admin", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "reportScheduler", file: "routers/report-scheduler.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "production", procedureCount: 3 },
  { name: "daIntegration", file: "routers/da-integration.router.ts", domain: "platform", authLevel: "public", buScoped: false, owner: "admin", status: "stub", procedureCount: 3 },
  { name: "annualAgenda", file: "annual-agenda/annual-agenda.router.ts", domain: "core", authLevel: "public", buScoped: false, owner: "director", status: "production", procedureCount: 6 },
  { name: "changeManagement", file: "deployment/changeManagement.router.ts", domain: "core", authLevel: "protected", buScoped: false, owner: "admin", status: "production", procedureCount: 5 },
  { name: "timeReconciliation", file: "services/time-reconciliation.router.ts", domain: "manufacturing", authLevel: "public", buScoped: false, owner: "team_lead", status: "beta", procedureCount: 4 },
  { name: "p2Automation", file: "p2-automation/p2Automation.router.ts", domain: "quality", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 8 },
  { name: "purchaseAssistant", file: "ai-assistants/purchaseRoutes.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "procurement_eng", status: "beta", procedureCount: 4 },
  { name: "qualityAssistant", file: "ai-assistants/qualityRoutes.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "quality_eng", status: "beta", procedureCount: 4 },
  { name: "serviceAssistant", file: "ai-assistants/serviceRoutes.ts", domain: "ai", authLevel: "public", buScoped: false, owner: "cs_engineer", status: "beta", procedureCount: 4 },
];

// ===== Manifest Utilities =====

/** Count routers by authLevel */
export function countByAuthLevel(): Record<RouterAuthLevel, number> {
  const counts: Record<RouterAuthLevel, number> = { public: 0, protected: 0, permission: 0, admin: 0 };
  for (const r of ROUTER_MANIFEST) {
    counts[r.authLevel]++;
  }
  return counts;
}

/** Count routers by domain */
export function countByDomain(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of ROUTER_MANIFEST) {
    counts[r.domain] = (counts[r.domain] || 0) + 1;
  }
  return counts;
}

/** Count routers by status */
export function countByStatus(): Record<RouterStatus, number> {
  const counts: Record<RouterStatus, number> = { production: 0, beta: 0, stub: 0 };
  for (const r of ROUTER_MANIFEST) {
    counts[r.status]++;
  }
  return counts;
}

/** List all BU-scoped routers */
export function getBuScopedRouters(): RouterManifest[] {
  return ROUTER_MANIFEST.filter((r) => r.buScoped);
}

/** List routers that should be migrated from public → protected */
export function getPublicRoutersMigrationList(): RouterManifest[] {
  return ROUTER_MANIFEST.filter(
    (r) => r.authLevel === "public" && r.name !== "health" && r.name !== "echo" && r.name !== "auth" && r.name !== "system"
  );
}

/** Total procedure count across all routers */
export function totalProcedureCount(): number {
  return ROUTER_MANIFEST.reduce((sum, r) => sum + r.procedureCount, 0);
}
