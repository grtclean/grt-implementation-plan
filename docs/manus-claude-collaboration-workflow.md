# Manus-Claude Code协作开发流程

**版本**: 1.1  
**作者**: Manus AI  
**创建日期**: 2026年1月17日  
**更新日期**: 2026年1月19日  
**状态**: 活跃

---

## 1. 概述

本文档定义Manus和Claude Code之间的协作开发流程，基于NocoBase架构，实现自动化的任务分解、开发、测试和验收。该流程确保代码质量、安全可靠性，并通过自动化检查和循环迭代最小化Bug。

### 1.1 核心目标

| 目标 | 描述 |
|------|------|
| **质量保证** | 通过多轮测试和验证确保代码质量 |
| **自动化流程** | 最小化人工干预，提高开发效率 |
| **可追溯性** | 完整记录每个任务的执行过程 |
| **风险管理** | 及时发现和处理Bug，评估影响 |
| **知识积累** | 保存调试过程，为后续优化提供参考 |

### 1.2 协作模式

```
┌─────────────────────────────────────────────────────────────────┐
│                     Manus（任务分配者）                          │
│  • 复杂协议书分解为步骤任务                                      │
│  • 自动化检查和验证                                              │
│  • Bug识别和指导修复                                             │
│  • 最终测试和验收                                                │
├─────────────────────────────────────────────────────────────────┤
│                    任务队列（NocoBase）                          │
│  • 任务状态追踪                                                  │
│  • 执行日志记录                                                  │
│  • Bug和改进建议                                                 │
├─────────────────────────────────────────────────────────────────┤
│                   Claude Code（开发执行者）                      │
│  • 根据任务规范编写代码                                          │
│  • 本地测试和验证                                                │
│  • 根据反馈修复Bug                                               │
│  • 提交代码供Manus检查                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 协作流程设计

### 2.1 工作流程图

```
开始
  ↓
[1] Manus分解任务
    • 分析复杂协议书
    • 生成步骤任务列表
    • 创建NocoBase任务记录
  ↓
[2] 分配任务给Claude Code
    • 设置任务优先级
    • 提供详细规范
    • 配置验收标准
  ↓
[3] Claude Code开发
    • 编写代码实现
    • 本地单元测试
    • 提交代码
  ↓
[4] Manus自动检查
    ├─ 编译检查 ✓
    ├─ 单元测试 ✓
    ├─ 代码审查 ✓
    └─ 功能验证 ✓
  ↓
[5] Bug检测
    ├─ 无Bug → [6] 验收通过
    └─ 有Bug → [7] 反馈修复
  ↓
[7] Claude Code修复
    • 分析Bug根因
    • 修改代码
    • 重新测试
    • 提交修复
  ↓
[5] Manus重新检查
    ├─ Bug已修复 → [6] 验收通过
    ├─ 新Bug出现 → [8] 评估影响
    └─ 无法修复 → [8] 评估影响
  ↓
[8] 无法修复的Bug处理
    • 保存调试内容
    • 评估业务影响
    • 提出优化建议
    • 决定是否继续或暂停
  ↓
[6] 验收通过
    • 标记任务完成
    • 记录执行时间
    • 保存最终代码
  ↓
[9] 分配下一任务
    • 检查任务队列
    • 分配优先级最高的任务
    • 重复步骤[2]
  ↓
所有任务完成
  ↓
结束
```

### 2.2 任务分解规范

Manus负责将复杂的协议书分解为可执行的任务。每个任务应满足以下条件：

| 条件 | 描述 | 示例 |
|------|------|------|
| **原子性** | 任务不可再分，通常2-8小时完成 | 实现单个API端点 |
| **独立性** | 任务之间依赖关系清晰 | 数据库表 → API → 前端 |
| **可验证性** | 有明确的验收标准 | 单元测试通过率100% |
| **文档完整** | 包含详细规范和示例 | 参数定义、返回值、错误处理 |

**任务模板**:

```markdown
# 任务: {任务名称}

## 任务ID
{TASK-XXXX}

## 优先级
{P0/P1/P2}

## 预计工时
{X小时}

## 依赖任务
- {TASK-YYYY}
- {TASK-ZZZZ}

## 需求描述
{详细的功能需求}

## 技术规范
### 数据库
{Schema定义}

### API端点
{API规范}

### 前端组件
{组件规范}

## 验收标准
- [ ] 代码编译无错误
- [ ] 单元测试通过率100%
- [ ] 代码审查通过
- [ ] 功能集成测试通过
- [ ] 文档完整

## 参考资料
{相关文档链接}
```

### 2.3 检查验证流程

Manus的自动化检查包括以下步骤：

#### 2.3.1 编译检查

```bash
# TypeScript编译检查
npx tsc --noEmit

# ESLint代码风格检查
npx eslint server/ client/

# 依赖检查
npm audit
```

#### 2.3.2 单元测试

```bash
# 运行所有测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage

# 验收标准：覆盖率 ≥ 80%
```

#### 2.3.3 代码审查

检查清单：

- [ ] 代码遵循项目规范
- [ ] 没有硬编码的密钥或敏感信息
- [ ] 适当的错误处理
- [ ] 性能优化（N+1查询、缓存等）
- [ ] 安全性检查（SQL注入、XSS等）
- [ ] 文档和注释完整

#### 2.3.4 功能验证

```typescript
// 集成测试示例
describe("新功能集成测试", () => {
  it("应该完成端到端的功能流程", async () => {
    // 1. 创建测试数据
    // 2. 调用API
    // 3. 验证数据库状态
    // 4. 验证返回结果
    // 5. 清理测试数据
  });
});
```

### 2.4 Bug处理流程

#### 2.4.1 Bug分类

| 类型 | 严重级别 | 处理方式 |
|------|----------|----------|
| **编译错误** | 严重 | 必须立即修复 |
| **测试失败** | 严重 | 必须立即修复 |
| **逻辑错误** | 高 | 立即修复 |
| **性能问题** | 中 | 可暂缓处理 |
| **代码风格** | 低 | 下一迭代修复 |

#### 2.4.2 Bug修复循环

当检测到Bug时，执行以下循环：

```
Bug检测
  ↓
分析根因
  ↓
Claude Code修复
  ↓
重新测试
  ↓
验证修复
  ├─ 修复成功 → 继续下一任务
  ├─ 新Bug出现 → 重复循环（最多3次）
  └─ 无法修复 → 评估影响
```

**修复尝试限制**：

- 同一Bug最多尝试修复3次
- 如果3次后仍未解决，进入"无法修复"流程
- 记录所有修复尝试的代码和日志

#### 2.4.3 无法修复的Bug处理

当Bug无法在3次尝试内修复时：

1. **保存调试内容**
   - 保存所有修复尝试的代码
   - 记录错误日志和堆栈跟踪
   - 保存测试用例和重现步骤

2. **评估影响**
   - 分析Bug对功能的影响范围
   - 评估业务影响程度
   - 确定是否阻塞其他任务

3. **提出优化建议**
   - 建议架构调整
   - 建议技术方案变更
   - 建议延期处理

4. **决策**
   - 如果影响小：标记为已知问题，继续下一任务
   - 如果影响大：暂停当前任务，重新规划
   - 如果需要重构：创建新的任务进行优化

---

## 3. NocoBase任务管理

### 3.1 任务表设计

```sql
CREATE TABLE development_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(20) UNIQUE NOT NULL COMMENT '任务编号',
    task_name VARCHAR(200) NOT NULL COMMENT '任务名称',
    description TEXT COMMENT '任务描述',
    priority ENUM('P0', 'P1', 'P2', 'P3') DEFAULT 'P1' COMMENT '优先级',
    status ENUM('pending', 'assigned', 'in_progress', 'testing', 'completed', 'blocked') DEFAULT 'pending',
    
    -- 任务规范
    requirements TEXT COMMENT '需求描述',
    technical_spec JSON COMMENT '技术规范',
    acceptance_criteria JSON COMMENT '验收标准',
    
    -- 执行信息
    assigned_to VARCHAR(50) COMMENT '分配给（Claude Code）',
    assigned_at TIMESTAMP COMMENT '分配时间',
    started_at TIMESTAMP COMMENT '开始时间',
    completed_at TIMESTAMP COMMENT '完成时间',
    estimated_hours INT COMMENT '预计工时',
    actual_hours INT COMMENT '实际工时',
    
    -- 依赖关系
    depends_on JSON COMMENT '依赖的任务ID列表',
    blocked_by VARCHAR(20) COMMENT '被阻塞的原因',
    
    -- 测试信息
    test_status ENUM('not_tested', 'passed', 'failed') DEFAULT 'not_tested',
    test_results JSON COMMENT '测试结果',
    coverage_percent INT COMMENT '测试覆盖率',
    
    -- Bug追踪
    bug_count INT DEFAULT 0 COMMENT 'Bug数量',
    bug_fixed INT DEFAULT 0 COMMENT '已修复Bug数',
    bugs JSON COMMENT 'Bug列表',
    
    -- 文档
    code_url VARCHAR(500) COMMENT '代码提交URL',
    documentation_url VARCHAR(500) COMMENT '文档URL',
    notes TEXT COMMENT '备注',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_assigned (assigned_to),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开发任务表';
```

### 3.2 Bug追踪表

```sql
CREATE TABLE development_bugs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bug_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'Bug编号',
    task_id VARCHAR(20) NOT NULL COMMENT '关联的任务ID',
    
    -- Bug信息
    title VARCHAR(200) NOT NULL COMMENT 'Bug标题',
    description TEXT COMMENT 'Bug描述',
    severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    
    -- 重现步骤
    reproduction_steps TEXT COMMENT '重现步骤',
    expected_behavior TEXT COMMENT '预期行为',
    actual_behavior TEXT COMMENT '实际行为',
    
    -- 修复信息
    fix_attempts INT DEFAULT 0 COMMENT '修复尝试次数',
    fix_status ENUM('open', 'in_progress', 'fixed', 'cannot_fix', 'deferred') DEFAULT 'open',
    
    -- 修复尝试历史
    fix_attempts_log JSON COMMENT '修复尝试日志',
    
    -- 影响评估
    impact_scope VARCHAR(500) COMMENT '影响范围',
    impact_level ENUM('low', 'medium', 'high', 'critical') COMMENT '影响级别',
    
    -- 处理决策
    resolution_decision TEXT COMMENT '处理决策',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_task (task_id),
    INDEX idx_status (fix_status),
    INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开发Bug追踪表';
```

### 3.3 执行日志表

```sql
CREATE TABLE development_execution_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(20) NOT NULL COMMENT '任务ID',
    log_type ENUM('code_commit', 'test_run', 'bug_report', 'fix_attempt', 'review', 'approval') COMMENT '日志类型',
    
    -- 日志内容
    content TEXT COMMENT '日志内容',
    code_diff TEXT COMMENT '代码差异',
    test_output TEXT COMMENT '测试输出',
    
    -- 执行者
    executed_by VARCHAR(50) COMMENT '执行者（Manus或Claude Code）',
    
    -- 结果
    result ENUM('success', 'failure', 'partial') COMMENT '执行结果',
    error_message TEXT COMMENT '错误信息',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_task (task_id),
    INDEX idx_type (log_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开发执行日志表';
```

---

## 4. 时间规划和估算

### 4.1 项目规模评估

基于AI助手架构设计，预计总工时如下：

| 阶段 | 任务 | 工时 | 工作日 |
|------|------|------|--------|
| 阶段1 | 基础架构 | 40h | 5天 |
| 阶段2 | 核心助手 | 120h | 15天 |
| 阶段3 | 计划助手 | 56h | 7天 |
| 阶段4 | 角色助手 | 48h | 6天 |
| **总计** | | **264h** | **33天** |

### 4.2 时间估算公式

```
总工时 = 开发工时 + 测试工时 + Bug修复工时 + 文档工时

其中：
- 开发工时 = 任务复杂度 × 基础工时
- 测试工时 = 开发工时 × 30%
- Bug修复工时 = 开发工时 × 20%
- 文档工时 = 开发工时 × 15%
```

### 4.3 项目时间表

假设每天8小时工作，每周5天：

| 周次 | 日期 | 任务 | 工时 | 状态 |
|------|------|------|------|------|
| 第1-2周 | 1月20-31日 | 基础架构 | 40h | 规划中 |
| 第3-6周 | 2月3-28日 | 核心助手 | 120h | 规划中 |
| 第7-8周 | 3月3-14日 | 计划助手 | 56h | 规划中 |
| 第9周 | 3月17-21日 | 角色助手 | 48h | 规划中 |
| 第10周 | 3月24-28日 | 集成测试 | 40h | 规划中 |
| 第11周 | 3月31-4月4日 | 上线准备 | 40h | 规划中 |

**预计完成日期**: 2026年4月4日

### 4.4 风险缓冲

建议预留20%的时间用于风险缓冲：

```
总计划时间 = 264h ÷ 8h/天 ÷ 5天/周 × 1.2 = 7.92周 ≈ 8周
```

**实际建议**: 8-10周完成

---

## 5. 质量保证指标

### 5.1 代码质量指标

| 指标 | 目标 | 验收标准 |
|------|------|----------|
| **编译成功率** | 100% | 无编译错误 |
| **测试覆盖率** | ≥80% | 关键路径100% |
| **单元测试通过率** | 100% | 所有测试通过 |
| **代码审查通过率** | 100% | 无阻塞问题 |
| **Bug修复率** | ≥95% | 最多5%已知问题 |

### 5.2 性能指标

| 指标 | 目标 | 验收标准 |
|------|------|----------|
| **API响应时间** | <500ms | P95响应时间 |
| **数据库查询时间** | <100ms | 单个查询 |
| **页面加载时间** | <3s | 首屏加载 |
| **内存占用** | <500MB | 单个进程 |

### 5.3 安全指标

| 指标 | 目标 | 验收标准 |
|------|------|----------|
| **安全漏洞** | 0 | 无已知漏洞 |
| **敏感数据泄露** | 0 | 无数据泄露 |
| **权限控制** | 100% | 所有端点受保护 |
| **审计日志** | 100% | 敏感操作全记录 |

---

## 6. 沟通和协调

### 6.1 沟通机制

| 沟通方式 | 频率 | 内容 |
|----------|------|------|
| **日报** | 每日 | 任务进度、遇到的问题 |
| **周报** | 每周 | 周完成情况、下周计划 |
| **Bug通知** | 实时 | 新发现的Bug和修复建议 |
| **检查报告** | 任务完成后 | 测试结果、代码审查意见 |

### 6.2 问题升级机制

```
问题发现
  ↓
Claude Code尝试修复（最多3次）
  ↓
修复失败
  ↓
Manus评估影响
  ↓
┌─ 影响小 → 标记为已知问题，继续
├─ 影响中 → 创建优化任务，后续处理
└─ 影响大 → 暂停项目，重新规划
```

---

## 7. 文档和知识管理

### 7.1 文档要求

每个任务完成后，Claude Code应提交以下文档：

| 文档 | 内容 | 格式 |
|------|------|------|
| **代码注释** | 关键函数和复杂逻辑的说明 | 代码内注释 |
| **API文档** | 端点参数、返回值、错误处理 | Markdown |
| **测试报告** | 测试用例、覆盖率、结果 | HTML/JSON |
| **部署指南** | 部署步骤、配置说明 | Markdown |
| **变更日志** | 功能变更、Bug修复 | CHANGELOG.md |

### 7.2 知识库维护

所有调试过程和解决方案应保存到知识库：

```
docs/
├── development-logs/
│   ├── task-001-logs.md
│   ├── task-002-logs.md
│   └── ...
├── bug-fixes/
│   ├── bug-001-solution.md
│   ├── bug-002-solution.md
│   └── ...
└── lessons-learned/
    ├── performance-optimization.md
    ├── security-best-practices.md
    └── ...
```

---

## 8. 附录

### 8.1 任务优先级定义

| 级别 | 定义 | 处理方式 |
|------|------|----------|
| **P0** | 阻塞其他任务，必须立即处理 | 最高优先级 |
| **P1** | 重要功能，应尽快处理 | 高优先级 |
| **P2** | 普通功能，按计划处理 | 中优先级 |
| **P3** | 优化功能，可延期处理 | 低优先级 |

### 8.2 Bug严重级别定义

| 级别 | 定义 | 示例 |
|------|------|------|
| **Critical** | 系统崩溃、数据丢失 | 数据库连接失败 |
| **High** | 功能完全不可用 | API返回错误 |
| **Medium** | 功能部分不可用 | 某些场景下出错 |
| **Low** | 功能可用但有缺陷 | 界面显示不正确 |

### 8.3 相关工具

- **代码管理**: Git + GitHub
- **任务管理**: NocoBase
- **测试框架**: Vitest
- **代码审查**: ESLint + TypeScript
- **文档**: Markdown + Manus文档系统

---

## 9. 通知与告警集成

### 9.1 告警通知渠道

系统支持以下告警通知渠道：

| 渠道 | 用途 | 配置要求 |
|------|------|----------|
| **邮件** | 正式通知、报告 | SMTP服务器配置 |
| **钉钉** | 实时告警、团队协作 | Webhook URL + 签名密钥 |
| **企业微信** | 内部通知、审批流程 | 企业ID + 应用密钥 |

### 9.2 告警规则

```typescript
interface AlertRule {
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '>=' | '<=';
    threshold: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: ('email' | 'dingtalk' | 'wechat')[];
  cooldownMinutes: number;
}
```

### 9.3 死锁监控告警

死锁监控系统集成告警功能：

1. **检测到死锁时**：根据配置的阈值发送告警
2. **自动解决失败时**：发送紧急告警
3. **统计报告**：每日/每周发送死锁统计报告

---

## 10. 版本更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-01-17 | 初始版本，定义协作流程 |
| v1.1 | 2026-01-19 | 添加通知与告警集成章节 |

---

**文档结束**
