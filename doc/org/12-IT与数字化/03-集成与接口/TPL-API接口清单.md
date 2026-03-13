# TPL-API接口清单

> **适用范围**：开发团队、集成开发、安全审计
> **更新频率**：新增/修改 Router 时更新
> **审批流程**：开发提交 → 架构师审核 → 测试验证

## 模板

### tRPC Router 接口清单

| Router 名称 | 业务域 | Procedures 数 | 认证要求 | BU 隔离 | 限流 | 状态 |
|-------------|--------|--------------|----------|---------|------|------|
| | | | 公开/认证/权限 | 是/否 | 次/分 | 生产/开发 |

---

### 样例数据：GRT 核心 Router 清单（Top 40）

#### 项目管理域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| project | 18 | 权限 | 是 | create, list, update, getById, archive | 42 tests |
| projectGate | 12 | 权限 | 是 | approve, reject, getReviewItems | 28 tests |
| pos | 35+ | 权限 | 是 | M0-M12 stage管理, procurement, BOM | 50+ tests |
| aiPlanning | 8 | 权限 | 否 | generatePlan, optimizeSchedule | 15 tests |
| project360 | 10 | 权限 | 是 | dashboard, timeline, riskMatrix | 20 tests |

#### 质量管理域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| fmea | 15 | 权限 | 否 | create, addFailureMode, calculateRPN | 35 tests |
| controlPlan | 12 | 权限 | 否 | create, addCharacteristic, generate | 25 tests |
| eightDCapa | 14 | 权限 | 否 | create8D, addRootCause, addAction | 30 tests |
| ppap | 10 | 权限 | 否 | createSubmission, addDocument | 22 tests |
| msa | 8 | 权限 | 否 | createStudy, calculateGaugeRR | 18 tests |

#### 生产制造域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| production | 20 | 权限 | 是 | schedule, startOrder, reportOutput | 40 tests |
| mes | 15 | 权限 | 是 | workOrder, stationStatus, oeeCalc | 30 tests |
| processSteps | 18 | 权限 | 否 | getSteps, updateProgress, assignWorker | 35 tests |
| oeeDashboard | 8 | 认证 | 是 | getOEE, getTrend, getDowntimeAnalysis | 16 tests |
| smartInventory | 12 | 权限 | 否 | getStock, adjustQuantity, alertLow | 24 tests |

#### 供应链域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| supplyChain | 65 | 权限 | 否 | labels, iqc, bomScan, complaints | 50+ tests |
| procurement | 15 | 权限 | 是 | createPR, createPO, approveOrder | 30 tests |
| warehouse | 12 | 权限 | 否 | receive, issue, transfer, stocktake | 25 tests |
| supplierRisk | 10 | 权限 | 否 | scoreSupplier, getRiskMatrix | 20 tests |

#### 人力资源域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| hrm | 15 | 权限 | 否 | getEmployees, updateProfile | 30 tests |
| employee | 12 | 权限 | 否 | onboard, offboard, transfer | 25 tests |
| competency | 10 | 权限 | 否 | assess, getRadar, getGap | 20 tests |
| trainingAssessment | 12 | 权限 | 否 | createCourse, enroll, evaluate | 24 tests |
| perfSalary | 10 | 权限 | 否 | createReview, calculateBonus | 20 tests |

#### AI 服务域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| aiChat | 8 | 认证 | 否 | sendMessage, getHistory, clearHistory | 16 tests |
| aiAssistant | 12 | 认证 | 否 | askCopilot, getPageSuggestions | 25 tests |
| aiModel | 8 | 权限 | 否 | listModels, configModel, testModel | 16 tests |
| aiSuggestion | 6 | 认证 | 否 | generateSuggestion, listSuggestions | 12 tests |
| help | 15 | 认证 | 否 | search, getArticle, askCopilot, feedback | 30 tests |

#### 系统管理域

| Router | Procedures | 认证 | BU 隔离 | 关键接口 | 测试 |
|--------|-----------|------|---------|----------|------|
| auth | 6 | 公开/认证 | 否 | login, logout, refreshToken | 20 tests |
| permission | 12 | 权限 | 否 | assignRole, checkPermission | 25 tests |
| notification | 10 | 认证 | 否 | send, list, markRead | 20 tests |
| scheduler | 8 | 权限 | 否 | listJobs, createJob, pauseJob | 16 tests |
| vault | 6 | 权限 | 否 | storeSecret, getSecret | 12 tests |

### API 统计汇总

| 统计项 | 数值 |
|--------|------|
| 总 Router 数 | 86 |
| 总 Procedure 数 | ~900+ |
| 认证类型分布 | 公开: 2, 认证: ~100, 权限: ~800 |
| BU 隔离 Router | 15 |
| 平均 Procedures/Router | ~10.5 |
| 测试覆盖率 | 100%（327 测试文件） |

## 使用说明

1. **接口命名规范**：`domain.action`（如 `project.create`, `fmea.calculateRPN`）
2. **认证等级**：公开（无需登录）< 认证（需登录）< 权限（需特定权限）
3. **新增 Router 流程**：设计 → 开发 → 测试 → 注册到 `server/routers.ts` → 添加到 `router-manifest.ts`
4. **限流配置**：默认 100 次/分钟，AI 服务 20 次/分钟，登录 10 次/分钟
5. **文档同步**：Router 变更时同步更新本清单
