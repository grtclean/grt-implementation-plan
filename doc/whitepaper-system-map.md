# GRT System 5.0 Technical Whitepaper — Code-Level System Map

> Auto-generated mapping between the whitepaper architecture and production code.
> Every claim in the whitepaper has a real file, real procedure, and real DB table behind it.

---

## Part 1: Embodied AI Closed-Loop (具身智能清洗闭环)

### 1.1 Dual Closed-Loop: Vision Alignment + Torque Feedback

| Whitepaper Claim | Code Location | Verification |
|---|---|---|
| $Pos_{offset} < 0.5\text{mm}$ | `server/services/oiling-control-guard.service.ts:13` → `POSE_THRESHOLD_MM = 0.5` | 3D Euclidean: $\sqrt{(\Delta x)^2 + (\Delta y)^2 + (\Delta z)^2}$ |
| $T < 12\text{Nm}$ target | `server/services/oiling-control-guard.service.ts:46` → `torqueTarget` param | Configurable per reading; hard cap at `TORQUE_THRESHOLD_NM = 15.0` |
| VED Score (0-100) | `computeVedScore()` lines 40-67 | $VED = 0.4 \cdot S_{torque} + 0.4 \cdot S_{pose} + 0.2 \cdot S_{cycle}$ |

**VED Score Breakdown:**

```
Torque (40 pts):  S_torque = max(0, 40 × (1 - |T_actual - T_target| / T_target × 5))
Pose   (40 pts):  S_pose   = max(0, 40 × (1 - ΔPos / 0.5))
Cycle  (20 pts):  S_cycle  = 20 if t ≤ 30s, else max(0, 20 × (1 - (t/30 - 1)))
```

**Data Flow:**

```
Robot Oiling Action
  → checkOilingControl(reading)           # server/services/oiling-control-guard.service.ts
    → computeVedScore()                   # Pure function, no I/O
    → INSERT robot_condition_alerts       # drizzle/robot-fleet-schema.ts
    → INSERT tech_performance_entries     # drizzle/robot-cleaning-performance-schema.ts
    → INSERT aei_contribution_logs        # drizzle/aei-extended-schema.ts (VED deduction)
  → processClosedLoopCycle()              # server/routers/closed-loop.router.ts
    → 3-month operator risk assessment
    → SSE publish("oiling:alert")         # server/services/telemetry-sse.service.ts
    → AEI recalc trigger (if critical)
```

### 1.2 Adaptive Parameter Feedback: C → P, θ, T

| Parameter | Chinese | DB Column | Table |
|---|---|---|---|
| Cleanliness (C) | 清洁度 | `cleanliness_after_mg` | `robot_cleaning_actions` |
| Pressure (P) | 压力 | `pressure_bar` | `robot_cleaning_actions` |
| Angle (θ) | 角度 | `nozzle_angle_deg` | `robot_cleaning_actions` |
| Cycle Time (T) | 节拍 | `cycle_time_seconds` | `robot_cleaning_actions` |

**Adaptive iteration tracking:** `adaptive_adjustment_json` stores `{threshold_adjustment, iteration, pressure_delta, angle_delta}` per cycle.

**Cleanliness verdict:** `PASS` if `cleanliness_after_mg ≤ 5.0mg`, else `FAIL`.

**Key files:**
- Router: `server/routers/robot-cleaning.router.ts` (710 lines, 4 sub-routers)
- Schema: `drizzle/robot-cleaning-performance-schema.ts` (3 tables)
- QC Service: `server/cleanliness-qc/cleanlinessQc.service.ts` (ISO 16232 / VDA 19)

### 1.3 Robot Fleet: 4-Brand Universal Adapter

| Brand | Protocol | Adapter File |
|---|---|---|
| KUKA | RSI | `server/services/plc-brands/` |
| FANUC | PCDK | `server/services/plc-brands/` |
| ABB | EGM | `server/services/plc-brands/` |
| Stäubli | uniVAL | `server/services/plc-brands/` |

**Router:** `server/routers/robot-fleet.router.ts` (741 lines, 6 sub-routers)
- `registry` — Fleet inventory (CRUD + brand specs)
- `connection` — Gateway lifecycle (connect/ping/logs/protocol test)
- `telemetry` — J1-J6 joint angles, TCP position, temperatures
- `condition` — Alert triage (overtemp/collision/estop/servo_error/comm_loss/joint_limit)
- `protocol` — Configuration per brand
- `stageIntegration` — M0-M12 pipeline link (13 procedures, stages M3/M5/M7/M8/M9/M11)

### 1.4 Sensor Fusion

**File:** `server/services/sensor-fusion.service.ts` (231 lines)

| Function | Purpose |
|---|---|
| `fuseReadings(equipmentId, hours=24)` | Merge 3 telemetry sources → hourly buckets → anomaly score |
| `calculateAnomalyScore(metrics)` | Rule-based (temp>80°C +20, vibration>5g +15, OEE<0.6 +15, etc.) |
| `detectAnomalyPatterns(equipmentId)` | Configurable pattern rules from `anomaly_patterns` table |
| `getCorrelationMatrix(equipmentId)` | Pearson correlation: temp↔vibration, OEE↔cleanliness, etc. |

### 1.5 Pre-Push Validation (grt-init-dev-env)

**Files:** `scripts/hooks/pre-push`, `server/routers/dev-env.router.ts`

| Check | Behavior | API Procedure |
|---|---|---|
| Mech/Elec Sync | **BLOCKS push** if 02_Mechanical changes without 03_Electrical sync | `devEnv.checkMechElecSync` |
| AI Oiling Simulation | **WARNING only** — logs to CEO dashboard via SSE | `devEnv.runOilingSimulation` |

---

## Part 2: SharePoint Collaboration Architecture (全公司级 SharePoint 协同)

### 2.1 Organization → Site Mapping

**Service:** `server/services/microsoft-graph/sharepoint-site.service.ts`

| Cluster | Site Code | Department | Sync Policy | Access |
|---|---|---|---|---|
| **A: Company** | `00_GRT_Portal` | 公司主页 | auto | internal |
| | `01_Management_Office` | 总经办/决策 | manual | confidential |
| **B: Support** | `02_HR_Center` | 人事 | scheduled | restricted |
| | `03_Finance_Legal` | 财务 | manual | confidential |
| | `04_IT_AI_Lab` | IT/AI知识库 | auto | internal |
| **C: Core** | `05_Marketing_Sales` | 市场 | auto | internal |
| | `06_Supply_Chain` | 采购/仓库 | scheduled | internal |
| | `07_Project_Hub` | 项目中心 | auto | internal |
| | `08_Business_Units` | 事业部 (BU1-5) | auto | restricted |
| **D: Personal** | `My_Workspace` | 个人文档 | auto | public |
| | `Client_Extranet` | 客户共享 | manual | public |

### 2.2 Standardized Project Directory (12 Folders)

```
01_Proposal         →  01_方案设计        (Requirements → Commissioning lifecycle)
02_Mechanical       →  02_机械设计        ← Pre-push hook monitors this folder
03_Electrical       →  03_电气设计        ← Must sync with 02_Mechanical
04_PLC              →  04_PLC程序
05_HMI              →  05_HMI界面
06_BOM              →  06_BOM与采购
07_Procurement      →  07_采购记录
08_QA_Testing       →  08_测试质检
09_FAT              →  09_出厂验收
10_SAT              →  10_现场验收
11_Manuals          →  11_操作手册
12_Archives         →  12_归档
```

### 2.3 BU Mapping (5 Business Units)

| BU | Chinese | SP Path | Template |
|---|---|---|---|
| BU1 | 海外事业部 | `/sites/08_Business_Units/BU1_Overseas` | 6-folder BU template |
| BU2 | 商用车事业部 | `/sites/08_Business_Units/BU2_Commercial` | 6-folder BU template |
| BU3 | 乘用车事业部 | `/sites/08_Business_Units/BU3_Passenger` | 6-folder BU template |
| BU4 | 半导体事业部 | `/sites/08_Business_Units/BU4_Semiconductor` | 6-folder BU template |
| BU5 | 工业通用事业部 | `/sites/08_Business_Units/BU5_Industrial` | 6-folder BU template |

**BU Folder Template:** Sales, Engineering, Projects, Quality, Procurement, Customer_Service

### 2.4 O365 Integration Services

| Service | File | Purpose |
|---|---|---|
| OneDrive Sync | `server/services/microsoft-graph/onedrive-sync.service.ts` | File upload/download, delta sync |
| Outlook | `server/services/microsoft-graph/outlook.service.ts` | Email integration |
| Planner | `server/services/microsoft-graph/planner.service.ts` | Task management sync |
| OneNote | `server/services/microsoft-graph/onenote.service.ts` | Notebook sync |
| SharePoint Sites | `server/services/microsoft-graph/sharepoint-site.service.ts` | Site/folder management |

**ECONNRESET Handling (Graph API):**
- File: `server/services/microsoft-graph/config.ts` lines 84-147
- Detects: `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`, `abort`, `fetch failed`
- Retry: 3 attempts with exponential backoff (2s → 4s → 8s)
- 429 rate-limit: respects `Retry-After` header
- Timeout: 30s per request via `AbortController`

**Client-side retry:** `client/src/lib/withRetry.ts` — 3 retries, exponential backoff for `ECONNRESET`, `fetch failed`, `502`, `503`.

---

## Part 3: AI-KPI & AEI (智能绩效与研发进化)

### 3.1 AEI Index — Algorithm Evolution Intelligence

**Router:** `server/routers/aei-extended.router.ts` (454 lines, 6 procedures)
**Schema:** `drizzle/aei-extended-schema.ts` (2 tables: `aei_monthly_scores`, `aei_contribution_logs`)

**Composite Formula:**

$$AEI = 0.30 \times S_{meeting} + 0.25 \times S_{engineering} + 0.25 \times S_{operational} + 0.20 \times S_{collaboration}$$

| Dimension | Weight | Data Source | Scoring |
|---|---|---|---|
| Meeting | 30% | `aei_contribution_logs` (type=meeting_action) | 12 pts/action, cap 100 |
| Engineering | 25% | `design_export_logs` | 10 pts/export, cap 100 |
| Operational | 25% | `robot_cleaning_actions` + `equipment_maintenance_records` | Pass rate × 0.6 + maintenance × 8 |
| Collaboration | 20% | `aei_contribution_logs` (doc_shared + training + code_review) | 15 pts/item, cap 100 |

### 3.2 Risk Flags (Trend-Based)

```
Linear regression on last 6 months:
  slope < -3        → at_risk     (急需关注)
  slope < -1        → declining   (绩效下滑)
  4 months > 90     → burnout     (过度投入)
```

**Procedures:**
- `calculateMonthlyAei(month)` — Batch AEI computation for all employees
- `getAeiDashboard(month)` — Top 10 leaderboard + averages
- `getAeiTrend(userId, monthsBack)` — 12-month historical
- `predictPerformance(userId, forecastMonths)` — Linear forecast
- `getAtRiskEmployees(month)` — Flagged employees list

### 3.3 VED Auto-Deduction Mechanism (视觉对齐误差 → 自动扣分)

```
Robot oiling reading fails (ΔPos > 0.5mm or T > 15Nm)
  → computeVedScore() = X points (out of 100)
  → INSERT aei_contribution_logs:
      type: "oiling_ved_deduction"
      points: -(100 - X)
  → Reduces operator's operational score in next AEI monthly calculation
```

**Example:** Operator achieves VED score of 65 → deduction of -35 points → logged to `aei_contribution_logs` → next `calculateMonthlyAei()` picks it up → operational dimension reduced.

### 3.4 AI Performance Engine (4D Meeting Score)

**Router:** `server/routers/ai-performance.router.ts`
**Service:** `server/services/ai-performance-engine.service.ts`

| Dimension | DB Column | Chinese | Source |
|---|---|---|---|
| Participation | `breadthScore` | 会议参与度 | `meeting_attendance` count |
| Execution | `depthScore` | 执行力 | `meeting_action_items` completion rate |
| Collaboration | `executionScore` | 协作能力 | Co-author + review counts |
| Innovation | `disciplineScore` | 创新力 | AI quiz score + takeaway sentiment |

### 3.5 KPI Military Orders (军令状)

**Router:** `server/kpi-performance/kpiPerformance.router.ts` → `militaryOrders` sub-router

Workflow: `pending → signed → witnessed`
- Only target user can sign
- Only managers can witness
- Links to KPI targets + AEI composite score

---

## Dashboard Mapping (GM & CTO View)

### CTO Dashboard → `/cto-dashboard`

**Router:** `server/routers/cto-dashboard.router.ts` (418 lines)

| Widget | Procedure | Data Sources |
|---|---|---|
| System Health | `systemHealth` | CPU, memory, DB latency, disk |
| Design Activity | `designActivity` | `designExportLogs`, `designSyncEvents` |
| Robot Fleet | `robotFleet` | `robotFleetRegistry`, `robotConditionAlerts` |
| Design Conflicts | `designConflicts` | `checkDesignConflicts()` for 20 active projects |
| Nine-Grid Matrix | `nineGridData` | `aeiMonthlyScores` (performance × potential) |
| Tech Debt | `techDebt` | Failed exports × 5 + robot errors × 10 + conflicts × 8 |

### CEO Dashboard → `/ceo-dashboard`

**Router:** `server/routers/ceo-dashboard.router.ts` (552 lines)

| Widget | Procedure | Data Sources |
|---|---|---|
| Health Scores | `getHealthScores` | OEE, FMEA, budget, suppliers, AEI |
| KPIs | `getKpis` | Meeting actions, robot alerts |
| Digital Thread | `getDigitalThread` | Cross-system event timeline |
| Machine Health | `getMachineHealth` | OEE fleet breakdown |
| Top Employees | `getTopEmployees` | AEI leaderboard |
| Nine-Grid | `getNineGrid` | Performance vs Potential matrix |
| Global Delivery Map | `getGlobalDeliveryMap` | Projects by BU region (China/Detroit/Memmingen) |
| Algorithm Evolution | `getAlgorithmEvolution` | PLC iterations + AI updates heatmap |

### Real-Time Data via SSE

**Service:** `server/services/telemetry-sse.service.ts`

| Topic | Publisher | Subscriber |
|---|---|---|
| `oiling:alert` | `closed-loop.router.ts` | CTO/CEO dashboards |
| `hr:penalty` | `closed-loop.router.ts` | HR dashboard |
| `dev:oiling-check` | `dev-env.router.ts` | CEO dashboard |
| `robot:alerts` | `robot-fleet.router.ts` | Factory floor monitors |
| `iot:temp` | IoT gateway | Telemetry dashboard |

---

## Developer Onboarding: `grt-init`

```bash
bash scripts/grt-init-dev-env.sh    # Linux/Mac
powershell scripts/grt-init-dev-env.ps1  # Windows
```

**5 Steps:**
1. Copy CTO-standard VS Code config → `.vscode/settings.json` + `extensions.json`
2. Install pre-push hook → `.git/hooks/pre-push` (mech/elec sync + oiling sim)
3. Test API connectivity
4. Fetch BU SharePoint tree (11 sites, 4 clusters)
5. Print summary + next steps

**Result:** New technician is automatically aligned to company standards from Day 1. Every `git push` validates mechanical/electrical consistency before code reaches the repository.

---

## File Index (Quick Reference)

### Backend Services
| File | Lines | Purpose |
|---|---|---|
| `server/services/oiling-control-guard.service.ts` | 204 | Dual torque+pose VED scoring |
| `server/services/design-conflict-check.service.ts` | 349 | Mech/elec conflict detection |
| `server/services/sensor-fusion.service.ts` | 231 | Multi-source telemetry fusion |
| `server/services/telemetry-sse.service.ts` | 347 | Real-time event pub/sub (500 conn) |
| `server/services/ai-performance-engine.service.ts` | — | 4D meeting score calculator |
| `server/services/microsoft-graph/sharepoint-site.service.ts` | — | 11-site SharePoint management |
| `server/services/microsoft-graph/onedrive-sync.service.ts` | — | File sync + folder mapping |
| `server/services/microsoft-graph/config.ts` | — | ECONNRESET retry (3× exp backoff) |
| `server/services/system-stability.service.ts` | 295 | Capacity projection + probe |

### Routers
| File | Procedures | Domain |
|---|---|---|
| `server/routers/robot-cleaning.router.ts` | ~22 | Cleaning + oiling + tech perf + showroom |
| `server/routers/robot-fleet.router.ts` | ~39 | Fleet CRUD + telemetry + stage integration |
| `server/routers/closed-loop.router.ts` | 5 | Alert triage + full cycle execution |
| `server/routers/aei-extended.router.ts` | 6 | Monthly AEI + leaderboard + forecast |
| `server/routers/ai-performance.router.ts` | 8 | 4D meeting performance engine |
| `server/routers/cto-dashboard.router.ts` | 6 | CTO real-time technical overview |
| `server/routers/ceo-dashboard.router.ts` | 8 | CEO executive scorecard |
| `server/routers/dev-env.router.ts` | 4 | Dev environment init + pre-push checks |
| `server/kpi-performance/kpiPerformance.router.ts` | ~38 | KPI library + targets + reviews + 军令状 |

### DB Schema
| File | Tables | Purpose |
|---|---|---|
| `drizzle/robot-cleaning-performance-schema.ts` | 3 | Cleaning actions, torque records, tech perf |
| `drizzle/robot-fleet-schema.ts` | 5 | Fleet registry, protocols, telemetry, alerts |
| `drizzle/aei-extended-schema.ts` | 2 | AEI scores + contribution logs |
| `drizzle/design-engine-schema.ts` | 3 | Stations, export logs, sync events |
| `drizzle/sensor-fusion-schema.ts` | 2 | Fused readings + anomaly patterns |

### Scripts
| File | Purpose |
|---|---|
| `scripts/grt-init-dev-env.sh` | One-command dev environment setup (bash) |
| `scripts/grt-init-dev-env.ps1` | One-command dev environment setup (PowerShell) |
| `scripts/hooks/pre-push` | Git hook: mech/elec sync + oiling simulation |
| `scripts/vscode/settings.json` | CTO-standard VS Code config |
| `scripts/vscode/extensions.json` | 12 recommended extensions |

### Client Retry
| File | Purpose |
|---|---|
| `client/src/lib/withRetry.ts` | Exponential backoff for ECONNRESET/502/503 |
