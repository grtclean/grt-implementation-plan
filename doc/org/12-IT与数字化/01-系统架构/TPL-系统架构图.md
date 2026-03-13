# TPL-系统架构图

> **适用范围**：IT 团队、系统管理员、新员工技术培训
> **更新频率**：每次重大架构变更后更新
> **审批流程**：架构师编制 → CTO 审批

## 模板

### 一、全景架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户接入层 (User Access)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Web 浏览器 │  │ 钉钉 H5  │  │ 移动端PWA │  │ 客户门户  │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                       前端应用层 (Frontend)                          │
│  React 19 + TypeScript + Vite + Wouter + tRPC Client               │
│  ┌───────────────────────────────────────────────────────┐         │
│  │  App Shell (O365 Desktop / DingTalk Mobile)            │         │
│  │  ├── TopHeader (搜索/通知/语言/用户)                     │         │
│  │  ├── WaffleMenu (13 应用磁贴)                           │         │
│  │  ├── ContextualSidebar (动态菜单, 287 items, 22 subgroups)│        │
│  │  └── ContentArea (386 lazy-loaded pages)               │         │
│  └───────────────────────────────────────────────────────┘         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ CopilotBar│  │ AI Canvas│  │ i18n 4语言│  │ ProfileSw│          │
│  │ (Ctrl+/) │  │ (Alt+A)  │  │ zh/en/de/fr│ │ (18 roles)│          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────────────────────┘
                                  │ tRPC (JSON over HTTP)
┌─────────────────────────────────────────────────────────────────────┐
│                       后端服务层 (Backend)                           │
│  Express + tRPC v10 + Node.js                                      │
│  ┌───────────────────────────────────────────────────────┐         │
│  │  Gateway 中间件链                                       │         │
│  │  ├── helmet (CSP/Security Headers)                     │         │
│  │  ├── cors (跨域控制)                                    │         │
│  │  ├── rate-limiter (API 限流)                            │         │
│  │  ├── gateway-audit (审计日志)                            │         │
│  │  ├── gateway-bu-context (BU 上下文注入)                  │         │
│  │  └── requirePermission (RBAC 权限检查)                   │         │
│  └───────────────────────────────────────────────────────┘         │
│  ┌───────────────────────────────────────────────────────┐         │
│  │  86 tRPC Routers (按业务域分组)                          │         │
│  │  ├── 项目管理: project, projectGate, pos, aiPlanning    │         │
│  │  ├── 生产制造: production, mes, processSteps, oee       │         │
│  │  ├── 质量管理: fmea, controlPlan, eightDCapa, ppap, msa │         │
│  │  ├── 供应链:   supplyChain, procurement, warehouse      │         │
│  │  ├── 人力资源: hrm, employee, training, competency      │         │
│  │  ├── 客户服务: customerTicket, afterSales, crm          │         │
│  │  ├── AI 服务:  aiChat, aiAssistant, aiModel, copilot   │         │
│  │  ├── 研发设计: designEngine, rndNpi, plm               │         │
│  │  └── 系统管理: auth, permission, notification, scheduler│         │
│  └───────────────────────────────────────────────────────┘         │
│  ┌───────────────────────────────────────────────────────┐         │
│  │  服务层                                                 │         │
│  │  ├── AI Services (OpenAI/Gemini 适配器)                 │         │
│  │  ├── Microsoft Graph (O365/SharePoint/Outlook)          │         │
│  │  ├── 钉钉 API (消息推送/审批/组织同步)                    │         │
│  │  ├── 天思 ERP (物料/订单/库存同步)                       │         │
│  │  ├── 简道云 (表单数据同步)                               │         │
│  │  └── pino (结构化日志)                                  │         │
│  └───────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                                  │ Drizzle ORM (SQL)
┌─────────────────────────────────────────────────────────────────────┐
│                       数据存储层 (Data)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ MySQL/TiDB│  │ Vector DB│  │ File Store│  │ Redis    │          │
│  │ (主数据库) │  │ (AI 向量) │  │ (文件存储) │  │ (缓存/会话)│          │
│  │ 200+ 表   │  │ 嵌入索引  │  │ 文档/附件  │  │ Rate Limit│          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                       基础设施层 (Infrastructure)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Docker   │  │ Nginx    │  │ CI/CD    │  │ 监控告警   │          │
│  │ 容器化部署│  │ 反向代理  │  │ 自动化部署│  │ 健康检查  │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### 二、模块全景（按业务域）

| 业务域 | Router 数量 | 核心模块 | DB 表数量 | 状态 |
|--------|-----------|----------|----------|------|
| 项目管理 | 8 | project, pos, projectGate, aiPlanning, project360 | 20+ | 生产 |
| 生产制造 | 10 | production, mes, processSteps, oee, scheduling | 25+ | 生产 |
| 质量管理 | 8 | fmea, controlPlan, eightDCapa, ppap, msa, sopInterlock | 20+ | 生产 |
| 供应链 | 6 | supplyChain, procurement, warehouse, smartInventory | 15+ | 生产 |
| 人力资源 | 8 | hrm, employee, competency, training, hrLifecycle | 15+ | 生产 |
| 客户服务 | 6 | customerTicket, afterSales, crm, customerAuthorization | 12+ | 生产 |
| 销售管理 | 5 | aiSales, leadAnalytics, leadAutoFollow, campaign | 10+ | 生产 |
| AI 服务 | 10 | aiChat, aiAssistant, aiModel, aiNotebook, aiCanvas | 15+ | 生产 |
| 研发设计 | 5 | designEngine, rndNpi, plm, digitalTwin | 20+ | 生产 |
| 系统管理 | 12 | auth, permission, notification, scheduler, vault | 15+ | 生产 |
| 财务管理 | 5 | expense, cost, financeAgent, budgetOverrun | 10+ | 生产 |
| 协作办公 | 3 | oa, oaForms, collaborationDocs | 8+ | 生产 |

### 三、安全架构

```
┌─────────────────────────────────────┐
│           安全防护层级              │
│                                     │
│  L1 网络层: CSP + HTTPS + CORS      │
│  L2 认证层: JWT + OAuth + Session   │
│  L3 授权层: 18 Roles + 278 Perms   │
│  L4 API层: Rate Limit + Input Val  │
│  L5 数据层: 参数化查询 + 加密存储    │
│  L6 审计层: 全链路审计日志           │
│  L7 监控层: 异常检测 + 告警          │
│                                     │
│  安全评分: 10/10                    │
│  SQL 注入向量: 0                    │
│  未授权 mutations: 0                │
│  z.any() 使用: 0                   │
│  @ts-ignore: 0                     │
└─────────────────────────────────────┘
```

### 四、数据流架构

```
外部系统                    GRT 平台                     数据消费
┌─────────┐           ┌──────────────┐           ┌─────────────┐
│ 天思 ERP │──同步──→  │  ERP Router  │──存储──→  │  报表/分析   │
│ (物料/单) │           │              │           │             │
├─────────┤           ├──────────────┤           ├─────────────┤
│ 简道云   │──导入──→  │  JDY Router  │──关联──→  │  业务流程    │
│ (表单)   │           │              │           │             │
├─────────┤           ├──────────────┤           ├─────────────┤
│ 钉钉    │──双向──→  │ DingTalk RTR │──推送──→  │  消息通知    │
│ (审批/消息)│          │              │           │             │
├─────────┤           ├──────────────┤           ├─────────────┤
│ O365    │──同步──→  │ MS Graph RTR │──展示──→  │  协作办公    │
│ (邮件/日历)│          │              │           │             │
├─────────┤           ├──────────────┤           ├─────────────┤
│ AI 模型  │──调用──→  │ AI Adapter   │──结果──→  │  智能分析    │
│ (GPT/Gem)│           │              │           │             │
└─────────┘           └──────────────┘           └─────────────┘
```

### 五、V2.0 Super App 引擎架构

| 引擎 | 路径 | 核心功能 | 目标用户 |
|------|------|----------|----------|
| E1: Me Portal | `/me` | 个人工作台、任务、日程 | 全员 |
| E2: AI Canvas | 全局浮窗 | AI 工作流、模板草稿 | 全员 |
| E3: Strategy | `/strategy` | OKR、战略规划、目标追踪 | 管理层 |
| E4: Operations | `/operations` | M0-M12 项目、生产、质量 | 业务人员 |
| E5: Resources | `/resources` | HR、财务、OA、系统 | 职能部门 |

## 使用说明

1. **新人培训**：新入职 IT 人员必须学习本架构图，了解系统全貌
2. **架构评审**：重大技术决策前需对照架构图评估影响范围
3. **变更管理**：架构变更需提交 ADR（Architecture Decision Record）
4. **与开发对接**：前端开发参考 `client/src/App.tsx`（路由），后端开发参考 `server/routers.ts`（路由注册）
5. **性能基线**：Vite 构建时间 ≤30s，API P95 响应 ≤500ms，测试执行 ≤60s
