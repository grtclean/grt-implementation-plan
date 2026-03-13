# GRT System — 数据存储架构设计 (Data Architecture)

> 版本: 1.0 | 日期: 2026-03-06 | 作者: CTO Office
> 适用范围: GRT System v2.0 — 整合 OA/HRM/PLM/PDM/ERP 的工业清洗设备数字化平台

---

## 1. 系统全景 (System Overview)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          GRT System v2.0 Data Layer                          │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────── ┤
│   TiDB/MySQL │  Object Store│ SharePoint   │  Redis Cache │  Vector Store    │
│  (结构化数据) │  (文件/CAD)  │ (O365协作)    │  (会话/缓存)  │ (AI/RAG嵌入)    │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────────┤
│ 项目/BOM/订单│ SolidWorks   │ Office文档   │ tRPC会话     │ 文档嵌入向量     │
│ 工单/质量记录│ EPLAN图纸    │ Teams消息    │ 菜单缓存     │ 知识库索引       │
│ HR/薪酬/考勤 │ 机器人程序   │ Planner任务  │ AI对话历史   │ 语义搜索         │
│ OA审批/流程  │ 检验报告PDF  │ OneNote笔记  │ 权限缓存     │ AI建议匹配       │
│ 供应链追溯   │ 客户VDO视频  │ 日历事件     │ BU上下文     │                  │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────────┘
```

---

## 2. 数据域分层 (Data Domain Layers)

### 2.1 核心业务域 (Core Business Domains)

| 域 | 数据表 | 关键字段 | 存储引擎 | 文件类型 |
|---|--------|---------|---------|---------|
| **项目管理** | projects, project_stages, project_gates, project_milestones | projectCode, buId, customerId | TiDB | .xlsx, .docx, .mpp |
| **机械设计** | — (文件为主) | — | Object Store | .sldprt, .sldasm, .slddrw, .step, .dxf |
| **电气设计** | — (文件为主) | — | Object Store | .elc, .zw1, .epl |
| **机器人系统** | — (文件为主) | — | Object Store | .tp, .ls (FANUC), .src, .dat (KUKA), .mod, .prg (ABB) |
| **BOM** | production_bom_items, bom_scan_logs | partNumber, stationId | TiDB | .xlsx, .csv |
| **供应链** | supplier_*, incoming_inspection_*, spare_parts, traceability_graph_edges | batchLot, supplierId | TiDB | .pdf, .xlsx |
| **质量管理** | fmea_*, control_plans, eight_d_reports, ppap_* | auditClause, capaId | TiDB | .xlsx, .pdf |
| **客户/CRM** | campaigns, leads, customer_tickets, customer_complaints | customerId, region | TiDB | .docx, .pptx, .pdf |
| **生产执行** | work_orders, production_steps, labor_confirmations, equipment_maintenance | workOrderNo, stationId | TiDB | .gcode, .nc |
| **人力资源** | employees, performance_records, training_*, competency_* | employeeId, buId | TiDB | .xlsx, .pdf |
| **财务** | expense_reports, budgets, cost_standards | costCenter, accountCode | TiDB | .xlsx |
| **OA** | oa_form_instances, approval_flows, delegation_records | formTemplateId, approverChain | TiDB | .pdf |

### 2.2 支撑域 (Supporting Domains)

| 域 | 数据表 | 用途 |
|---|--------|------|
| **RBAC权限** | rbac_roles, rbac_permissions, rbac_user_roles | 18角色, 278权限, BU级别隔离 |
| **菜单管理** | menu_items (static menuConfig.ts) | 287菜单项, 22子组, 多级权限控制 |
| **审计日志** | gateway_audit_logs | 全操作审计追踪 |
| **通知** | notification_channels, notification_records | 多渠道推送 (DingTalk/Email/SMS) |
| **AI学习** | ai_learning_records, ai_notebook_suggestions | Copilot反馈学习 + RAG |

---

## 3. 文件存储架构 (File Storage Architecture)

### 3.1 双存储模式 (Dual Storage Model)

```
用户上传文件
     │
     ▼
┌──────────────────┐     storagePut()     ┌──────────────────┐
│  GRT Workspace   │────────────────────▶│   Object Store    │
│ (collaboration_  │                      │  (本地/S3/MinIO)  │
│  docs_files)     │                      └──────────────────┘
│                  │     oneDriveSync     ┌──────────────────┐
│  parsed_content  │────────────────────▶│   SharePoint /    │
│  (JSONB)         │                      │   OneDrive        │
└──────────────────┘                      └──────────────────┘
         │
         │ 文本文件 <2MB 自动解码
         ▼
┌──────────────────┐
│ parsed_content   │
│ {text, type}     │ ← .md, .tp, .src, .mod, .py, .json...
│ {html, type}     │ ← richtext
│ [[row],[row]]    │ ← spreadsheet
│ {description}    │ ← CAD metadata
└──────────────────┘
```

### 3.2 文件类型支持矩阵

| 类别 | 扩展名 | 查看器类型 | 编辑能力 | 示例 |
|------|--------|-----------|---------|------|
| **CAD-机械** | .sldprt, .sldasm, .slddrw | cad (3D动画+元数据) | 下载编辑 | SolidWorks零件/装配体/工程图 |
| **CAD-电气** | .elc, .zw1, .epl | cad | 下载编辑 | EPLAN原理图/布局图 |
| **CAD-通用** | .step, .stp, .dxf, .dwg, .iges | cad | 下载编辑 | 中间格式交换文件 |
| **机器人-FANUC** | .tp, .ls | code (Monaco) | 在线编辑 | FANUC TP程序 / Karel |
| **机器人-KUKA** | .src, .dat, .krl | code (Monaco) | 在线编辑 | KUKA KRL程序 |
| **机器人-ABB** | .mod, .prg | code (Monaco) | 在线编辑 | ABB RAPID程序 |
| **视觉系统** | .vpp, .job | cad | 下载编辑 | Cognex VisionPro / Keyence |
| **G-code** | .nc, .gcode, .tap, .ngc | code (Monaco) | 在线编辑 | CNC加工程序 |
| **Office** | .xlsx, .xls, .csv | excel (内联表格) | 在线编辑 | 报表/BOM/检查表 |
| **Office** | .docx, .doc | word (富文本) | 在线编辑 | 规范书/报告 |
| **Office** | .pptx, .ppt | ppt (预览) | 下载编辑 | 展示文稿 |
| **文档** | .pdf | pdf (iframe) | 只读 | 检验报告/证书 |
| **图片** | .png, .jpg, .svg, .bmp, .webp | image | 只读 | 产品照片/截图 |
| **Markdown** | .md | markdown (格式化) | 在线编辑 | 会议纪要/技术文档 |
| **代码** | .ts, .py, .sql, ... | code (Monaco) | 在线编辑 | 配置文件/脚本 |

### 3.3 工作台文件夹结构 (Workspace Folder Tree)

```
万能工作台 /workspace
├── 机械设计/
│   ├── 3D模型/          ← .sldprt, .sldasm, .step
│   ├── 工程图纸/        ← .slddrw, .dxf, .dwg
│   └── 标准件库/        ← .sldprt (标准件)
├── 电气设计/
│   ├── 原理图/          ← .elc (EPLAN)
│   ├── 布局图/          ← .zw1, .epl
│   └── 元器件清单/      ← .xlsx, .csv
├── 机器人系统/
│   ├── FANUC程序/       ← .tp, .ls
│   ├── KUKA程序/        ← .src, .dat, .krl
│   ├── ABB程序/         ← .mod, .prg
│   └── 视觉系统/        ← .vpp, .job
├── 项目文件/
│   ├── 在建项目/        ← 按项目编号子文件夹
│   └── 已完成项目/
├── 客户资料/
│   ├── Mercedes-Benz/   ← 奔驰项目规范/验收标准
│   ├── Stellantis/      ← Stellantis技术要求
│   ├── GM/              ← GM标准
│   └── 其他客户/
├── 质量管理/
│   ├── IATF 16949/      ← 体系文件/审核记录
│   ├── 检验报告/        ← 来料/过程/出厂检验
│   └── PPAP文件/        ← PPAP全套文件包
├── 运营管理/
│   ├── 规章制度/        ← 公司制度文件
│   └── 培训资料/        ← 新员工/技能培训
├── 数字展厅/
│   ├── 产品介绍/        ← 产品手册/技术参数
│   ├── 客户VDO/         ← 视频展示资料
│   └── 企业宣传/        ← 公司介绍/资质
├── 会议纪要/            ← 周例会/项目会/评审会
└── 模板库/
    ├── 项目模板/        ← 项目启动/验收模板
    └── 报告模板/        ← 检验/审核/汇报模板
```

---

## 4. SharePoint ↔ GRT 同步架构

### 4.1 文件夹映射表 (Folder Mapping)

```sql
sharepoint_folder_mappings
├── grt_folder_id      → collaboration_docs_folders.id
├── sharepoint_site_id → SharePoint site identifier
├── sharepoint_path    → SharePoint relative path
├── sync_direction     → bidirectional | grt_to_sp | sp_to_grt
├── auto_sync          → 是否自动同步
└── last_sync_at       → 最后同步时间
```

### 4.2 默认映射关系

| GRT文件夹 | SharePoint路径 | 同步方向 | 自动同步 |
|-----------|---------------|---------|---------|
| 机械设计 | /Engineering/Mechanical | 双向 | ✅ |
| 电气设计 | /Engineering/Electrical | 双向 | ✅ |
| 机器人系统 | /Engineering/Robotics | 双向 | ✅ |
| 项目文件 | /Projects | 双向 | ✅ |
| 客户资料 | /Sales/Customers | GRT→SP | ❌ |
| 质量管理 | /Quality | 双向 | ✅ |
| 运营管理 | /Operations | GRT→SP | ❌ |
| 数字展厅 | /Marketing/DigitalShowroom | GRT→SP | ❌ |
| 会议纪要 | /Meetings | 双向 | ❌ |
| 模板库 | /Templates | SP→GRT | ❌ |

### 4.3 同步流程

```
GRT上传文件 → storagePut(本地) → parsed_content(文本解析)
                                         │
                                  auto_sync=true?
                                    │        │
                                   YES      NO
                                    │        │
                                    ▼        └── 手动触发
                          oneDriveSyncService
                          .uploadToOneDrive()
                                    │
                                    ▼
                          SharePoint/OneDrive
                          (Graph API PUT)
                                    │
                                    ▼
                          syncRegistry更新
                          (grt_file_id ↔ oneDrive_id)
```

---

## 5. 按事业部的数据隔离 (BU Data Isolation)

### 5.1 事业部列表

| BU Code | 名称 | 主要业务 | 关键客户 |
|---------|------|---------|---------|
| overseas | 海外事业部 | 出口设备 | Mercedes-Benz, Stellantis, GM |
| commercial | 商用车事业部 | 商用车清洗设备 | 中国重汽, 陕汽 |
| passenger | 乘用车事业部 | 乘用车清洗线 | 比亚迪, 吉利 |
| semiconductor | 半导体事业部 | 半导体清洗设备 | 中芯国际 |
| industrial | 工业通用事业部 | 通用工业清洗 | 各行业客户 |

### 5.2 数据隔离策略

```
全局数据 (所有BU共享):
  ├── HR基础数据 (员工/部门/考勤)
  ├── 模板库
  ├── RBAC权限配置
  ├── 系统管理
  └── AI知识库

BU级数据 (按事业部隔离):
  ├── 项目 (project.bu_id)
  ├── 客户资料 (customer.bu_id)
  ├── BOM/工单 (work_order.bu_id)
  ├── 供应链记录
  └── 销售/报价

tRPC中间件自动注入BU上下文:
  gateway-bu-context.middleware.ts
  → ctx.bu = { code, name, permissions }
```

---

## 6. 技术规格 (Technical Specifications)

### 6.1 数据库

| 维度 | 规格 |
|------|------|
| 引擎 | TiDB (兼容MySQL 8.0) / PostgreSQL 15 |
| ORM | Drizzle ORM (类型安全) |
| 连接池 | pg.Pool, max=20, client_encoding=UTF8 |
| 查询安全 | 全参数化 (0 sql.raw注入), .limit(1000)全覆盖 |
| Schema | ~100+ 表, 全JSONB支持, SERIAL主键 |

### 6.2 文件存储

| 维度 | 规格 |
|------|------|
| 本地存储 | storagePut/storageGet (可替换为S3/MinIO) |
| 文件大小 | 上传限制 10MB (Express body limit) |
| 文本解析 | <2MB文本文件自动解码存入parsed_content |
| 二进制 | CAD/图片/视频存储为文件路径引用 |
| SharePoint | Microsoft Graph API v1.0, 双向增量同步 |

### 6.3 安全

| 维度 | 规格 |
|------|------|
| 认证 | OAuth2.0 + session token + local auth |
| 授权 | 18角色 × 278权限, requirePermission()全覆盖 |
| 审计 | gateway-audit-middleware全操作日志 |
| CSP | Content-Security-Policy + upgrade-insecure-requests |
| 速率限制 | 1000 req/15min |

---

## 7. 产能规模预估 (Capacity Planning)

基于年产50→100台设备:

| 数据类型 | 每台设备 | 年总量(100台) | 5年预估 |
|---------|---------|-------------|--------|
| SolidWorks文件 | ~200个, ~500MB | 50GB | 250GB |
| EPLAN项目 | ~5个, ~100MB | 10GB | 50GB |
| 机器人程序 | ~50个, ~5MB | 500MB | 2.5GB |
| Office文档 | ~100个, ~50MB | 5GB | 25GB |
| 检验报告PDF | ~50个, ~20MB | 2GB | 10GB |
| DB结构化数据 | ~5000行/台 | 500K行 | 2.5M行 |
| **总文件存储** | | **~70GB/年** | **~350GB** |
| **总DB存储** | | **~5GB/年** | **~25GB** |

结论: TiDB + 500GB Object Store 可支撑5年业务增长。

---

## 8. 集成接口 (Integration Interfaces)

```
                    ┌─────────────────┐
                    │   GRT System    │
                    │   tRPC API      │
                    └────────┬────────┘
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐   ┌──────▼──────┐   ┌─────▼─────┐
    │ Office 365│   │  DingTalk   │   │  ERP/MES  │
    │ SharePoint│   │  审批/通知   │   │  (天思ERP) │
    │ Outlook   │   │  考勤打卡   │   │  工单/BOM  │
    │ Teams     │   │             │   │           │
    │ Planner   │   │             │   │           │
    └───────────┘   └─────────────┘   └───────────┘
          │                 │                 │
    Graph API v1.0   DingTalk SDK      HTTP REST API
    (日历/邮件/文件   (消息推送/        (订单/库存/
     /Planner/笔记)   审批流/SSO)       物料/工单)
```

---

*文档终 — GRT System Data Architecture v1.0*
