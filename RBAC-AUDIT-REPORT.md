# GRT System — RBAC Architecture Audit Report

> **Classification**: CONFIDENTIAL — CEO/CTO Eyes Only
> **Date**: 2026-02-26
> **Author**: CISO & IAM Architect (AI-Assisted)
> **Status**: PENDING CEO REVIEW — Do NOT implement until approved

---

## Table of Contents

1. [System-Wide Permission Audit (Master List)](#1-system-wide-permission-audit)
2. [GRT Organizational Structure](#2-grt-organizational-structure)
3. [Authorization Matrix](#3-authorization-matrix)
4. [Database Schema Proposal](#4-database-schema-proposal)
5. [Critical Security Findings](#5-critical-security-findings)

---

## 1. System-Wide Permission Audit

### Audit Scope
- **135 tRPC router files** scanned
- **423+ API endpoints** catalogued (344 queries, 79 mutations)
- **250+ frontend routes** mapped across 18 business domains
- **49 database schema files** with 661 tables reviewed
- **Existing RBAC**: 11 tables in `permission-schema.ts` (already deployed)

### Master Permission List (Grouped by Business Module)

#### 1.1 SYSTEM ADMINISTRATION (系统管理)
| Permission Code | Description | Actions |
|---|---|---|
| `system:users:view` | View user list and profiles | View |
| `system:users:create` | Create new user accounts | Create |
| `system:users:edit` | Edit user profiles and status | Edit |
| `system:users:delete` | Deactivate/delete user accounts | Delete |
| `system:roles:manage` | Create/edit/delete roles | CRUD |
| `system:permissions:assign` | Assign permissions to roles/users | Edit |
| `system:permissions:blacklist` | Manage permission blacklist | CRUD |
| `system:permissions:temporary` | Grant temporary permissions | Create, Approve |
| `system:audit:view` | View audit logs | View |
| `system:menu:manage` | Manage navigation menu structure | CRUD |
| `system:org:manage` | Manage organization structure | CRUD |
| `system:scheduler:view` | View scheduled jobs | View |
| `system:scheduler:manage` | Create/edit/trigger scheduled jobs | CRUD |
| `system:security:dashboard` | Access security dashboard | View |
| `system:compliance:view` | View compliance dashboard | View |
| `system:compliance:manage` | Manage compliance calendar | CRUD |
| `system:errors:view` | View error logs | View |
| `system:webhooks:manage` | Manage webhook configurations | CRUD |
| `system:notifications:config` | Configure notification channels | CRUD |
| `system:erp:config` | Configure ERP integration | CRUD |
| `system:deployment:manage` | System deployment operations | Execute |
| `system:monitoring:view` | View system monitoring dashboard | View |
| `system:naming:manage` | Manage naming rules | CRUD |
| `system:data:migrate` | Execute data migrations | Execute |
| `system:dingtalk:config` | Configure DingTalk integration | CRUD |
| `system:microsoft:config` | Configure Microsoft Graph settings | CRUD |

#### 1.2 SALES & CRM (市场与销售)
| Permission Code | Description | Actions |
|---|---|---|
| `crm:customers:view` | View customer records | View |
| `crm:customers:create` | Create new customers | Create |
| `crm:customers:edit` | Edit customer information | Edit |
| `crm:customers:delete` | Delete customer records | Delete |
| `crm:opportunities:view` | View sales opportunities | View |
| `crm:opportunities:manage` | Create/edit opportunities | CRUD |
| `crm:contacts:view` | View contacts | View |
| `crm:contacts:manage` | Create/edit contacts | CRUD |
| `crm:leads:view` | View lead pipeline | View |
| `crm:leads:manage` | Create/convert/edit leads | CRUD |
| `crm:quotations:view` | View quotations | View |
| `crm:quotations:create` | Create new quotations | Create |
| `crm:quotations:approve` | Approve/reject quotations | Approve |
| `crm:contracts:view` | View contracts | View |
| `crm:contracts:manage` | Create/edit contracts | CRUD |
| `crm:nda:manage` | Manage NDA/NPA documents | CRUD |
| `crm:materials:view` | View sales materials library | View |
| `crm:analytics:view` | View sales analytics | View |
| `crm:forecast:view` | View AI sales forecast | View |
| `crm:churn:view` | View customer churn predictions | View |
| `crm:portal:access` | Access customer portal | View |

#### 1.3 R&D DESIGN (研发设计)
| Permission Code | Description | Actions |
|---|---|---|
| `rnd:requirements:view` | View requirements | View |
| `rnd:requirements:manage` | Create/edit requirements | CRUD |
| `rnd:solutions:view` | View solution designs | View |
| `rnd:solutions:manage` | Create/edit solution designs | CRUD |
| `rnd:mechanical:view` | View mechanical designs | View |
| `rnd:mechanical:manage` | Create/edit mechanical designs | CRUD |
| `rnd:electrical:view` | View electrical designs | View |
| `rnd:electrical:manage` | Create/edit electrical designs | CRUD |
| `rnd:bom:view` | View BOM structures | View |
| `rnd:bom:manage` | Create/edit/import BOM | CRUD |
| `rnd:bom:verify` | Run BOM verification | Execute |
| `rnd:bom:freeze` | Freeze BOM for production | Approve |
| `rnd:plm:access` | Access PLM workbench | View |
| `rnd:documents:view` | View technical documents | View |
| `rnd:documents:manage` | Upload/edit tech documents | CRUD |
| `rnd:vault:access` | Access project vault | View |
| `rnd:drawings:view` | View drawing library | View |
| `rnd:drawings:manage` | Upload/manage drawings | CRUD |
| `rnd:3d:view` | View 3D models | View |
| `rnd:eco:review` | Review ECO cost impact | Approve |
| `rnd:digital-twin:view` | View digital twin hub | View |

#### 1.4 PROJECT MANAGEMENT (项目管理)
| Permission Code | Description | Actions |
|---|---|---|
| `project:list:view` | View project list | View |
| `project:create` | Create new projects | Create |
| `project:edit` | Edit project details | Edit |
| `project:delete` | Delete/archive projects | Delete |
| `project:stage-gate:view` | View stage gate status | View |
| `project:stage-gate:manage` | Manage stage gate transitions | Execute |
| `project:m1:manage` | Manage M1 kickoff | Execute |
| `project:m7m9:manage` | Manage M7-M9 delivery tracking | Execute |
| `project:tasks:view` | View project tasks (Kanban) | View |
| `project:tasks:manage` | Create/edit/assign tasks | CRUD |
| `project:gantt:view` | View Gantt chart | View |
| `project:risks:view` | View risk register | View |
| `project:risks:manage` | Create/edit/mitigate risks | CRUD |
| `project:sop:view` | View SOP library | View |
| `project:sop:manage` | Create/edit SOPs | CRUD |
| `project:documents:manage` | Manage phase documents | CRUD |
| `project:delivery:manage` | Manage deliverables | CRUD |
| `project:certification:manage` | Manage regional certifications | CRUD |
| `project:compliance:manage` | Manage equipment compliance | CRUD |
| `project:cockpit:view` | View Project 360 cockpit | View |

#### 1.5 MANUFACTURING (生产制造)
| Permission Code | Description | Actions |
|---|---|---|
| `mfg:command:view` | View production command center | View |
| `mfg:dashboard:view` | View production dashboard | View |
| `mfg:process:view` | View process management | View |
| `mfg:process:manage` | Create/edit processes | CRUD |
| `mfg:scheduling:view` | View scheduling | View |
| `mfg:scheduling:run` | Execute scheduling algorithm | Execute |
| `mfg:scheduling:dispatch` | Dispatch tasks to workers | Execute |
| `mfg:steps:view` | View production steps | View |
| `mfg:steps:manage` | Create/edit production steps | CRUD |
| `mfg:execution:view` | View production execution | View |
| `mfg:execution:report` | Report work events | Create |
| `mfg:qc:view` | View QC records | View |
| `mfg:qc:manage` | Create/edit QC inspections | CRUD |
| `mfg:qc:approve` | Approve QC results | Approve |
| `mfg:spc:view` | View SPC control charts | View |
| `mfg:ncr:view` | View NCR non-conformances | View |
| `mfg:ncr:manage` | Create/edit NCRs | CRUD |
| `mfg:interlock:manage` | Manage quality interlocks | CRUD |
| `mfg:ppap:manage` | Manage PPAP packages | CRUD |
| `mfg:fmea:view` | View FMEA analysis | View |
| `mfg:fmea:manage` | Create/edit FMEA | CRUD |
| `mfg:8d:manage` | Manage 8D/CAPA workbench | CRUD |
| `mfg:msa:manage` | Manage MSA analysis | CRUD |
| `mfg:control-plan:manage` | Manage control plans | CRUD |
| `mfg:safety:manage` | Manage safety rules | CRUD |
| `mfg:materials:view` | View material tracking | View |
| `mfg:materials:manage` | Manage material flow | CRUD |
| `mfg:inventory:view` | View inventory dashboard | View |
| `mfg:inventory:manage` | Manage inventory optimization | CRUD |
| `mfg:workers:view` | View worker management | View |
| `mfg:workers:manage` | Create/edit worker records | CRUD |
| `mfg:workers:import` | Import worker data | Execute |
| `mfg:workers:performance` | View worker performance | View |
| `mfg:shift:manage` | Manage shift handover records | CRUD |
| `mfg:kiosk:access` | Access workshop kiosk terminal | View |
| `mfg:machine:login` | Machine access login | Execute |
| `mfg:oee:view` | View OEE dashboard | View |
| `mfg:fat:manage` | Manage FAT coordination | CRUD |
| `mfg:sat:execute` | Execute FAT/SAT testing | Execute |
| `mfg:uwb:view` | View UWB positioning data | View |
| `mfg:uwb:manage` | Manage UWB devices/zones | CRUD |
| `mfg:ccd:view` | View CCD integration data | View |
| `mfg:daily-report:view` | View production daily report | View |
| `mfg:efficiency:view` | View production efficiency | View |
| `mfg:exceptions:view` | View exception reports | View |
| `mfg:cleanliness:manage` | Manage cleanliness inspections | CRUD |
| `mfg:certificate:generate` | Generate product certificates | Execute |
| `mfg:monthly-report:view` | View quality monthly report | View |
| `mfg:process-trials:manage` | Manage process trial workbench | CRUD |

#### 1.6 SUPPLY CHAIN (供应链)
| Permission Code | Description | Actions |
|---|---|---|
| `supply:workbench:view` | View supply chain workbench | View |
| `supply:materials:view` | View material management | View |
| `supply:materials:manage` | Manage materials | CRUD |
| `supply:procurement:view` | View procurement | View |
| `supply:procurement:manage` | Create/edit procurement orders | CRUD |
| `supply:procurement:approve` | Approve procurement requests | Approve |
| `supply:warehouse:view` | View warehouse management | View |
| `supply:warehouse:manage` | Manage warehouse operations | CRUD |
| `supply:planning:view` | View supply chain planning | View |
| `supply:rfq:manage` | Manage RFQ kanban | CRUD |
| `supply:spares:manage` | Manage spare parts | CRUD |
| `supply:risk:view` | View supplier risk radar | View |
| `supply:supplier:assess` | Conduct supplier assessments | CRUD |
| `supply:erp:view` | View ERP integration data | View |
| `supply:inventory:optimize` | Run inventory optimization | Execute |

#### 1.7 CUSTOMER SERVICE (客户服务)
| Permission Code | Description | Actions |
|---|---|---|
| `service:workbench:view` | View after-sales workbench | View |
| `service:installation:manage` | Manage field installations | CRUD |
| `service:sat:manage` | Manage SAT testing | CRUD |
| `service:acceptance:manage` | Manage final acceptance | CRUD |
| `service:tickets:view` | View service tickets | View |
| `service:tickets:manage` | Create/edit service tickets | CRUD |
| `service:feedback:view` | View customer feedback | View |
| `service:feedback:manage` | Respond to customer feedback | CRUD |
| `service:field:dashboard` | Access field engineer dashboard | View |
| `service:diagnosis:use` | Use AI fault diagnosis | Execute |
| `service:maintenance:plan` | Use AI maintenance planning | Execute |
| `service:remote:assist` | Use AI remote assistance | Execute |
| `service:sla:view` | View SLA dashboard | View |
| `service:nps:manage` | Manage NPS surveys | CRUD |
| `service:repair:portal` | Access customer repair portal | View |
| `service:kb:feedback` | Feed tickets to knowledge base | Execute |

#### 1.8 HUMAN RESOURCES (人力资源)
| Permission Code | Description | Actions |
|---|---|---|
| `hr:employees:view` | View employee list | View |
| `hr:employees:create` | Create employee records | Create |
| `hr:employees:edit` | Edit employee records | Edit |
| `hr:employees:delete` | Deactivate employee records | Delete |
| `hr:employees:import` | Bulk import employees | Execute |
| `hr:recruitment:view` | View recruitment pipeline | View |
| `hr:recruitment:manage` | Manage recruitment | CRUD |
| `hr:attendance:view` | View attendance records | View |
| `hr:attendance:manage` | Manage attendance | CRUD |
| `hr:offboarding:manage` | Manage employee offboarding | CRUD |
| `hr:lifecycle:view` | View HR lifecycle | View |
| `hr:performance:self` | View own performance | View |
| `hr:performance:team` | View team performance | View |
| `hr:performance:dept` | View department performance | View |
| `hr:performance:bu` | View BU performance overview | View |
| `hr:performance:manage` | Edit/manage KPI assignments | CRUD |
| `hr:compensation:view` | View own compensation | View |
| `hr:compensation:manage` | Manage compensation records | CRUD |
| `hr:salary:approve` | Approve salary changes | Approve |
| `hr:salary:report` | View salary reports | View |
| `hr:bonus:manage` | Manage bonus allocations | CRUD |
| `hr:delegation:manage` | Manage delegation settings | CRUD |
| `hr:training:view` | View training catalog | View |
| `hr:training:manage` | Manage training programs | CRUD |
| `hr:compliance:view` | View labor compliance | View |
| `hr:bu-team:manage` | Manage BU team composition | CRUD |
| `hr:visitor:request` | Submit visitor requests | Create |
| `hr:status:manage` | Manage user status | CRUD |
| `hr:planning:annual` | Manage annual planning | CRUD |
| `hr:supervisor:dashboard` | Access supervisor workbench | View |

#### 1.9 CAPABILITY SYSTEM (能力体系)
| Permission Code | Description | Actions |
|---|---|---|
| `capability:profile:self` | View own capability profile | View |
| `capability:profile:others` | View others' capability profiles | View |
| `capability:dashboard:view` | View capability dashboard | View |
| `capability:matrix:view` | View capability matrix board | View |
| `capability:matrix:manage` | Manage capability matrix | CRUD |
| `capability:certificates:view` | View certificates | View |
| `capability:certificates:manage` | Issue/revoke certificates | CRUD |
| `capability:badges:view` | View badges | View |
| `capability:badges:award` | Award badges | Create |
| `capability:path:view` | View learning path | View |
| `capability:leaderboard:view` | View leaderboard | View |
| `capability:evidence:submit` | Submit evidence | Create |
| `capability:evidence:review` | Review submitted evidence | Approve |

#### 1.10 FINANCE (财务管理)
| Permission Code | Description | Actions |
|---|---|---|
| `finance:expense:view` | View own expense reports | View |
| `finance:expense:create` | Create expense reports | Create |
| `finance:expense:approve` | Approve expense reports | Approve |
| `finance:trip:view` | View trip requests | View |
| `finance:trip:create` | Create trip requests | Create |
| `finance:trip:approve` | Approve trip requests | Approve |
| `finance:travel:dashboard` | View travel dashboard | View |
| `finance:budget:view` | View budget allocations | View |
| `finance:budget:manage` | Manage budgets | CRUD |
| `finance:budget:approve` | Approve budget overruns | Approve |
| `finance:cost:view` | View cost management | View |
| `finance:cost:manage` | Manage cost entries | CRUD |
| `finance:cost:standards` | Configure cost standards | CRUD |
| `finance:analytics:view` | View AI budget analysis | View |
| `finance:vat:calculator` | Use VAT calculator | Execute |

#### 1.11 AI INTELLIGENCE (AI助手)
| Permission Code | Description | Actions |
|---|---|---|
| `ai:hub:access` | Access AI hub | View |
| `ai:assistant:chat` | Use AI chat assistant | Execute |
| `ai:kpi:assistant` | Use AI KPI assistant | Execute |
| `ai:purchase:assistant` | Use AI purchase assistant | Execute |
| `ai:quality:assistant` | Use AI quality assistant | Execute |
| `ai:service:assistant` | Use AI service assistant | Execute |
| `ai:warning:view` | View AI early warnings | View |
| `ai:risk:view` | View AI risk predictions | View |
| `ai:rag:train` | Train knowledge base (RAG) | Execute |
| `ai:rag:query` | Query knowledge base | Execute |
| `ai:cases:view` | View historical cases | View |
| `ai:diagnostic:use` | Use AI diagnostic system | Execute |
| `ai:effectiveness:view` | View AI effectiveness tracking | View |
| `ai:accuracy:admin` | Access AI accuracy dashboard | View |
| `ai:models:monitor` | Monitor model performance | View |
| `ai:models:train` | Schedule model training | Execute |
| `ai:knowledge-graph:manage` | Manage knowledge graph | CRUD |
| `ai:genesis:access` | Access AI Genesis workspace | View |
| `ai:genesis:generate` | Generate AI proposals | Execute |
| `ai:genesis:approve` | Approve AI-generated proposals | Approve |
| `ai:agents:manage` | Manage AI agent fleet | CRUD |
| `ai:provisioning:manage` | Manage AI assistant provisioning | CRUD |
| `ai:localizer:use` | Use AI content localizer | Execute |
| `ai:security:governance` | AI security & governance | CRUD |

#### 1.12 AI DEVOPS (AI DevOps)
| Permission Code | Description | Actions |
|---|---|---|
| `devops:matrix:view` | View dual AI collaboration matrix | View |
| `devops:concurrent:view` | View concurrent command center | View |
| `devops:concurrent:operate` | Claim/debug/mark-passed in CCC | Execute |
| `devops:concurrent:approve` | Approve merges in CCC | Approve |
| `devops:gemini:view` | View Gemini spec | View |
| `devops:simulator:access` | Access simulator | Execute |
| `devops:deployment:manage` | Manage system deployment | Execute |
| `devops:effectiveness:view` | View AI effectiveness | View |

#### 1.13 STRATEGIC PLANNING (战略规划)
| Permission Code | Description | Actions |
|---|---|---|
| `strategy:hub:access` | Access strategy hub | View |
| `strategy:okr:view` | View OKR matrix | View |
| `strategy:okr:manage` | Create/edit OKRs | CRUD |
| `strategy:certification:manage` | Manage certifications | CRUD |
| `strategy:agenda:view` | View annual agenda | View |
| `strategy:agenda:manage` | Manage annual agenda | CRUD |
| `strategy:growth:view` | View global growth tracker | View |
| `strategy:change:manage` | Manage change governance | CRUD |

#### 1.14 SMART OA (办公自动化)
| Permission Code | Description | Actions |
|---|---|---|
| `oa:forms:view` | View form directory | View |
| `oa:forms:manage` | Create/edit forms | CRUD |
| `oa:dashboard:view` | View OA command center | View |
| `oa:questionnaire:manage` | Manage questionnaires | CRUD |
| `oa:meeting:view` | View morning meeting board | View |
| `oa:reports:view` | View briefing center | View |
| `oa:reports:manage` | Create/edit reports | CRUD |
| `oa:vision:lobby` | View lobby global screen | View |
| `oa:vision:shopfloor` | View shopfloor master board | View |

#### 1.15 COLLABORATION (协作)
| Permission Code | Description | Actions |
|---|---|---|
| `collab:docs:view` | View collaboration documents | View |
| `collab:docs:manage` | Create/edit documents | CRUD |
| `collab:spreadsheet:view` | View spreadsheets | View |
| `collab:spreadsheet:edit` | Edit spreadsheets | Edit |
| `collab:community:access` | Access community | View |
| `collab:community:post` | Post in community | Create |
| `collab:workspace:view` | View workspaces | View |
| `collab:workspace:manage` | Manage workspaces | CRUD |
| `collab:meeting:hub` | Access meeting hub | View |
| `collab:cross-border:sync` | Cross-border data sync | Execute |

#### 1.16 POS SYSTEM (POS)
| Permission Code | Description | Actions |
|---|---|---|
| `pos:dashboard:view` | View POS dashboard | View |
| `pos:projects:manage` | Manage POS projects | CRUD |
| `pos:customers:manage` | Manage POS customers | CRUD |
| `pos:procurement:manage` | Manage POS procurement | CRUD |
| `pos:mes:sync` | POS MES synchronization | Execute |
| `pos:connectors:config` | Configure POS connectors | CRUD |

#### 1.17 WORKSPACE (个人工作台)
| Permission Code | Description | Actions |
|---|---|---|
| `workspace:dashboard:view` | View personal dashboard | View |
| `workspace:profile:view` | View own profile | View |
| `workspace:profile:edit` | Edit own profile | Edit |
| `workspace:notifications:view` | View notifications | View |
| `workspace:favorites:manage` | Manage favorites | CRUD |
| `workspace:preferences:manage` | Manage preferences | CRUD |

**Total Discrete Permissions: 278**

---

## 2. GRT Organizational Structure

### 2.1 Role Hierarchy

```
Level 10 ─── Super Admin / System Root
  │
Level 8 ──── CEO / CTO (Executive)
  │
Level 7 ──── VP of Operations / VP of Engineering
  │
Level 5 ──── Department Director / BU Head
  │           ├── HR Director
  │           ├── Sales Director
  │           ├── Manufacturing Director
  │           ├── R&D Director
  │           ├── Supply Chain Director
  │           ├── Finance Director
  │           ├── Quality Director
  │           └── Service Director
  │
Level 3 ──── Team Lead / Manager
  │           ├── Project Manager
  │           ├── Engineering Lead
  │           ├── Production Supervisor
  │           ├── QC Manager
  │           ├── Sales Manager
  │           └── HR Manager
  │
Level 2 ──── Senior Specialist
  │           ├── Senior Engineer
  │           ├── Senior Sales Rep
  │           ├── Senior QC Inspector
  │           └── Senior Accountant
  │
Level 1 ──── Member / Staff
  │           ├── Engineer
  │           ├── Sales Representative
  │           ├── QC Inspector
  │           ├── Procurement Officer
  │           ├── Accountant
  │           ├── HR Specialist
  │           └── Production Worker
  │
Level 0 ──── Guest / External
              ├── Customer Portal User
              ├── Supplier Portal User
              ├── Visitor
              └── Auditor (External)
```

### 2.2 Defined Roles (14 Roles)

| # | Role Code | Display Name | Display Name (中文) | Level | Category | Data Scope |
|---|---|---|---|---|---|---|
| 1 | `super_admin` | Super Admin | 超级管理员 | 10 | system | all |
| 2 | `ceo` | CEO / CTO | 总经理/技术总监 | 8 | executive | all |
| 3 | `vp` | Vice President | 副总裁 | 7 | executive | all |
| 4 | `director` | Department Director | 部门总监 | 5 | management | department |
| 5 | `hr_director` | HR Director | 人力资源总监 | 5 | management | all_employees |
| 6 | `sales_director` | Sales Director | 销售总监 | 5 | management | department |
| 7 | `project_manager` | Project Manager | 项目经理 | 3 | operations | project_team |
| 8 | `production_supervisor` | Production Supervisor | 生产主管 | 3 | operations | department |
| 9 | `qc_manager` | QC Manager | 质量经理 | 3 | operations | department |
| 10 | `engineer` | Engineer | 工程师 | 1 | technical | self+project |
| 11 | `sales_rep` | Sales Representative | 销售代表 | 1 | business | self+assigned |
| 12 | `floor_operator` | Floor Operator | 车间操作员 | 1 | operations | self |
| 13 | `customer` | Customer Portal | 客户 | 0 | external | own_data |
| 14 | `guest` | Guest / Visitor | 访客 | 0 | external | none |

---

## 3. Authorization Matrix

### Legend
| Symbol | Meaning |
|---|---|
| ✅ | Full Access (CRUD) |
| 👁️ | View Only (Read) |
| ✍️ | View + Edit (Read + Write) |
| 👑 | Approve (requires approval authority) |
| 🚀 | Execute (trigger actions, run algorithms) |
| ❌ | No Access |

### 3.1 SYSTEM ADMINISTRATION

| Permission | Super Admin | CEO/CTO | VP | Director | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Users & Roles | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Permissions Assign | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Menu Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Org Structure | ✅ | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Scheduler/Jobs | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Security Dashboard | ✅ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Compliance | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ERP Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Deploy | ✅ | 🚀 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Temp Permissions | ✅ | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Blacklist | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.2 SALES & CRM

| Permission | Super Admin | CEO/CTO | VP | Sales Dir | PM | Engineer | Sales Rep | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Customers View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | ❌ | ❌ | ❌ |
| Customers Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✍️ | ❌ | ❌ | ❌ |
| Opportunities | ✅ | 👁️ | 👁️ | ✅ | 👁️ | ❌ | ✍️ | ❌ | ❌ | ❌ |
| Leads | ✅ | 👁️ | 👁️ | ✅ | ❌ | ❌ | ✍️ | ❌ | ❌ | ❌ |
| Quotations View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | ❌ | ❌ | ❌ |
| Quotations Create | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✍️ | ❌ | ❌ | ❌ |
| Quotations Approve | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Contracts | ✅ | 👑 | 👑 | ✅ | 👁️ | ❌ | 👁️ | ❌ | ❌ | ❌ |
| NDA/NPA | ✅ | 👑 | 👑 | ✅ | ❌ | ❌ | 👁️ | ❌ | ❌ | ❌ |
| Sales Analytics | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | 👁️ | ❌ | ❌ | ❌ |
| AI Forecast | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Customer Portal | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁️ | ❌ |

### 3.3 R&D DESIGN

| Permission | Super Admin | CEO/CTO | VP | R&D Dir | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Requirements | ✅ | 👁️ | 👁️ | ✅ | ✍️ | ✍️ | 👁️ | ❌ | ❌ | ❌ |
| Solution Design | ✅ | 👁️ | 👁️ | ✅ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Mechanical Design | ✅ | ❌ | ❌ | ✅ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Electrical Design | ✅ | ❌ | ❌ | ✅ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| BOM View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| BOM Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| BOM Freeze | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PLM Access | ✅ | 👁️ | 👁️ | ✅ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Tech Documents | ✅ | 👁️ | 👁️ | ✅ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Drawing Library | ✅ | ❌ | ❌ | ✅ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| 3D Models | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| ECO Review | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Digital Twin | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |

### 3.4 PROJECT MANAGEMENT

| Permission | Super Admin | CEO/CTO | VP | Director | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Project List | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ |
| Project Create | ✅ | ✍️ | ✍️ | ✍️ | ✍️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Project Edit | ✅ | ✍️ | ✍️ | ✍️ | ✍️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Project Delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stage Gate | ✅ | 👑 | 👑 | 👑 | ✍️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| M1 Kickoff | ✅ | 👑 | 👑 | ✍️ | ✍️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| Tasks Kanban | ✅ | 👁️ | 👁️ | 👁️ | ✅ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Gantt Chart | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| Risks | ✅ | 👁️ | 👁️ | 👁️ | ✅ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| SOP Library | ✅ | 👁️ | 👁️ | ✅ | ✍️ | 👁️ | ❌ | 👁️ | ❌ | ❌ |
| Deliverables | ✅ | 👁️ | 👁️ | 👁️ | ✅ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Project Cockpit | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.5 MANUFACTURING

| Permission | Super Admin | CEO/CTO | VP | Mfg Dir | PM | Engineer | QC Mgr | Prod Supv | Operator | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Command Center | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ |
| Process Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ✍️ | 👁️ | 👁️ | ❌ | ❌ |
| Scheduling Run | ✅ | ❌ | ❌ | 🚀 | ❌ | ❌ | ❌ | 🚀 | ❌ | ❌ |
| Dispatch Workers | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🚀 | ❌ | ❌ |
| Production Steps | ✅ | ❌ | ❌ | ✅ | ❌ | ✍️ | 👁️ | ✍️ | 👁️ | ❌ |
| Work Report | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✍️ | 🚀 | ❌ |
| QC Inspections | ✅ | ❌ | ❌ | 👁️ | ❌ | ❌ | ✅ | 👁️ | ❌ | ❌ |
| QC Approve | ✅ | ❌ | ❌ | 👑 | ❌ | ❌ | 👑 | ❌ | ❌ | ❌ |
| SPC Charts | ✅ | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | 👁️ | 👁️ | ❌ | ❌ |
| NCR Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ✍️ | ✅ | 👁️ | ❌ | ❌ |
| PPAP | ✅ | ❌ | ❌ | 👑 | ❌ | ✍️ | ✍️ | ❌ | ❌ | ❌ |
| FMEA | ✅ | ❌ | ❌ | 👁️ | ❌ | ✍️ | ✍️ | ❌ | ❌ | ❌ |
| 8D/CAPA | ✅ | ❌ | ❌ | 👁️ | ❌ | ✍️ | ✅ | ❌ | ❌ | ❌ |
| Control Plan | ✅ | ❌ | ❌ | 👑 | ❌ | ✍️ | ✍️ | ❌ | ❌ | ❌ |
| Safety Rules | ✅ | ❌ | ❌ | ✅ | ❌ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ |
| Materials | ✅ | 👁️ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ | ✍️ | 👁️ | ❌ |
| Inventory | ✅ | 👁️ | 👁️ | ✅ | ❌ | ❌ | ❌ | 👁️ | ❌ | ❌ |
| Workers Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✍️ | ❌ | ❌ |
| Worker Perf | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | 👁️ | ❌ | ❌ |
| Kiosk Access | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁️ | 🚀 | ❌ |
| OEE Dashboard | ✅ | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | 👁️ | 👁️ | ❌ | ❌ |
| FAT/SAT | ✅ | 👁️ | 👁️ | ✅ | ✍️ | ✍️ | 👁️ | ❌ | ❌ | ❌ |
| UWB Tracking | ✅ | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | ❌ | 👁️ | ❌ | ❌ |
| Daily Report | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | 👁️ | ❌ | ❌ |
| Shift Handover | ✅ | ❌ | ❌ | 👁️ | ❌ | ❌ | ❌ | ✍️ | ✍️ | ❌ |

### 3.6 SUPPLY CHAIN

| Permission | Super Admin | CEO/CTO | VP | Supply Dir | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Workbench | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Materials | ✅ | 👁️ | 👁️ | ✅ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| Procurement View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Procurement Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Procurement Approve | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Warehouse | ✅ | 👁️ | 👁️ | ✅ | ❌ | ❌ | ❌ | 👁️ | ❌ | ❌ |
| SC Planning | ✅ | 👁️ | 👁️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| RFQ Kanban | ✅ | 👁️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Spare Parts | ✅ | 👁️ | ❌ | ✅ | ❌ | ❌ | ❌ | 👁️ | ❌ | ❌ |
| Supplier Risk | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ERP Data | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.7 CUSTOMER SERVICE

| Permission | Super Admin | CEO/CTO | VP | Service Dir | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| After-Sales WB | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Installation | ✅ | ❌ | ❌ | ✅ | ✍️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| SAT Testing | ✅ | ❌ | ❌ | ✅ | ✍️ | ✍️ | ❌ | ❌ | ❌ | ❌ |
| Acceptance | ✅ | 👑 | 👑 | 👑 | ✍️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tickets View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | ❌ |
| Tickets Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ✍️ | ❌ | ❌ | ✍️ | ❌ |
| Feedback | ✅ | 👁️ | 👁️ | ✅ | ❌ | 👁️ | 👁️ | ❌ | ✍️ | ❌ |
| AI Diagnosis | ✅ | ❌ | ❌ | 🚀 | ❌ | 🚀 | ❌ | ❌ | ❌ | ❌ |
| SLA Dashboard | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Repair Portal | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚀 | ❌ |

### 3.8 HUMAN RESOURCES

| Permission | Super Admin | CEO/CTO | VP | HR Dir | Director | PM | Engineer | Sales | Operator | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Employees View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| Employees Manage | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Recruitment | ✅ | 👁️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Attendance | ✅ | 👁️ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ |
| Perf: Self | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ |
| Perf: Team | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| Perf: Dept | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Perf: BU | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Compensation View | ✅ | ❌ | ❌ | 👁️ | ❌ | ❌ | 👁️* | 👁️* | 👁️* | ❌ |
| Compensation Manage | ✅ | 👑 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Salary Approve | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Training | ✅ | 👁️ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ |
| Offboarding | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| BU Teams | ✅ | 👁️ | 👁️ | ✅ | ✍️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Labor Compliance | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> *👁️ = own data only (self scope)*

### 3.9 FINANCE

| Permission | Super Admin | CEO/CTO | VP | Finance Dir | Director | PM | Engineer | Sales | Operator | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Expense: Own | ✅ | ✍️ | ✍️ | 👁️ | ✍️ | ✍️ | ✍️ | ✍️ | ✍️ | ❌ |
| Expense: Approve | ✅ | 👑 | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Trip Requests | ✅ | ✍️ | ✍️ | 👁️ | ✍️ | ✍️ | ✍️ | ✍️ | ❌ | ❌ |
| Trip Approve | ✅ | 👑 | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Budget View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| Budget Manage | ✅ | 👑 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Budget Overrun | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cost Manage | ✅ | 👁️ | 👁️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cost Standards | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Analytics | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.10 AI INTELLIGENCE & DEVOPS

| Permission | Super Admin | CEO/CTO | VP | Director | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| AI Hub Access | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ |
| AI Chat | ✅ | 🚀 | 🚀 | 🚀 | 🚀 | 🚀 | 🚀 | ❌ | ❌ | ❌ |
| RAG Train | ✅ | 🚀 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| RAG Query | ✅ | 🚀 | 🚀 | 🚀 | 🚀 | 🚀 | 🚀 | ❌ | ❌ | ❌ |
| AI Genesis | ✅ | ✅ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Genesis Approve | ✅ | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Agent Fleet | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Model Monitor | ✅ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Model Train | ✅ | 🚀 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Security | ✅ | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CCC View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| CCC Operate | ✅ | ❌ | ❌ | 🚀 | 🚀 | 🚀 | ❌ | ❌ | ❌ | ❌ |
| CCC Merge Approve | ✅ | 👑 | 👑 | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Accuracy Admin | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Knowledge Graph | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.11 STRATEGIC PLANNING

| Permission | Super Admin | CEO/CTO | VP | Director | PM | Engineer | Sales | Operator | Customer | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Strategy Hub | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| OKR View | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ |
| OKR Manage | ✅ | ✅ | ✍️ | ✍️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Annual Agenda | ✅ | ✅ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change Govern | ✅ | 👑 | 👑 | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Growth Tracker | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Database Schema Proposal

### 4.1 Current State Assessment

The existing RBAC infrastructure in `drizzle/permission-schema.ts` is **solid and well-designed**. It already contains 11 tables:

| Table | Purpose | Status |
|---|---|---|
| `grt_user_permissions` | User-level permission cache | ✅ Keep |
| `grt_roles` | Role definitions (with level 0-10) | ✅ Keep |
| `grt_permissions` | Permission registry (code, module, action) | ✅ Keep |
| `grt_role_permissions` | Role ↔ Permission many-to-many | ✅ Keep |
| `grt_user_roles` | User ↔ Role assignment (with expiry) | ✅ Keep |
| `grt_data_scopes` | Data access boundaries | ✅ Keep |
| `grt_permission_audit_logs` | Audit trail | ✅ Keep |
| `grt_temporary_permissions` | Time-boxed permission grants | ✅ Keep |
| `grt_qualification_certificates` | Professional certifications | ✅ Keep |
| `grt_permission_blacklist` | Access denial rules | ✅ Keep |
| `grt_permission_configs` | System-level config KV store | ✅ Keep |

### 4.2 Recommended Additions (3 New Tables)

The existing schema covers roles, permissions, and data scopes. What's missing:

#### Table A: `grt_approval_workflows` — Multi-step approval chains

```typescript
export const approvalWorkflows = pgTable('grt_approval_workflows', {
  id: serial().primaryKey(),

  // Workflow definition
  name: varchar('name', { length: 128 }).notNull(),
  module: varchar('module', { length: 64 }).notNull(),      // e.g. 'crm', 'finance', 'mfg'
  triggerAction: varchar('trigger_action', { length: 128 }).notNull(), // e.g. 'quotation:approve'

  // Approval chain (ordered JSON array of step definitions)
  // Each step: { stepOrder, roleRequired, minLevel, isOptional, escalationHours }
  steps: json('steps').$type<ApprovalStep[]>().notNull(),

  // Thresholds (e.g. amount > 50000 → require VP approval)
  thresholdRules: json('threshold_rules').$type<ThresholdRule[]>(),

  // Status
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Table B: `grt_approval_instances` — Running approval requests

```typescript
export const approvalInstances = pgTable('grt_approval_instances', {
  id: serial().primaryKey(),

  // Link to workflow definition
  workflowId: integer('workflow_id').references(() => approvalWorkflows.id).notNull(),

  // What's being approved
  entityType: varchar('entity_type', { length: 64 }).notNull(),  // 'quotation', 'expense', 'po'
  entityId: varchar('entity_id', { length: 64 }).notNull(),

  // Current state
  currentStep: integer('current_step').default(0).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  // 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired' | 'cancelled'

  // Requestor
  requestedBy: varchar('requested_by', { length: 64 }).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),

  // Resolution
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 64 }),
  resolutionComment: text('resolution_comment'),

  // Step history (JSON array of completed steps with timestamps, actors, comments)
  stepHistory: json('step_history').$type<StepHistoryEntry[]>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Table C: `grt_route_permissions` — Frontend route → required permission mapping

```typescript
export const routePermissions = pgTable('grt_route_permissions', {
  id: serial().primaryKey(),

  // Route pattern (e.g. '/crm/customers', '/mfg/*')
  routePattern: varchar('route_pattern', { length: 256 }).notNull(),

  // Required permission code (FK to grt_permissions.code)
  requiredPermission: varchar('required_permission', { length: 128 }).notNull(),

  // Minimum role level required (0-10)
  minLevel: integer('min_level').default(0).notNull(),

  // Allowed roles (JSON array, null = any authenticated role)
  allowedRoles: json('allowed_roles').$type<string[]>(),

  // Whether this is a menu item (visible in navigation)
  isMenuItem: boolean('is_menu_item').default(true),

  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 4.3 Schema Summary

| Category | Tables | Status |
|---|---|---|
| Existing RBAC core | 11 | Already deployed |
| New: Approval Workflows | 2 | Proposed |
| New: Route Permissions | 1 | Proposed |
| **Total** | **14** | |

### 4.4 Migration Strategy

1. **Phase 1 (Immediate)**: Seed `grt_permissions` table with the 278 permission codes from Section 1
2. **Phase 2 (Week 1)**: Seed `grt_roles` with the 14 roles from Section 2
3. **Phase 3 (Week 1)**: Populate `grt_role_permissions` from the Authorization Matrix (Section 3)
4. **Phase 4 (Week 2)**: Create the 3 new tables + migrate route-level checks
5. **Phase 5 (Week 2-3)**: Enforce `protectedProcedure` on all currently-public endpoints
6. **Phase 6 (Week 3-4)**: Add granular permission checks in each tRPC router middleware

---

## 5. Critical Security Findings

### 5.1 HIGH — Unauthenticated Public Endpoints

The following **mutation endpoints** use `publicProcedure` (NO authentication required). Any anonymous user on the network can call them:

| Router | Endpoint | Risk |
|---|---|---|
| `uwb.router.ts` | `reportLocation` | Location data injection |
| `uwb.router.ts` | `reportBatchLocations` | Bulk location spoofing |
| `uwb.router.ts` | `updateTagBattery` | Battery status manipulation |
| `employee.router.ts` | (all reads are public) | Employee data exposure |
| `project.router.ts` | (all reads are public) | Project data exposure |
| `questionnaire.router.ts` | (most reads are public) | Questionnaire data exposure |

**Recommendation**: Immediately upgrade all mutations to `protectedProcedure`. Public read endpoints should be evaluated case-by-case.

### 5.2 MEDIUM — Only 1 Router Uses `adminProcedure`

Out of 135 routers, only `bu-mapping.router.ts` uses `adminProcedure` (7 endpoints). All other administrative operations (user management, system config, deployment) rely on `protectedProcedure` with no role-level check.

**Recommendation**: Create a middleware chain: `publicProcedure` → `protectedProcedure` → `roleProcedure(minLevel)` → `adminProcedure`. Apply consistently.

### 5.3 MEDIUM — No Granular Permission Checks

Current tRPC middleware only checks "is user authenticated?" — it does NOT check "does this user have permission X for module Y?" The 278 permissions catalogued above are not yet enforced at the API layer.

**Recommendation**: Implement a `requirePermission('crm:customers:edit')` middleware that checks `grt_role_permissions` at query time.

### 5.4 LOW — Data Scope Not Enforced

The `grt_data_scopes` table exists but is not wired to any query filters. A Sales Rep can currently see all customers across all regions, not just their assigned ones.

**Recommendation**: Add data scope filters to all list/search queries based on the user's `dataScope` configuration.

---

## CEO Action Required

**This document represents the DESIGN PHASE only.** No enforcement code has been written.

### Before proceeding, please review and confirm:

1. **Role List (Section 2)**: Are the 14 roles correct? Should any be added/removed/renamed?
2. **Permission Granularity (Section 1)**: Are 278 permissions too fine-grained or not enough? Should any modules be combined?
3. **Authorization Matrix (Section 3)**: Please verify each cell. A single incorrect ✅ vs ❌ = security breach or workflow blocker.
4. **Critical Findings (Section 5)**: Prioritize fixes — which public endpoints should be locked down first?
5. **Approval Workflow (Section 4.2)**: Do you want multi-step approval chains, or is single-approver sufficient?

### Once approved, the implementation order will be:
1. Seed permissions + roles into existing DB tables
2. Create route-permission mapping
3. Add middleware enforcement to all 135 routers
4. Build approval workflow engine
5. Full integration test with each role

**AWAITING CEO REVIEW — DO NOT IMPLEMENT UNTIL APPROVED**

---

*Generated by CISO AI Architect | GRT System RBAC Audit v1.0*
