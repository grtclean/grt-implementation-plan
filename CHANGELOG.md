# GRT智能系统更新日志

本文档记录系统的所有功能更新、改进和修复。

---

## [v3.1.9] - 2026-01-19

### 新增
- Windows本地服务器部署完整指南
- Windows专用Docker Compose配置 (docker-compose.windows.yml)
- Windows环境变量模板 (.env.windows.example)
- PowerShell管理脚本 (quick-start.ps1, stop.ps1, restart.ps1)

### 文档
- GRT-Windows-Claude-Code-Docker-Guide.md: 包含11个章节的完整部署教程
  - Windows环境准备与WSL 2配置
  - Docker Desktop安装与优化
  - Claude Code安装与使用方法
  - Claude Code与Manus协作开发工作流
  - 生产环境部署与SSL配置
  - 故障排除指南

---

## [v3.1.8] - 2026-01-19

### 新增
- Docker容器化部署支持（Dockerfile + docker-compose.yml）
- Claude Code + Docker完整部署指南文档
- 快速启动脚本 (scripts/quick-start.sh)
- MySQL初始化脚本

### 文档
- GRT-Claude-Code-Docker-Deployment-Guide.md: 包含环境配置、开发工作流、生产部署、故障排除等完整内容

---

## [v3.1.7] - 2026-01-19

### 新增
- 死锁告警多渠道通知支持（系统通知/邮件/钉钉/企业微信）
- 通知渠道测试功能
- notification-service.ts服务模块

### 优化
- 更新Manus命令规范文档 v1.0→v1.1
- 更新Manus-Claude协作工作流文档 v1.0→v1.1
- 修复多个文件中TypeScript类型错误（345→342个错误）

### 修复
- 修复死锁监控仪表板NaN显示问题
- 修复seed-naming-sample.ts重复toISOString()调用
- 修复多个seed文件中Date类型错误

---

## [v3.1.0] - 2026-01-18

### 系统完整性检查与命令执行

#### PHASE 1-5 Manus命令执行

**PHASE 1: 数据库Schema优化** (`server/migrations/phase1_schema_optimization.sql`)
- 添加缺失的索引（projects, tasks, leads, opportunities等）
- 添加外键约束（project_phases, task_assignments等）
- 添加复合索引优化查询性能

**PHASE 2: 混合验证层配置** (`server/blockchain/layer2/config.ts`)
- L2网络配置（Polygon zkEVM/Arbitrum）
- Gas阈值策略（<$0.01乐观，>$0.01 ZK）
- 边缘设备批量配置模板

**PHASE 3: 死锁检测定时任务** (`server/jobs/deadlock_monitor.ts`)
- 5分钟定时检测配置
- 自动解决和通知机制
- 监控状态统计

**PHASE 4: AI助手集成** (`server/ai/assistant_config.ts`)
- 6类AI助手配置（Solution/Quotation/Planning/KPI/Engineering/Purchase）
- 能力定义和权限控制
- 学习源配置

**PHASE 5: SEO优化配置** (`client/src/lib/seo_config.ts`)
- 结构化数据模板（Organization/Product/Service/Article）
- 页面元数据配置
- 多语言支持

#### 区块链测试网集成

**Polygon zkEVM Cardona测试网** (`server/blockchain/testnet/polygon_zkevm_config.ts`)
- 网络配置（chainId: 2442）
- RPC端点和区块浏览器
- ZK证明验证合约地址

**Arbitrum Sepolia测试网**
- 网络配置（chainId: 421614）
- Optimistic Rollup配置
- 欺诈证明窗口设置

#### TypeScript错误修复

- 创建自动修复脚本 (`scripts/fix-typescript-errors.ts`)
- 当前错误数量: 374个（待继续修复）

#### 功能检查结果

| 功能 | 状态 | 路由 |
|------|------|------|
| 客户门户 | ✅ 正常 | /customer-portal |
| 子系统帮助 | ✅ 正常 | /subsystem-help |
| 公开首页 | ✅ 正常 | /public |
| 能力介绍 | ✅ 正常 | /capabilities |

---

## [v3.0.0] - 2026-01-18

### Gemini建议V3.0升级实施

#### 阶段一：混合验证层重构

**交易分发器** (`server/blockchain/layer2/dispatcher.ts`)
- DataType枚举：TELEMETRY_LOG, DEVICE_AUTH, FIRMWARE_HASH, FINANCIAL_TX, PROCESS_PARAM, QUALITY_INSPECTION
- 混合验证策略：高频低敏→乐观汇总，低频高敏→ZK证明
- 防MEV私有排序机制
- 边缘设备配置模板

#### 阶段二：死锁哨兵系统部署

**Tarjan环检测引擎** (`server/agents/sentinel/deadlock_engine.ts`)
- WaitForGraph等待图构建
- Tarjan强连通分量算法
- 死锁环检测和可视化

**微扰重放解决器** (`server/agents/sentinel/resolver.ts`)
- Priority_Score计算（业务价值×0.4 + 等待时间×0.3 + 资源数×0.2 + 回滚成本×0.1）
- Sacrifice牢牲者选择策略
- 事务回滚和重放机制

#### 阶段三：ISO安全网关集成

**ISO 10218安全验证器** (`server/safety_layer/validator_iso10218.ts`)
- RobotState结构和OperationMode枚举
- validateAICommand确定性校验
- SSM速度与分离监控
- HITL人工确认机制

#### 客户门户功能

**客户门户页面** (`client/src/pages/CustomerPortal.tsx`)
- 项目状态查询（项目编号+访问码）
- ZKP能力验证（VDA 19.1/ISO 14644/工艺参数/质量检测）
- 文档中心（技术手册/合规证书/项目报告）
- 路由入口: /customer-portal

#### 缺陷修复

| 缺陷ID | 描述 | 修复方案 |
|---------|------|----------|
| D-2.9-001 | 边缘设备强制ZKP生成 | 混合验证分发器 |
| D-2.9-002 | 缺乏WFG扁平化协商 | 哨兵智能体系统 |
| D-2.9-003 | AI直写PLC寄存器 | ISO安全网关 |
| D-2.9-004 | 单一ZK-Rollup架构 | 混合Optimistic+ZK |
| D-2.9-005 | 静态超时策略 | 动态微扰重放 |

---

## [v2.11.0] - 2026-01-18

### Gemini分析使用指南

#### 新增文档

**Gemini分析使用指南** (`docs/gemini-analysis-guide.md`)
- 完整的Gemini分析工作流程说明
- TypeScript错误修复分析提示词模板
- 架构优化分析提示词模板
- 数据库Schema优化提示词模板
- Manus命令输出格式规范
- 当前待修复错误清单

#### 错误分析详情

| 文件 | TS2769错误数 | 主要原因 |
|------|------------|----------|
| server/db.ts | 24 | 缺少必填字段 |
| server/permissionRoutes.ts | 13 | 类型不匹配 |
| server/processNotebookRoutes.ts | 11 | 字段名不一致 |
| server/ai-assistants/*.ts | 6 | Date类型问题 |
| 其他文件 | 53 | 混合问题 |

#### 稳定版本索引

| 版本ID | 版本号 | 描述 |
|--------|--------|------|
| a0dbee40 | v2.10.0 | TypeScript类型修复 |
| c8224def | v2.9.0 | 规范导出与Rollback流程 |
| a4612592 | v2.8.0 | UI组件化与公开展示 |
| da8810c6 | v2.7.0 | AI-AI销售架构 |

---

## [v2.10.0] - 2026-01-18

### TypeScript类型系统修复

#### 类型导出补充

**Schema类型导出** (`drizzle/schema.ts`)
- 添加76个缺失的类型导出
- 包含: User, AnalyticsEvent, CostCategory, ProjectPhase, HrmEmployee等
- 支持InferSelectModel和InferInsertModel类型推断
- 错误数量从443个降至367个 (17%改进)

#### 剩余错误分析

| 错误类型 | 数量 | 描述 |
|---------|------|------|
| TS2769 | 107 | 函数重载不匹配 |
| TS2339 | 93 | 属性不存在 |
| TS2345 | 62 | 参数类型错误 |
| TS2322 | 61 | 类型不兼容 |
| TS7006 | 10 | 隐式any类型 |
| 其他 | 34 | 其他类型错误 |

#### 修复详情

- 修复zkpRouter.ts中z.record参数错误
- 修复routers.ts中aiNotebookRouter导入路径
- 添加缺失的CRM/HRM/Cost/Project类型导出
- 服务器正常运行，核心功能可用

---

## [v2.9.0] - 2026-01-18
### 规范导出与Rollback流程

#### Gemini分析专用导出包

**完整规范文档** (`docs/exports/GRT-v2.8.0-Complete-Specification-for-Gemini.md`)
- 系统概述与核心架构
- RFC文档索引 (14个RFC)
- 数据库Schema完整文档
- API接口规范
- Manus专用命令格式
- Rollback操作规范
- 待优化项清单 (446个TS错误)

#### Manus专用命令格式规范

**命令规范文档** (`docs/manus-command-specification.md`)
- 命令语法: `@manus <action> <target_type> <target_name> [--options]`
- 支持操作: create/update/fix/delete/refactor/test/doc/rollback/migrate/deploy
- 参数格式: 内联参数、JSON参数块、YAML批量命令
- 命令模板库: TypeScript修复、组件创建、路由创建、Schema更新、版本回滚
- 执行优先级: P0(Critical)/P1(High)/P2(Medium)/P3(Low)
- Gemini输出模板规范

#### 专业Rollback操作流程

**回滚规范文档** (`docs/rollback-operation-procedure.md`)
- 回滚触发条件: 自动触发(服务器失败/健康检查/错误率)、手动触发(构建失败/功能回归/安全漏洞)
- 标准流程: 评估决策 → 备份当前 → 执行回滚 → 验证确认 → 记录日志
- 回滚方式: Management UI操作、Manus命令、紧急回滚
- 验证清单: 基础设施、核心路由、API接口、数据完整性
- 已验证稳定版本: a4612592(v2.8.0)、da8810c6(v2.7.0)、fbc2c8cf(v2.6.6)

---

## [v2.8.0] - 2026-01-18

### UI组件化与公开展示

#### 子系统操作说明UI组件

**交互式帮助文档组件** (`client/src/components/SubsystemHelpPanel.tsx`)
- 六大子系统操作手册集成
  - MES制造执行系统操作指南
  - AI采购系统操作指南
  - 3-3-3-1财务管控操作指南
  - 门径管理系统操作指南
  - 工作流引擎操作指南
  - 智能人才网格操作指南
- 可折叠步骤卡片设计
- 前期输入/操作步骤/执行效果三段式结构
- 路由入口: `/subsystem-help`

#### ZKP验证原型

**数据库Schema** (`drizzle/schema.ts`)
- `zkp_verification_requests`: ZKP验证请求表
- `zkp_verification_results`: ZKP验证结果表
- `zkp_verification_audit_logs`: ZKP验证审计日志
- `vda_191_cleanliness_standards`: VDA 19.1清洁度标准表
- `capability_proof_configs`: 能力证明配置表
- `public_capability_showcase`: 公开能力展示表
- `customer_portal_access_logs`: 客户门户访问日志

**ZKP验证服务** (`server/zkpRouter.ts`)
- `createVerificationRequest`: 创建ZKP验证请求
- `executeVerification`: 执行ZKP验证
- `getVerificationResult`: 查询验证结果（公开）
- `validateProofHash`: 验证证明哈希（公开）
- `getVDA191Standards`: 获取VDA 19.1标准列表
- `getCapabilityProofs`: 获取能力证明配置
- `getPublicShowcase`: 获取公开能力展示（SEO友好）

#### 公开能力展示页面

**SEO优化首页** (`client/src/pages/PublicHome.tsx`)
- 结构化元数据支持
- 核心能力展示卡片
- 行业解决方案分类
- AI-AI对接接口示例
- 路由: `/public`

**能力介绍页** (`client/src/pages/Capabilities.tsx`)
- 五大能力Tab分类
  - 清洗技术（水基/超声波/高压喷淋/真空干燥）
  - 质量保证（VDA 19.1/ISO 16232/ISO 9001）
  - 设备制造（M0-M12项目管理）
  - AI能力（方案推荐/工艺优化/智能报价）
  - 合规验证（ZKP零知识证明）
- 路由: `/capabilities`

---

## [v2.7.0] - 2026-01-18

### 新增文档

#### AI-AI销售系统架构规范 (RFC-036)

**RFC-036评估文档** (`docs/rfc/RFC-036-ai-ai-sales-architecture.md`)
- 五大智能体架构设计
  - The Listener（接口智能体）：解析多模态输入（RFQ/CAD/AAS）
  - The Estimator（算力智能体）：物理仿真与成本计算
  - The Negotiator（商业智能体）：博弈论谈判与价格优化
  - The Guardian（合规智能体）：ZKP证明生成与合规校验
  - The Builder（构建智能体）：项目计划与数字孪生生成
- 智能体交互协议
  - L1协议：自然语言探索（面向Tesla/小米）
  - L2协议：AAS数据交换（面向大众/GM/Catena-X）
- Conobase知识图谱架构
  - 图数据库与向量数据库混合架构
  - 实体与关系建模（Equipment/Chemical/Regulation/Process/Project/Case）
  - 向量化记忆存储（RAG）
- 零知识证明（ZKP）应用规范
  - 电路一：工艺参数合规性证明
  - 电路二：化学配方安全性证明
  - 电路三：zkML视觉检测防伪
- 区块链智能合约里程碑映射
  - VDA ML0-ML7里程碑状态机设计
  - 机器对机器支付（M2M Payments）
- AI护栏规范
  - 利润护栏：最低毛利率保护
  - 能力护栏：Conobase验证要求
  - 情感护栏：温暖且专业语调
- 2026-2030实施路线图

#### Claude Code NocoBase预设语句规范

**预设语句规范** (`docs/claude-code-nocobase-preset-statements.md`)
- 四层透明度模型
  - L0公开展示层：全网可见，SEO优化
  - L1注册可见层：注册用户可见
  - L2客户专属层：授权客户可见
  - L3核心IP层：仅内部可见，加密存储
- SEO友好的公开内容预设
  - pub_capabilities：公开能力展示表
  - pub_case_summaries：公开案例摘要表
  - pub_tech_articles：技术博客表
- 核心IP保护的私有数据结构
  - core_process_parameters：核心工艺参数表（AES-256加密）
  - core_chemical_formulas：化学配方表（AES-256加密）
  - core_cost_models：成本模型表（AES-256加密）
- 客户门户受控访问接口
  - cust_project_status：客户项目状态表
  - cust_access_tokens：客户访问令牌表
  - customerPortalRouter：tRPC路由定义
- AI智能体数据库Schema
  - ai_agent_configs：智能体配置表
  - ai_agent_interactions：智能体交互日志表
- ZKP验证接口设计
  - zkp_proofs：ZKP证明记录表
  - zkpRouter：tRPC路由定义

#### SEO推广策略与核心资产保护规范

**推广策略规范** (`docs/seo-promotion-ip-protection-strategy.md`)
- SEO内容架构设计
  - 四层透明度模型
  - SEO关键词策略（行业术语/解决方案/技术趋势/品牌词）
  - 内容金字塔结构
- 公开展示页面规划
  - 首页（Brand Home）结构设计
  - 能力介绍页（Capabilities）模板
  - 案例展示页（Cases）信息分级
  - 技术博客（Blog）内容规划
- 核心资产保护策略
  - 核心资产分类（最高机密/高度机密/内部机密）
  - 技术保护措施（数据加密/TEE/ZKP）
  - 访问控制矩阵
  - 内容脱敏规则
- 客户门户入口设计
  - 门户功能架构
  - 访问控制机制
  - 信息展示规则
- 技术实施规范
  - SEO技术优化（结构化数据/页面性能/国际化）
  - 内容管理系统集成
  - 监控与分析

### RFC文档

- 新增 `docs/rfc/RFC-036-ai-ai-sales-architecture.md`：AI-AI销售系统架构规范RFC评估文档

### 版本说明

本版本基于《GRT智能系统架构蓝图：基于区块链与AI-to-AI交互的无销售人员自治体系》战略规划，定义了AI-AI自治交互架构的技术规范，包括五大智能体设计、ZKP零知识证明应用、SEO推广策略与核心资产保护机制。为2026-2030年向完全自治架构演进提供技术基础。

---

## [v2.6.6] - 2026-01-18

### 新增文档

#### 子系统操作手册 (RFC-035)

**GRT子系统操作手册** (`docs/manuals/GRT-Subsystem-Operation-Manual.md`)
- MES制造执行系统操作指南
  - 系统概述与功能介绍
  - 前期输入内容要求（组织架构/物料主数据/BOM结构/供应商信息/工艺路线）
  - 项目创建流程（立项→BOM导入→任务卡分解）
  - 生产执行流程（任务领取→工时记录→质量检验→进度更新）
  - 执行效果与预期产出指标
- AI赋能采购系统操作指南
  - AI自动询价流程（创建询价单→AI生成邮件→发送与跟踪→OCR识别）
  - 价格分析与决策流程（AI分析→最佳价值评估→风险评估→采购决策）
  - 三语询价支持（中文/英文/德文）
- 3-3-3-1财务管控系统操作指南
  - 项目预算编制流程（初始化→审批→下达）
  - 付款节点管控流程（条款配置→触发确认→业务锁定）
  - 成本实时监控流程（归集→对比→预警审批）
- 门径管理系统操作指南
  - M0-M12里程碑管理流程（初始化→检查清单→门径评审→否决机制）
  - H1-H4人力资本门径流程（JD结构化→面试评估→入职KPI生成）
  - 硬门径/软门径区分与否决标准
- 工作流引擎系统操作指南
  - 流程设计流程（创建→节点设计→属性配置→发布）
  - 表单构建流程（创建→字段添加→属性配置→权限配置）
  - 流程执行流程（发起→审批→流转→归档）
- 智能人才网格系统操作指南
  - 技能图谱管理流程（录入→评估→差距分析→发展规划）
  - DA跨岗位逻辑流程（初始化→助手订阅→故障继承→跨部门协作）
  - 安全红线规则流程（配置→AI校验→拦截预警→例外审批）

**系统集成架构图**
- 子系统关系图（MES/AI采购/财务/门径/工作流/人才网格）
- NocoBase平台底层架构
- 错误码速查表（AI_001-AI_012）

#### 系统更新治理流程 (RFC-035)

**系统更新治理流程** (`docs/system-update-governance-process.md`)
- 变更分类与审批层级
  - L1紧急修复：技术负责人审批，4小时时限
  - L2常规变更：模块负责人+技术负责人，3工作日
  - L3重要变更：技术委员会，7工作日
  - L4重大变更：技术委员会+管理层，14工作日
- RFC流程规范
  - 标准RFC文档结构（9个标准章节）
  - RFC编号规则（RFC-XXX）
  - RFC状态流转（草稿→评审中→已批准→实施中→已完成）
- 执行流程
  - 标准执行流程（7阶段：需求提出→技术评审→批准决策→开发实施→测试验证→上线部署→上线验证）
  - 紧急修复流程（简化流程，24小时内补充RFC）
  - Claude Code实施规范
- 版本控制与回滚
  - 语义化版本号规则（vX.Y.Z）
  - 检查点管理机制
  - 回滚流程（5步骤）
- 变更管理规范
  - CHANGELOG更新规范
  - 文档同步规范
  - 沟通规范
  - 审计要求（3年保留）

### RFC文档

- 新增 `docs/rfc/RFC-035-subsystem-operation-manual.md`：子系统操作手册与更新治理流程RFC评估文档

### 版本说明

本版本为文档完善版本，不涉及系统功能变更。主Claude Code实施阶段提供完整的操作指南和治理流程支持。

---

## [v2.6.5] - 2026-01-18

### 新增功能

#### MES制造执行系统 (RFC-034)

**多事业部矩阵管理**
- 新增 `business_units` 表：事业部主表
  - 海外事业部(BU-OVERSEAS)、商用车事业部(BU-CV)、乘用车事业部(BU-PV)
  - 机加工事业部(BU-MACHINING)、第十事业部(BU-10)
  - 事业部类型：profit_center/cost_center/shared_service
- 新增 `bu_roles` 表：事业部角色定义
  - 负责人(BU_HEAD)、副经理(DEPUTY_MGR)、销售工程师(SALES_ENG)
  - 机械工程师(MECH_ENG)、电气工程师(ELEC_ENG)、采购专员(PROC_SPEC)
- 新增 `bu_permissions` 表：角色权限矩阵
- 新增 `internal_orders` 表：内部订单（第十事业部内部结算）
- 新增 `transfer_pricing` 表：内部结算价格
- 新增 `user_bu_assignments` 表：用户事业部关联

**MES核心数据表**
- 新增 `mes_projects` 表：项目主表
  - 项目编码格式：P-YYYY-NNN
  - M0-M12门径状态跟踪
  - 付款条款关联（3-3-3-1/4-5-1/5-3-2）
- 新增 `mes_items` 表：物料主表
  - SKU编码规则
  - 向量嵌入预留字段
- 新增 `mes_bom_structures` 表：BOM结构表
  - Parent/Child/Qty/Version
  - 多版本管理
- 新增 `mes_suppliers` 表：供应商主表
  - 供应商评级(A/B/C/D)
  - 能力标签和资质证书
- 新增 `mes_inventory_trans` 表：库存事务表
  - 项目专区管理
  - 料位管理
- 新增 `mes_purchase_orders` 表：采购订单表
- 新增 `mes_po_items` 表：采购订单明细表

**AI赋能采购与供应链协同**
- 新增 `shared/aiProcurement.ts`：AI采购引擎
  - ManusAIProcurement：AI自动询价引擎
  - RFQEmailTemplates：中英德三语询价模板
  - PriceAnalyzer：价格分析与最佳价值评估
  - RiskAssessor：供应商集中度/交付/质量风险评估
  - DeliveryTracker：交付跟踪与绩效指标
  - SupplierPortalManager：H5报价门户链接生成

**MES制造执行与工时管理**
- 新增 `mes_task_cards` 表：任务卡
  - 任务类型：机架装配/管路安装/电气接线/调试等
  - 计划工时与实际工时
- 新增 `mes_work_time_records` 表：工时记录
  - 开始/暂停/完成状态
  - UWB/二维码采集预留
- 新增 `mes_work_time_summary` 表：工时汇总
  - 日/周/月汇总
  - 加班检测
- 新增 `mes_quality_inspections` 表：质量检验记录
- 新增 `mes_production_dashboard` 表：生产进度看板
- 新增 `mes_equipment` 表：设备/工装管理
- 新增 `mes_equipment_usage` 表：设备使用记录

**3-3-3-1财务管控体系**
- 新增 `fin_payment_terms` 表：付款条款模板
  - 3-3-3-1：预付30%+提货30%+发货30%+质保10%
  - 4-5-1：预付40%+提货50%+质保10%
  - 5-3-2：海外项目预付50%+发货30%+验收20%
- 新增 `fin_payment_milestones` 表：付款里程碑
  - 触发条件与状态跟踪
  - 未到款锁定采购/发货机制
- 新增 `fin_cost_categories` 表：成本分类
  - DM（直接材料）、DL（直接人工）
  - DE（直接费用）、MO（制造费用）
- 新增 `fin_budget_controls` 表：预算控制
  - 量价双控机制
  - 阈值预警
- 新增 `fin_project_budgets` 表：项目预算表
- 新增 `fin_cost_actuals` 表：成本实际发生表
- 新增 `fin_budget_alerts` 表：预算预警记录表

### 测试覆盖

- 新增 `server/mes-system.test.ts`：MES系统单元测试
  - 多事业部矩阵管理测试套件
  - AI采购系统测试套件
  - MES工时管理测试套件
  - 3-3-3-1财务管控测试套件
  - 质量验收测试套件
  - 供应商门户测试套件
- 测试总数：786个测试全部通过

### 文档更新

- 新增 `docs/rfc/RFC-034-mes-manufacturing-execution.md`：MES制造执行系统评估文档
- 更新 `docs/research/gate-management-analysis.md`：门径管理研究分析

---

## [v2.6.4] - 2026-01-18

### 新增功能

#### 门径管理体系 (RFC-033)

**M0-M12里程碑门径数据库表**
- 新增 `milestone_gates` 表：M0-M12门径定义
  - 阶段划分：order_intake(M0-M2) / engineering(M3-M6) / industrialization(M7-M9) / execution(M10-M12)
  - 硬门径标识：M0, M2, M3, M5, M7, M9, M12
  - 否决标准（killCriteria）定义
- 新增 `gate_check_items` 表：检查清单项定义
  - mandatory/optional/conditional三种类型
  - 验证方法和责任角色
- 新增 `gate_reviews` 表：门径评审记录
- 新增 `gate_check_item_status` 表：检查项状态跟踪
- 新增 `project_gate_status` 表：项目门径状态

**H1-H4人力资本门径数据库表**
- 新增 `job_descriptions` 表：结构化JD数据
  - 技能要求矩阵（skill_requirements）
  - 工作输出定义（work_outputs）
  - 关键绩效指标（kpis）
- 新增 `interview_assessments` 表：面试评估记录
  - 能力评分矩阵（competency_scores）
  - 匹配度分析（match_score）
- 新增 `candidate_gap_tags` 表：能力Gap标签
- 新增 `auto_kpi_suggestions` 表：自动KPI建议
- 新增 `employee_credentials` 表：员工资质证书

**门径检查清单与否决机制 (gateManagement.ts)**
- 实现 `GateChecklistEngine` 检查清单引擎
  - 检查项注册与获取
  - 完成率计算
  - 交通灯状态评估（green/yellow/red）
- 实现 `GateVetoMechanism` 否决机制
  - 否决规则注册
  - 否决检查执行
  - 指导委员会升级标志
- 默认否决规则：
  - M1利润率红线：<15%
  - M3设计评审否决
  - M8 Cpk红线：<1.33
  - M9质量红线：缺陷率>1%

**类似简道云的流程固化功能 (workflowEngine.ts)**
- 实现 `FormBuilder` 表单构建器
  - 多种字段类型：text/number/date/select/checkbox/file/user/department
  - 字段验证：required/min/max/pattern/options
  - 表单数据验证
- 实现 `WorkflowDesigner` 工作流设计器
  - 节点类型：start/end/approval/condition/action/notify/ai_decision
  - 节点连接与验证
  - 流程版本管理
- 实现 `WorkflowEngine` 工作流引擎
  - 流程实例启动
  - 审批动作执行（approve/reject/transfer/return）
  - 审批记录与日志
  - 待办任务查询
- 预定义模板：
  - 门径评审表单模板
  - 门径评审流程模板（区分硬门径/软门径）

### 技术文档

- 新增 RFC-033: 门径管理体系评估文档
- 新增 门径管理研究分析文档

### 测试

- 新增 34个门径管理单元测试
- 测试总数：742个（全部通过）

---

## [v2.6.3] - 2026-01-18

### 新增功能

#### GRT智能人才网格协议 (RFC-032)

**扩展Collection定义 (grt_talent_profiles)**
- 新增 `grt_talent_profiles` 表：人才档案管理
  - skill_graph：技能图谱JSON字段
  - psychological_safety_logs_encrypted：心理安全日志（字段级加密）
  - encryption_iv/auth_tag/key_version：加密元数据
- 新增 `skill_assessments` 表：技能等级评估记录
- 新增 `da_assistant_subscriptions` 表：DA助手订阅关系
- 新增 `logic_chain_executions` 表：逻辑链执行记录

**DA跨岗位逻辑 (daAssistantSubscription.ts)**
- 实现 `DASubscriptionService` 服务类
- 岗位-助手映射：
  - 技术工程师 → Engineering_Assistant + Solution_Assistant
  - 销售代表 → Sales_Assistant + Quotation_Assistant
  - 财务人员 → Finance_Assistant
  - 项目经理 → Project_Assistant + Planning_Assistant
- 故障逻辑链自动继承机制
- 技能等级权限控制

**Safety_Filter安全红线规则 (safetyFilter.ts)**
- 实现 `SafetyFilter` 类：AI建议安全校验
- 物理参数限制：
  - 温度：-40°C ~ 200°C
  - 压力：0 ~ 20bar
  - 转速：0 ~ 10000rpm
  - pH值：0 ~ 14
- 材质-参数冲突检测：
  - 铝材：温度≤80°C，pH 5-9
  - 不锈钢：温度≤150°C
  - 塑料：温度≤60°C
- 设备特定限制检测
- 操作员资质检查（AI_012错误码）
- AI_003/AI_011/AI_012错误码强制拦截

**清洗工艺手册故障排除引导路径 (troubleshootingGuide.ts)**
- 实现 `TroubleshootingEngine` 引擎
- 故障-原因-解决方案三元组建模：
  - FaultSymptom：故障症状定义
  - FaultCause：故障原因定义
  - Solution：解决方案定义
- 支持设备类型：
  - 超声波清洗机、喷淋清洗机、浸泡槽
  - 高压清洗机、真空干燥机、离心干燥机
- 90%准确率的引导路径生成
- 技能等级自动升级机制
- 会话管理（开始/记录/完成/升级）

### 测试覆盖

- 新增 `server/talent-grid.test.ts`：智能人才网格单元测试
  - DA订阅服务测试（40+测试用例）
  - Safety Filter测试（20+测试用例）
  - 故障排除引擎测试（15+测试用例）
  - 集成测试（2测试用例）
- 总测试用例：708个（全部通过）

### 技术文档

- RFC-032：GRT智能人才网格评估文档

---

## [v2.6.2] - 2026-01-18

### 新增功能

#### 全球化架构升级 (RFC-031)

**基础设施与部署规范 (Deployment Spec)**
- Docker容器化配置：`docker/docker-compose.yml`
- 环境配置模板：`docker/config.env.template`
- 新增 `grt_migration_log` 表：记录所有配置变更
- 支持增量数据同步（Incremental Sync）机制

**全球化业务适配逻辑 (Localization & Globalization)**
- 多时区支持：`shared/timezone.ts`
  - 所有时间戳UTC存储，前端根据User.timezone自动转换
  - 支持时区：Asia/Shanghai, Europe/Berlin, America/New_York等
- 多币种财务结算：`shared/currency.ts`
  - 支持CNY/EUR/USD/GBP/JPY五种主要货币
  - 新增 `currency_exchange_rates` 表：动态汇率插件
  - Money类支持精确计算与货币转换
- 多语言AI引擎：`shared/i18n.ts`
  - 支持中文(zh-CN)、英文(en-US)、德文(de-DE)
  - AI助手根据Client.location自动切换语种
  - 新增 `translation_cache` 表：翻译缓存

**多组织/多公司SaaS架构**
- 租户架构：`shared/multiTenant.ts`
  - 新增 `organizations` 表：组织管理
  - 所有Collection强制增加organization_id字段
- 授权分级：
  - super_admin：超级管理员（GRT总部）
  - org_admin：组织管理员（分公司/客户公司）
  - dept_admin/employee/customer/guest
- 数据隔离规则：
  - strict：完全隔离（独立Schema+独竎Bucket+独立索引）
  - shared：共享隔离（行级安全+前缀隔离+元数据过滤）
  - hybrid：混合模式（核心数据严格隔离）
- RAG向量索引按organization_id物理隔离

**迁移与升级指令 (For Claude Code)**
- S3兼容存储抽象层：`shared/storageAbstraction.ts`
  - 支持AWS S3/阿里云OSS/MinIO/本地文件系统
  - 无状态服务设计，不依赖本地物理路径
  - 支持跨提供商同步迁移
- GRT-Global-Gateway统一接口：`shared/globalGateway.ts`
  - 支持亚洲/欧洲/美洲三大区域
  - 智能路由策略：geo_proximity/round_robin/weighted/failover
  - 健康检查与自动故障转移

**系统健康检查与迁移评估插件**
- 健康检查：`shared/systemHealthCheck.ts`
  - 自动检测：数据库大小、附件数量、API延迟
  - 健康级别：healthy/warning/critical/unknown
  - 智能建议生成
- 一键镜像：
  - 负载超70%时自动触发
  - 生成配置JSON导出包
  - 支持直接注入云端新实例
- 迁移评估：
  - 评估本地到云端迁移可行性
  - 识别阻塞项与警告项
  - 估算迁移时间与停机时间

### 技术文档
- 新增 RFC-031: 全球分公司对接与多组织SaaS架构评估文档
- 新增 Docker容器化部署配置
- 新增 全球化工具库（时区/货币/国际化）
- 新增 多租户架构设计文档

### 数据库变更
- 新增 `organizations` 表：组织/租户管理
- 新增 `grt_migration_log` 表：迁移日志
- 新增 `currency_exchange_rates` 表：汇率管理
- 新增 `translation_cache` 表：翻译缓存
- 新增 `global_gateway_health` 表：网关健康状态
- 新增 `system_health_reports` 表：系统健康报告

---

## [v2.6.1] - 2026-01-18

### 新增功能

#### 未来10年架构预留 (RFC-030)

**新增AI角色语义**
- Strategic_CFO_Assistant：战略财务助手
  - 100%自动审计报销、报价及财务发放
  - 异常波动监控与智能预警
  - 新增 `strategic_cfo_audit_logs` 表
- Supply_Chain_Optimizer：供应链优化器
  - 基于部件编码规则与客户服务频率预测增值订单
  - 新增 `supply_chain_predictions` 表

**资格认证授权管理 (Credential-Based Access)**
- 新增 `qualification_certificates` 表：工程师资质证书管理
- 新增 `da_permission_bindings` 表：DA权限与资质绑定
- 支持证书级别：basic/intermediate/advanced/expert
- 只有持有“高级超声波调试证”的工程师才能解锁高级逻辑控制权限

**闭环服务报告与邮件系统 (Omni-channel Feedback)**
- 新增 `multi_language_service_reports` 表：多语言报告支持
- 新增 `service_report_consensus` 表：多方共识确认流程
- 新增 `customer_credit_updates` 表：客户信用自动更新
- 服务闭环流程：服务结束 → AI生成报告 → 主管审核 → 客户H5确认 → 财务开票

**CTO底层架构警告（数据隐私与主权）**
- 新增 `data_privacy_configs` 表：数据隐私配置
- 新增 `deidentification_proxy_logs` 表：脱敏代理审计日志
- 数据分类分级：L0公开 / L1内部 / L2敏感 / L3机密 / L4绝密
- 部署要求：客户分级价格、核心工艺配方必须运行在私有部署实例
- 脱敏代理层：确保GRT核心资产不被公有大模型吸收

### 技术文档
- 新增 RFC-030: 未来10年架构预留评估文档
- 新增数据隐私与脱敏代理层架构文档
- 更新 drizzle/schema.ts 数据库模型

### 数据库变更
- 新增 9 张未来10年架构预留表
- 支持资格认证、财务审计、供应链预测、数据隐私等模块

---

## [v2.6.0] - 2026-01-18

### 新增功能

#### 架构级优化与逻辑对齐 (RFC-028)

**工业安全拦截器中间件**
- 新增 `industrial_safety_rules` 数据库表：工业安全规则库
- 实现双层校验机制：静态规则库 + 动态安全阈值
- 支持材质-参数冲突检测（铝材/不锈钢/塑料等）
- 支持设备型号通配符匹配（GRT-SC-*/GRT-HP-*）
- 实现三级严重级别：warning/critical/fatal
- 新增 `safety_threshold_check` 配置属性到功能型AI助手

**数据模型扩展**
- 字段类型标准化：`decimal(10,2)` 替代 `float` 用于所有物理量字段
- 新增 `unit_type` 字段：强制关联单位类型 (bar, MPa, °C, mm, kg, s)
- 新增 `iot_linkage_map` JSON字段：PLC寄存器地址映射
- 支持物联网设备集成配置

**影子执行模式**
- 扩展AI执行模式：新增 `shadow` 影子模式
- 新增 `grt_ai_learning_records` 表：AI学习记录
- 实现后台比对人工操作与AI预测偏差
- 支持偏差分数计算和分析报告生成

**流程笔记多模态深化**
- 新增 `industrial_ocr_spec` 字段：工业OCR识别配置
- 新增识别规则：设备铭牌、压力表读数、清洗剂批次号
- 新增 `source_trace_id` 字段：跨流程溯源支持
- 支持源实体类型和字段路径追踪

**工程实施约束**
- AI建议面板新增“一键回滚”按钮
- 支持应用历史记录和回滚确认
- 新增错误码：AI_009（安全规则冲突）、AI_010（物联网指令超时）
- 新增 SAFETY 系列错误码（SAFETY_001~006）
- 新增 IOT 系列错误码（IOT_001~005）

### 技术实现
- 新增 `shared/errorCodes.ts` 错误码定义文件
- 新增 `IndustrialSafetyError` 、`AiExecutionError`、`IoTCommunicationError` 错误类
- 更新 `AISuggestionPanelWithMode.tsx` 组件：
  - 新增 shadow 执行模式选项
  - 新增一键回滚按钮和确认对话框
  - 新增应用历史记录状态
- 更新技术规范文档第10章《工业安全与物联网集成规范》

### 数据库变更
- 新增 `industrial_safety_rules` 表：工业安全规则库
- 新增 `grt_ai_learning_records` 表：AI学习记录
- 更新 `functional_ai_assistants` 表：新增 safety_threshold_check、iot_linkage_map 字段
- 更新 `grt_ai_solutions` 表：字段类型标准化为 decimal(10,2)，新增 unit_type 字段
- 更新 `notebook_entries` 表：新增 industrial_ocr_spec 字段
- 更新 `ai_notebook_suggestions` 表：新增 source_trace_id 字段

### 测试覆盖
- 新增 `server/industrial-safety.test.ts` 工业安全单元测试
- 27个测试用例全部通过：
  - 材质-参数冲突校验 (4个)
  - 安全阈值校验 (4个)
  - 严重级别分类 (2个)
  - 影子模式偏差计算 (5个)
  - 偏差分析报告 (3个)
  - 偏差记录创建 (2个)
  - 错误码测试 (4个)
  - 中间件集成测试 (3个)

### 评审信息
- RFC编号：RFC-028
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v2.5.0] - 2026-01-18
### 新增功能

#### 流程笔记系统扩展 (RFC-027)

**多页面集成**
- 集成ProcessNotebook组件到CRM客户详情页面
- 集成ProcessNotebook组件到商机管理页面
- 集成ProcessNotebook组件到成本管理页面"笔记"Tab

**AI识别规则库**
- 创建`ai_recognition_rules`数据库表
- 预置8种GRT产品型号识别规则（GRT-WC/UC/SC/DC/VD/AC/MC/PC系列）
- 预置9种清洁度标准识别规则（VDA 19.1/19.2, ISO 16232, SAE AS4059, NAS 1638, ISO 4406, Class 100/1000/10000）
- 预置8种工艺术语识别规则（超声波清洗、喷淋清洗、浸泡清洗、真空干燥、热风干燥、脱脂、钝化、防锈）
- 预置4种设备类型识别规则（清洗槽、干燥炉、输送线、机械手）
- 预置3种材料类型识别规则（碳氢清洗剂、水基清洗剂、改性醇）

**笔记搜索与导出**
- 创建NotebookSearch页面（/notebook-search）
- 支持跨项目笔记关键词搜索
- 支持按实体类型、内容类型、时间范围筛选
- 支持导出JSON/CSV/Markdown格式
- 支持批量选择和导出
- 统计卡片显示总笔记数、关联项目、AI建议、本月导出

### 技术实现
- 更新 `CrmCustomers.tsx` 添加客户详情对话框和笔记组件
- 更新 `CrmOpportunities.tsx` 添加商机详情对话框和笔记组件
- 更新 `CostManagement.tsx` 添加"笔记"Tab
- 新增 `NotebookSearch.tsx` 笔记搜索与导出页面
- 更新技术规范文档第9章，添加流程笔记扩展内容

### 数据库变更
- 新增 `ai_recognition_rules` 表：AI识别规则库
- 预置32条识别规则数据

### 评审信息
- RFC编号：RFC-027
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v2.4.0] - 2026-01-18

### 新增功能

#### 流程笔记系统 (RFC-026)

**核心功能**
- **左侧员工Notebook**：支持文字、文件、图片、语音多媒体记录
- **右侧AI识别建议**：自动分析笔记内容，关联到相关流程字段
- **确认更换按钮**：用户可一键确认或编辑AI建议后更新

**AI识别能力**
- 客户名称识别 → 关联CRM客户档案
- 产品型号识别 → 关联项目设备配置
- 清洁度标准识别（VDA19.1/ISO16232） → 更新方案技术参数
- 节拍要求识别 → 更新项目生产参数
- 金额数字识别 → 更新报价/成本字段
- 日期时间识别 → 更新项目里程碑
- 问题描述识别 → 添加到OPL问题清单

**UI组件**
- 新增 `ProcessNotebook` 可复用组件
- 左右分栏布局：员工记录 | AI建议
- 支持文件上传、图片上传、语音录制
- 已集成到项目管理页面"笔记"Tab

### 技术实现
- 新增 `processNotebookRoutes.ts` 流程笔记路由
- 新增 `ProcessNotebook.tsx` UI组件
- 更新 `ProjectManagement.tsx` 添加笔记Tab
- 更新技术规范文档第9章《流程笔记系统》

### 数据库变更
- 新增 `process_notebooks` 表：流程笔记本主表
- 新增 `notebook_entries` 表：笔记条目（支持多媒体）
- 新增 `ai_notebook_suggestions` 表：AI笔记建议记录

### 评审信息
- RFC编号：RFC-026
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v2.3.0] - 2026-01-18

### 新增功能

#### AI执行模式选择 (RFC-025)

**双模式支持**
- **系统内AI（轻度模式）**：基于现有案例库和AI化成果，快速响应，结果可预测
- **泛互式AI（广泛模式）**：泛化式广泛分析，深度推理，适合复杂场景
- **模式配置**：每种功能型AI助手可独立配置默认模式和专属提示词

**AI建议面板增强版**
- 新增 `AISuggestionPanelWithMode` 组件
- 集成执行模式切换按钮（系统内/泛互式）
- 已集成到项目管理页面

**员工DA与功能型AI助手联动**
- 新增 `daIntegrationRouter` 联动路由
- 支持员工DA调用功能型AI助手
- 支持工作流模式批量调用多个助手
- 调用历史记录和统计

**AI建议效果追踪页面**
- 新增 `/ai-effectiveness` 页面
- 按助手类型统计采纳率
- 按执行模式对比分析
- 最近执行日志查看
- 平均响应时间统计

### 技术实现
- 新增 `aiExecutionModeRoutes.ts` AI执行模式路由
- 新增 `daIntegrationRoutes.ts` DA联动路由
- 新增 `AISuggestionPanelWithMode.tsx` 增强版AI建议面板
- 新增 `AIEffectivenessTracking.tsx` 效果追踪页面
- 更新 `ProjectManagement.tsx` 集成AI建议面板
- 更新技术规范文档第8章《AI执行模式选择》

### 数据库变更
- 新增 `ai_execution_mode_configs` 表：存储每种助手的执行模式配置
- 新增 `ai_execution_logs` 表：记录AI执行日志和采纳反馈

### 评审信息
- RFC编号：RFC-025
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v2.2.0] - 2026-01-18

### 新增功能

#### AI助手双层体系架构实现 (RFC-024)

**员工数字助手(DA)管理界面**
- 新增 `/digital-assistants` 页面，支持员工DA的创建、编辑、删除
- 支持为每位员工创建专属数字助手（命名规则：员工号-DA）
- DA能力配置：任务辅助、日程管理、文档起草、数据分析、沟通代理
- 支持DA状态切换（启用/禁用）

**AI建议UI组件**
- 新增 `AISuggestionPanel` 组件，支持三种建议模式：
  - 全过程建议：显示后续所有流程的AI智能助手建议
  - 本过程建议：当前流程步骤的AI工作内容建议
  - 单步执行：执行到某一步的AI智能助手工作
- 浅蓝色渐变背景设计，与业务界面区分
- 支持建议应用、复制、反馈功能
- 新增 `AISuggestionBadge` 简化组件用于快速集成

**功能型AI助手Prompt配置**
- 为8种功能型AI助手配置专业系统提示词：
  - AI方案助手（Solution）：工业清洗设备方案设计
  - AI报价助手（Quotation）：项目报价生成和成本分析
  - AI规划助手（Planning）：工作计划制定与跟踪
  - AI KPI助手（KPI）：绩效评估和沟通建议
  - AI面试助手（Interview）：面试评估和候选人分析
  - AI采购助手（Purchase）：采购管理和供应商协调
  - AI工程助手（Engineering）：M0-M12项目全生命周期管理
  - AI质量助手（Quality）：质量检验和问题分析

### 技术实现
- 新增 `DigitalAssistants.tsx` 员工DA管理页面
- 新增 `AISuggestionPanel.tsx` AI建议面板组件
- 新增 `employeeDARoutes.ts` 路由文件
- 新增 `aiSuggestionRoutes.ts` 路由文件
- 新增 `functionalAssistantPrompts.ts` Prompt配置文件
- 更新 `routers.ts` 注册新路由
- 更新 `App.tsx` 添加数字助手页面路由

### 评审信息
- RFC编号：RFC-024
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v2.1.0] - 2026-01-18

### 新增功能

#### AI助手双层体系架构 (RFC-023)

**第一层：员工数字助手 (DA)**
- **命名规则**：`{员工号}-DA`（如 `E001-DA`、`GRT-2024-001-DA`）
- **数据库表**：`employee_digital_assistants`
- **功能能力**：任务协助、日程管理、文档起草、数据分析、沟通代理
- **个性化配置**：工作习惯、偏好设置、专业领域、沟通风格

**第二层：功能型AI助手**
- **AI Solution Assistant**：方案设计和解决方案推荐
- **AI Quotation Assistant**：报价生成和成本分析
- **AI Planning Assistant**：工作计划、培训计划、客户拜访计划生成
- **AI KPI Assistant**：绩效评估、实时评分、沟通建议
- **AI Interview Assistant**：面试评估和候选人分析
- **AI Purchase Assistant**：采购管理和供应商协调
- **AI Engineering Assistant**：M0-M12项目全生命周期管理
- **AI Quality Assistant**：质量检验和问题分析

**AI建议流程集成**
- **数据库表**：`ai_process_suggestions`、`ai_suggestion_execution_logs`
- **三种建议模式**：
  - `full_process`：AI全过程建议，后续所有流程的AI智能助手都在对应栏显示
  - `current_step`：本过程AI流程助手执行工作内容的建议
  - `single_action`：执行到流程某一步的AI智能助手工作
- **UI集成**：浅色AI建议显示、一键应用按钮

### 技术规范更新
- **文档**：`docs/claude-code-nocobase-technical-specification.md` 第7章
- **RFC文档**：`docs/rfc/RFC-023-ai-assistant-dual-layer-architecture.md`

### 数据库变更
- 新增表：`employee_digital_assistants`
- 新增表：`functional_ai_assistants`
- 新增表：`ai_process_suggestions`
- 新增表：`ai_suggestion_execution_logs`
- 预置8种功能型AI助手配置

### 评审信息
- RFC编号：RFC-023
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v2.0.0] - 2026-01-18

### 新增功能

#### AI方案助理作业流程分析
- **作业流程文档**：`docs/ai-solution-assistant-workflow-analysis.md`
- **三层架构**：前端交互层 → tRPC路由层 → 业务服务层
- **与CRM关系**：共享客户数据、商机关联、成本估算集成
- **工作流程图**：用户输入 → 需求分析 → 知识库检索 → 方案生成 → 用户反馈

#### Claude Code + NocoBase技术规范
- **技术规范文档**：`docs/claude-code-nocobase-technical-specification.md`
- **数据库规范**：命名约定、字段类型、索引策略
- **API规范**：RESTful设计、认证机制、错误处理
- **工作流规范**：触发器、节点、条件、动作配置
- **集成规范**：Webhook、事件总线、数据同步

#### 版本更新控制与变更管理规范
- **变更管理文档**：`docs/version-control-change-management.md`
- **RFC流程**：评审 → 批准 → 实施 → 验证 → 发布
- **版本号规范**：语义化版本控制 (MAJOR.MINOR.PATCH)
- **变更类型**：功能新增/Bug修复/性能优化/文档更新/重构
- **回滚策略**：快速回滚、数据备份、服务降级

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.9.0] - 2026-01-18

### 新增功能

#### GRT智能系统本地化部署完整指南
- **部署指南文档**：`docs/grt-local-deployment-complete-guide.md`
- **多平台支持**：Windows/macOS/Linux三平台部署流程
- **七大部分**：环境准备、依赖安装、数据库配置、NocoBase部署、简道云迁移、Claude Code安装、故障排除

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.8.0] - 2026-01-18

### 新增功能

#### Windows NocoBase部署方案
- **部署指南**：`docs/windows-nocobase-deployment-guide.md`
- **PowerShell脚本**：`scripts/nocobase/deploy-windows.ps1`
- **任务导入工具**：`scripts/nocobase/import-tasks.mjs`
- **Docker/源码两种部署方式**

#### 简道云数据迁移方案
- **迁移指南**：`docs/jiandaoyun-migration-guide.md`
- **用户数据迁移**：部门、角色、权限映射
- **流程数据迁移**：表单、工作流、仪表盘
- **自动化脚本示例**

#### Windows Claude Code安装指南
- **安装文档**：`docs/windows-claude-code-installation-guide.md`
- **API密钥配置**
- **验证脚本**

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.7.0] - 2026-01-18

### 新增功能

#### AI对话历史持久化
- **数据库表**：ai_chat_sessions、ai_chat_messages、ai_chat_templates
- **服务模块**：chatHistoryService.ts
- **tRPC路由**：chatHistoryRoutes.ts
- **前端界面**：历史对话按钮、会话列表、消息持久化

### 测试
- 新增35个对话历史单元测试
- 总测试数：632个，全部通过

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.6.0] - 2026-01-18

### 新增功能

#### AI助手功能完善
- **侧边栏导航入口**：/ai-assistant路由+Bot图标
- **真实LLM对话**：Solution/Quotation/Planning/KPI助手集成invokeLLM
- **统一聊天路由**：server/ai-assistants/chatRoutes.ts

#### NocoBase部署工具
- **Docker配置**：scripts/nocobase/docker-compose.yml
- **任务JSON**：scripts/nocobase/ai-assistant-tasks.json (17个任务)
- **API集成**：server/integrations/nocobaseIntegration.ts

### 测试
- 新增37个AI Chat单元测试
- 总测试数：597个，全部通过

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.5.0] - 2026-01-18

### 新增功能

#### 员工AI助手系统
- **数据库表**：10个新表（employee_ai_assistants、ai_assistant_interactions等）
- **服务模块**：employeeAiAssistantService.ts
- **tRPC路由**：employeeAiAssistantRoutes.ts
- **前端页面**：AI助手中心页面 (/ai-assistant)

#### NocoBase部署指南
- **部署文档**：docs/nocobase-deployment-guide.md

### 测试
- 新增43个员工AI助手单元测试
- 总测试数：560个，全部通过

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.4.0] - 2026-01-18

### 新增功能

#### AI Engineering Assistant架构
- **项目全生命周期任务分配**：M0-M12阶段
- **8个工程角色定义**
- **阶段-角色责任矩阵**：PHASE_ROLE_MATRIX
- **智能任务分配算法**
- **客户沟通AI分析**：analyzeCustomerCommunication
- **通知时间优化**：optimizeNotificationTiming

#### 智能制造扩展架构
- 人型机器人对接接口
- AGV运料系统接口
- 智能检验系统接口
- 客户AI系统对接接口
- SEO优化架构

#### 数字化市场推广架构
- 客户门户系统
- 特殊批准访问
- 项目状态实时查询

### 测试
- 新增38个AI Engineering Assistant测试
- 总测试数：517个，全部通过

### 评审信息
- 评审人：技术负责人
- 评审日期：2026-01-18
- 批准状态：已批准

---

## [v1.3.11] - 2026-01-16

### 新增功能

#### 任务1-甘特图关键路径计算
- **关键路径算法**：实现Forward Pass/Backward Pass算法
- **路径高亮**：关键路径任务红色脉冲效果高亮显示
- **浮动时间**：tooltip显示总浮动和自由浮动时间
- **切换按钮**：支持开关关键路径显示
- **图例说明**：添加关键路径图例标识
- **工期统计**：显示项目总工期

#### 任务2-Webhook重试机制
- **重试配置**：支持最大重试次数、重试间隔设置
- **指数退避**：`calculateRetryDelay`函数实现指数退避算法
- **重试状态**：发送日志显示重试次数和状态
- **手动重试**：`retryLog` API支持手动重试失败记录
- **前端配置UI**：Webhook表单添加重试配置选项

#### 任务3-预警规则模板库
- **模板数据库**：新增`costAlertRuleTemplates`表
- **内置模板**：10个预置模板（预算/绩效/成本/风险类）
- **一键导入**：`createRuleFromTemplate` API从模板创建规则
- **自定义模板**：`saveRuleAsTemplate` API保存规则为模板
- **模板库UI**：分类筛选、使用次数统计、初始化内置模板

### 数据库更新
- `webhookConfigs` 表添加重试配置字段 (maxRetries, retryInterval, useExponentialBackoff)
- `webhookLogs` 表添加重试状态字段 (retryCount, retryStatus, nextRetryAt)
- 新增 `costAlertRuleTemplates` 表（模板名称/分类/配置/使用次数）

### API更新
- 新增 `planningDependency.getCriticalPath` 关键路径计算API
- 新增 `webhook.retryLog` 手动重试API
- 新增 `costAlert.template.*` 模板管理API（list/initBuiltin/createFromTemplate/saveAsTemplate）

### 测试
- 191个单元测试全部通过

---

## [v1.3.10] - 2026-01-16

### Bug修复
- 修复 Webhook条件触发编辑器缺失问题，添加完整的条件配置界面
- 修复 甘特图依赖线未渲染问题，添加SVG依赖线和交互功能

### 新增功能

#### 任务1-甘特图依赖线交互增强
- **拖拽创建依赖**：从甘特条右侧连接点拖拽到另一个条创建依赖关系
- **依赖线交互**：点击依赖线显示详情弹窗，支持查看和删除
- **状态反馈**：依赖线悬停蓝色高亮、选中绿色高亮
- **拖拽预览**：拖拽时显示实时连线预览

#### 任务2-Webhook条件测试功能
- **测试按钮**：在条件编辑器中添加"测试条件"按钮
- **模拟数据输入**：支持输入预警级别/项目类型/成本金额/事件类型等测试数据
- **结果预览**：显示逐条条件匹配结果和最终结果
- **运算符支持**：eq/ne/gt/lt/gte/lte/contains/in等全部运算符

#### 任务3-预警规则批量版本管理
- **批量选择**：支持全选/清除/单选规则
- **批量回滚**：选择日期将多条规则回滚到该日期之前的版本
- **版本导出**：支持JSON/CSV格式导出选中规则
- **选中状态**：规则选中时高亮显示

### 测试
- 191个单元测试全部通过

---

## [v1.3.9] - 2026-01-16

### 新增功能

#### Webhook条件触发
- **条件表达式语法**：支持JSON格式的条件定义
- **多种运算符**：eq/ne/gt/lt/gte/lte/in/between/contains/startsWith/endsWith
- **逻辑组合**：支持AND/OR逻辑运算符组合多个条件
- **条件编辑器**：在Webhook配置中添加可视化条件编辑器
- **条件验证**：支持实时验证条件表达式

#### 甘特图项目依赖
- **依赖关系数据库**：新增`annual_planning_dependencies`表
- **依赖类型**：支持FS/SS/FF/SF四种依赖类型
- **依赖线渲染**：在甘特图中绘制依赖连线
- **依赖管理API**：完整的CRUD操作
- **前置任务设置**：支持在项目详情中设置前置任务

#### 预警规则版本管理
- **版本历史数据库**：新增`cost_alert_rule_versions`表
- **自动版本保存**：规则更新时自动保存当前版本
- **版本列表**：查看规则的所有历史版本
- **版本对比**：对比不同版本的差异（新增/删除/修改）
- **版本回滚**：支持回滚到任意历史版本
- **变更摘要**：记录每次版本变更的原因

### 文档更新
- 更新todo.md记录三个新功能完成状态

### 测试
- 新增30个v1.3.9功能单元测试
- 全部191个单元测试通过

---

## [v1.3.8] - 2026-01-16

### 新增功能

#### Webhook模板变量扩展
- **扩展变量库**：新增`user_list`、`attachment_url`、`attachment_name`等变量
- **变量解析引擎**：`renderTemplate`函数支持嵌套变量替换
- **分类变量提示**：基础变量/项目变量/用户变量/附件变量分类展示
- **变量文档**：在模板编辑器中添加变量说明

#### 甘特图拖拽调整
- **拖拽移动**：支持拖拽整个项目条调整时间
- **边缘调整**：支持左右边缘拖拽调整时间跨度
- **实时预览**：拖拽时实时显示新的时间范围
- **自动保存**：拖拽结束后自动保存更新

#### 预警规则Excel模板
- **CSV模板文件**：`/templates/cost-alert-rules-template.csv`
- **示例数据模板**：包含6条示例规则的模板
- **导入说明文档**：`cost-alert-rules-template-guide.md`
- **多种下载方式**：基础模板/带示例模板/查看说明

### 文档更新
- 新增`cost-alert-rules-template-guide.md`：预警规则导入模板说明

### 测试
- 新增23个v1.3.8功能单元测试
- 全部161个单元测试通过

---

## [v1.3.7] - 2026-01-16

### 新增功能

#### Webhook消息模板自定义
- **模板数据库表**：新增`webhook_message_templates`表
- **变量替换**：支持`{{event_type}}`、`{{project_name}}`、`{{alert_level}}`等标准变量
- **模板管理API**：完整的CRUD操作（创建/读取/更新/删除）
- **模板编辑器**：在Webhook管理页面新增模板管理Tab
- **预览功能**：支持实时预览模板渲染效果
- **事件类型**：支持会议提醒/成本预警/项目更新/培训通知/系统通知

#### 年度规划甘特图视图
- **甘特图组件**：时间线形式展示全年规划
- **按类别分组**：里程碑/培训/评审/其他分组显示
- **时间跨度显示**：按月份展示项目持续时间
- **状态标记**：已完成/进行中/未开始不同颜色
- **当前月高亮**：突出显示当前月份位置

#### 预警规则批量导入
- **CSV导入模板**：标准化的导入格式（10个字段）
- **文件解析**：`parseCSV` API端点解析并验证CSV数据
- **批量导入**：`batchImport` API端点批量创建规则
- **导出功能**：`exportCSV` API端点导出现有规则
- **前端界面**：在成本管理页面添加导入/导出按钮
- **中英文映射**：自动转换中文字段名和值

### 数据库更新
- 新增`webhook_message_templates`表：存储消息模板配置

### 测试
- 新增23个v1.3.7功能单元测试
- 全部138个单元测试通过

---

## [v1.3.6] - 2026-01-16

### 新增功能

#### Webhook管理前端页面
- **Webhook配置管理界面**：`WebhookManagement.tsx`完整前端页面
- **多平台支持**：企业微信/钉钉/飞书/自定义Webhook
- **配置管理**：添加/编辑/删除/启用/禁用Webhook
- **连接测试**：一键测试Webhook连接状态
- **发送日志**：查看每个Webhook的发送历史和状态
- **事件类型筛选**：按事件类型配置触发条件
- **导航集成**：在侧边栏添加Webhook管理入口

#### 年度规划日历视图增强
- **时间线视图**：按类别分组展示全年规划项目
- **月度网格视图**：12个月卡片展示，当前月高亮标记
- **完成状态统计**：每月完成数/总数统计
- **图例说明**：已完成/进行中/无项目状态图例
- **悬停提示**：显示项目名称和状态详情

#### 成本预警Webhook集成
- **预警Webhook发送**：`sendCostAlertWebhook`函数
- **自动集成**：成本预警触发时自动发送Webhook
- **级别区分**：信息/警告/严重三级预警
- **@所有人**：严重预警自动@所有人
- **通知状态**：更新isNotified字段记录发送状态

#### 开发流程规划体系
- **Claude Code开发规范**：`development-workflow-guide.md`
- **功能检查清单模板**：`feature-checklist.md`
- **Manus-Claude协作流程**：明确责任分工
- **开发日志规范**：`dev-logs/`目录结构

### 改进
- 优化年度规划页面的日历视图交互体验
- 添加Webhook管理的中英文翻译
- 完善成本预警的通知流程

### 测试
- 新增19个v1.3.6功能单元测试
- 全部115个单元测试通过

---

## [v1.3.5] - 2026-01-16

### 新增功能

#### 年度规划前端页面
- **年度规划管理页面**：`AnnualPlanning.tsx`完整前端界面
- **版本管理**：支持多年度版本切换和激活
- **规划项目管理**：支持添加/编辑/删除年度规划项目
- **复制到新年度**：一键复制现有规划到新年度
- **AI自动更新**：支持AI批量更新全系统年度规划
- **更新日志**：查看年度规划变更历史
- **导航集成**：在侧边栏添加年度规划入口

#### 培训参与者用户选择器
- **用户列表API**：`getAllUsersForSelection`获取可选用户列表
- **用户搜索API**：`searchUsers`支持按名称/邮箱搜索
- **批量添加升级**：支持从用户列表多选添加
- **搜索筛选**：实时搜索用户并选择

#### Webhook集成
- **Webhook模块**：`server/webhook/index.ts`支持多平台通知
- **企业微信**：Markdown格式消息支持
- **钉钉**：Markdown格式消息支持
- **飞书**：交互式卡片消息支持
- **自定义Webhook**：支持任意HTTP端点
- **配置管理**：Webhook配置数据库表和CRUD API
- **事件触发**：按事件类型筛选Webhook
- **测试功能**：支持发送测试消息验证配置
- **日志记录**：详细记录每次Webhook发送结果
- **会议提醒集成**：自动发送会议提醒到配置的Webhook

### 数据库更新
- 新增`webhook_configs`表：存储Webhook配置
- 新增`webhook_logs`表：记录Webhook发送日志

### 文档
- 更新会议提醒配置文档，添加Webhook集成说明
- 添加Webhook消息格式文档
- 添加Webhook API配置示例

### 测试
- 新增14个Webhook集成单元测试
- 新增用户选择器单元测试
- 新增批量添加参与者解析测试
- 全部96个单元测试通过

---

## [v1.3.4] - 2026-01-16

### 新增功能

#### 年度规划数据管理方案
- **数据库Schema**：新增`annual_planning_configs`和`annual_planning_items`表
- **多年度支持**：支持多年度规划版本管理
- **版本切换**：支持激活/停用不同年度版本
- **AI自动更新**：`aiUpdateAnnualPlanning`支持批量更新年度规划项目
- **年度复制**：`copyAnnualPlanningToNewYear`支持将规划复制到新年度
- **完整API**：提供配置管理、项目管理、AI更新等全套端点

#### 批量添加培训参与者
- **批量添加对话框**：在参与者管理中新增批量添加功能
- **多用户输入**：支持逗号或换行分隔的用户ID列表
- **添加结果反馈**：显示成功/失败数量和详情
- **API端点**：`batchAddParticipants`支持批量添加操作

#### 会议提醒定时任务
- **定时任务脚本**：`server/cron/meetingReminderJob.ts`
- **配置文档**：`docs/meeting-reminder-cron-setup.md`
- **多种触发方式**：支持API手动触发和Cron自动执行
- **日志记录**：详细记录提醒处理结果

#### 培训统计仪表盘
- **仪表盘组件**：`TrainingStatsDashboard.tsx`
- **关键指标卡片**：培训总数/已完成/参与人次/证书颁发
- **状态分布图**：饼图展示培训状态分布
- **类型分布图**：饼图展示培训类型分布
- **绩效指标**：完成率/通过率/平均成绩/年度目标达成
- **最近培训列表**：展示最近5个培训计划

### Bug修复
- 修复培训管理页面点击培训后不自动切换到参与者Tab的问题
- 修复参与者管理Tab标题重复显示添加按钮的问题

### 文档
- 新增年度规划AI更新指南（`docs/annual-planning-ai-update.md`）
- 新增会议提醒定时任务配置指南
- 新增简道云年度计划数据结构分析文档

### 测试
- 新增年度规划管理单元测试
- 新增批量添加参与者单元测试
- 全部测试用例通过

---

## [v1.3.3] - 2026-01-16

### 新增功能

#### 培训参与者管理
- **参与者列表**：在培训管理页面新增参与者管理Tab
- **添加参与者**：支持通过用户ID添加培训参与者
- **状态管理**：支持注册/确认/取消状态切换
- **出勤记录**：记录参与者出席情况（未知/出席/缺席/部分出席）
- **成绩录入**：支持录入参与者培训成绩和通过状态
- **反馈评分**：支持培训反馈评分（1-5分）和文字反馈

#### 预警日志查看功能
- **预警历史记录**：在成本管理页面查看项目预警历史
- **状态更新**：支持预警状态更新（确认/解决/忽略）
- **处理备注**：支持添加预警处理备注

#### 会议提醒发送逻辑
- **定时检查**：`processMeetingReminders` API端点检查待发送提醒
- **通知集成**：集成系统通知API（notifyOwner）
- **发送记录**：`markReminderSent`记录提醒发送状态
- **待发送查询**：`getReadyToSend`获取待发送提醒列表

### 测试
- 新增培训参与者管理单元测试
- 新增成本预警日志单元测试
- 新增会议提醒单元测试
- 全部67个测试用例通过

---

## [v1.3.2] - 2026-01-16

### 新增功能

#### 会议提醒配置UI
- **集成到新建会议对话框**：在创建会议时可直接设置提醒
- **提醒时间选择**：支持5/15/30/60/120/1440分钟提前提醒
- **通知方式选择**：支持邮件、系统通知或两者结合

#### 成本预警规则管理界面
- **预警规则Tab**：在成本管理页面新增预警规则标签页
- **规则列表展示**：显示5个默认预警规则及其状态
- **启用/禁用开关**：可切换规则的激活状态
- **通知设置**：配置预警通知方式

#### 培训管理前端页面
- **培训计划列表**：展示所有培训计划及其状态
- **培训创建对话框**：快速创建新培训计划
- **培训评估创建**：为培训创建测验/问卷/实操评估
- **证书颁发界面**：为通过培训的人员颁发证书
- **统计报表**：培训数量、完成率、证书数量、通过率
- **导航集成**：侧边栏新增培训管理入口

---

## [v1.3.1] - 2026-01-16

### 新增功能

#### 会议提醒模块
- **提醒配置**：支持设置会议开始前的提醒时间（30分钟/1小时/1天等）
- **多渠道通知**：支持邮件、系统通知或两者结合
- **发送记录**：记录提醒发送状态和结果

#### 培训评估模块
- **培训测评**：支持测验、问卷、实操三种评估类型
- **评估结果**：自动计算得分和是否通过
- **统计分析**：参与人数、通过率、平均分统计

#### 培训证书模块
- **证书颁发**：支持为培训完成者颁发证书
- **证书查询**：支持按证书编号查询验证
- **状态管理**：有效/过期/撤销状态管理
- **有效期管理**：支持设置证书有效期

#### 成本预警模块
- **预警规则**：支持预算百分比、绝对金额、CPI指数三种预警类型
- **预警级别**：警告、严重、紧急三级预警
- **默认规则**：5个预置预警规则（80%/95%/100%预算使用率，CPI<0.9/<0.8）
- **预警日志**：记录预警触发和处理过程
- **状态管理**：待处理/已确认/已解决/已忽略

---

## [v1.3.0] - 2026-01-16

### 新增功能

#### 成本管理模块 (v1.3)
- **成本类别管理**：支持19个默认成本类别（材料费、人工费、设备费、差旅费、外协费等）
- **项目预算管理**：按年度/月度设置项目预算，支持多类别预算分配
- **成本记录追踪**：记录每笔成本支出，包含成本编码、供应商、发票号等详细信息
- **人工成本管理**：按员工记录工时和人工成本
- **成本分析报表**：
  - 预算使用率统计
  - CPI（成本绩效指数）计算
  - 成本偏差分析
- **报表导出功能**：支持文本和Excel/CSV格式导出

#### 企业议程管理模块
- **会议类型管理**：15种默认会议类型（晨会、周会、月会、季度会、年度会等）
- **会议日程管理**：
  - 多层级会议分类（公司级/部门级/项目级/班组级/个人级）
  - 会议地点、参与人员、议程管理
  - 周期性会议支持
- **培训计划管理**：
  - 培训类型分类（入职培训、技能培训、安全培训等）
  - 培训师和参与人员管理
  - 培训状态追踪
- **年度计划管理**：
  - 产值目标、利润目标、客户目标
  - 投资预算、人员预算
  - 计划状态追踪

### 改进

#### CRM模块增强
- **测试数据生成**：管理员可一键生成演示数据（8个客户、8个商机、8个联系人）
- **BANT评分数据**：自动生成BANT评分测试数据

#### 项目管理模块增强
- **M0-M12阶段门禁可视化**：时间轴形式展示项目全生命周期阶段
- **里程碑管理**：项目里程碑的创建、编辑和状态追踪
- **进度条显示**：直观展示项目整体进度

---

## [v1.2.0] - 2026-01-15

### 新增功能

#### 项目管理模块 (v1.2)
- **项目数据库Schema**：projects, milestones, gates, tasks, project_documents表
- **M0-M12阶段门禁模型**：
  - M0: 商机确认
  - M1: 立项评审
  - M2: 需求确认
  - M3: 方案设计
  - M4: 设计评审
  - M5: 采购准备
  - M6: 生产制造
  - M7: 装配调试
  - M8: FAT测试
  - M9: 发货安装
  - M10: SAT测试
  - M11: 验收交付
  - M12: 质保结束
- **项目API端点**：完整的CRUD操作和统计查询
- **项目前端页面**：项目列表、创建对话框、详情视图

---

## [v1.1.0] - 2026-01-14

### 新增功能

#### 简道云API集成
- **V5 API适配**：更新API客户端代码适配简道云V5 API格式
- **应用同步**：自动同步简道云应用列表（当前55+个应用）
- **表单获取**：获取应用下的表单列表和字段定义
- **数据查询**：支持表单数据的条件查询
- **实时数据同步按钮**：系统分析页面一键同步最新数据

#### CRM管理模块
- **客户管理**：企业客户的创建、编辑、查询
- **商机管理**：销售漏斗、阶段推进、预测金额
- **联系人管理**：客户联系人信息维护
- **BANT评分**：线索评分模型（预算、权限、需求、时间）

---

## [v1.0.0] - 2026-01-13

### 初始版本

#### 核心功能
- **首页仪表盘**：实时系统负载监控、关键指标展示
- **实施路径规划**：16周MVP实施路线图
- **工具推荐**：低代码平台、BI工具、AI助手推荐
- **风险控制**：风险矩阵、变更管理框架
- **文档中心**：技术文档和交付物归档

#### 技术架构
- **前端**：React 19 + Tailwind CSS 4 + shadcn/ui
- **后端**：Express 4 + tRPC 11
- **数据库**：MySQL/TiDB + Drizzle ORM
- **认证**：Manus OAuth集成

---

## 版本命名规范

- **主版本号**：重大功能模块上线（如v1.0 → v2.0）
- **次版本号**：新功能模块添加（如v1.1 → v1.2）
- **修订版本号**：Bug修复和小改进（如v1.1.0 → v1.1.1）

## 更新频率

- 每完成一个功能模块后更新此日志
- 记录所有用户可见的功能变更
- 保持日志的完整性和可追溯性
