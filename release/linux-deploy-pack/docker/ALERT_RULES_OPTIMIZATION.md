# GRT智能系统告警规则优化指南

本指南提供告警规则的优化策略、配置方法和最佳实践。

## 目录

1. [告警规则基础](#告警规则基础)
2. [阈值优化策略](#阈值优化策略)
3. [动态阈值配置](#动态阈值配置)
4. [告警规则模板](#告警规则模板)
5. [虚假告警防护](#虚假告警防护)
6. [性能基准测试](#性能基准测试)
7. [规则调整流程](#规则调整流程)

---

## 告警规则基础

### 告警级别定义

| 级别 | 说明 | 响应时间 | 通知方式 |
|------|------|---------|---------|
| 🔵 信息 | 系统事件 | 无需响应 | 日志 |
| 🟡 警告 | 需要关注 | 1小时内 | 邮件 + Slack |
| 🔴 严重 | 需要立即处理 | 15分钟内 | 邮件 + Slack + 企业微信 |
| 🔥 紧急 | 系统故障 | 5分钟内 | 全通道 + 电话 |

### 告警规则结构

```typescript
interface AlertRule {
  id: string;
  name: string;
  metric: string;           // 监控指标
  condition: string;        // 告警条件 (e.g., "> 80")
  severity: AlertSeverity;  // 告警级别
  duration: number;         // 持续时间 (秒)
  enabled: boolean;         // 是否启用
  channels: string[];       // 通知通道
  tags: string[];          // 标签
}
```

---

## 阈值优化策略

### 1. CPU使用率阈值

#### 基础阈值

```
轻度告警: 70-75%
中度告警: 80-85%
严重告警: 90-95%
紧急告警: 95%+
```

#### 优化因素

| 因素 | 影响 | 建议调整 |
|------|------|---------|
| 应用类型 | 计算密集型vs I/O密集型 | ±5-10% |
| CPU核心数 | 核心数越多，单核压力越小 | ±3-5% |
| 业务高峰 | 高峰期CPU使用率较高 | 高峰+10%，低谷-5% |
| 服务器年龄 | 老服务器性能下降 | ±5% |

#### 推荐配置

```bash
# 开发环境
CPU_WARNING_THRESHOLD=75
CPU_CRITICAL_THRESHOLD=90

# 生产环境 (计算密集型)
CPU_WARNING_THRESHOLD=70
CPU_CRITICAL_THRESHOLD=85

# 生产环境 (I/O密集型)
CPU_WARNING_THRESHOLD=80
CPU_CRITICAL_THRESHOLD=90

# 高可用环境
CPU_WARNING_THRESHOLD=60
CPU_CRITICAL_THRESHOLD=75
```

### 2. 内存使用率阈值

#### 基础阈值

```
轻度告警: 75-80%
中度告警: 85-90%
严重告警: 90-95%
紧急告警: 95%+
```

#### 优化因素

| 因素 | 影响 | 建议调整 |
|------|------|---------|
| 总内存大小 | 内存越大，可用余地越大 | 大内存-5%，小内存+5% |
| 应用内存需求 | 内存密集型应用 | ±10% |
| 缓存策略 | 缓存占用内存 | ±5% |
| 内存泄漏风险 | 长期运行应用 | -10% |

#### 推荐配置

```bash
# 开发环境 (8GB内存)
MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=90

# 生产环境 (16GB内存)
MEMORY_WARNING_THRESHOLD=85
MEMORY_CRITICAL_THRESHOLD=92

# 生产环境 (32GB内存)
MEMORY_WARNING_THRESHOLD=88
MEMORY_CRITICAL_THRESHOLD=95

# 内存密集型应用
MEMORY_WARNING_THRESHOLD=75
MEMORY_CRITICAL_THRESHOLD=85
```

### 3. 磁盘使用率阈值

#### 基础阈值

```
轻度告警: 75-80%
中度告警: 85-90%
严重告警: 90-95%
紧急告警: 95%+
```

#### 优化因素

| 因素 | 影响 | 建议调整 |
|------|------|---------|
| 磁盘大小 | 大磁盘可用空间更多 | 大磁盘+5%，小磁盘-5% |
| 数据增长速度 | 快速增长需要更早告警 | -5-10% |
| 日志保留策略 | 日志占用空间 | ±5% |
| 备份策略 | 备份占用空间 | ±10% |

#### 推荐配置

```bash
# 开发环境
DISK_WARNING_THRESHOLD=80
DISK_CRITICAL_THRESHOLD=90

# 生产环境 (标准)
DISK_WARNING_THRESHOLD=85
DISK_CRITICAL_THRESHOLD=92

# 生产环境 (数据密集型)
DISK_WARNING_THRESHOLD=75
DISK_CRITICAL_THRESHOLD=85

# 生产环境 (充足空间)
DISK_WARNING_THRESHOLD=90
DISK_CRITICAL_THRESHOLD=95
```

### 4. 应用响应时间阈值

#### 基础阈值

```
轻度告警: 1-2秒
中度告警: 2-5秒
严重告警: 5-10秒
紧急告警: 10秒+
```

#### 优化因素

| 因素 | 影响 | 建议调整 |
|------|------|---------|
| 网络延迟 | 高延迟应用 | +500ms-1s |
| 数据库查询 | 复杂查询较慢 | +1-2s |
| 用户体验 | 用户可接受的延迟 | ±500ms |
| SLA要求 | 服务等级协议 | 按SLA设置 |

#### 推荐配置

```bash
# 开发环境
RESPONSE_TIME_WARNING_THRESHOLD=2000   # 2秒
RESPONSE_TIME_CRITICAL_THRESHOLD=5000  # 5秒

# 生产环境 (标准)
RESPONSE_TIME_WARNING_THRESHOLD=1000   # 1秒
RESPONSE_TIME_CRITICAL_THRESHOLD=3000  # 3秒

# 生产环境 (高性能要求)
RESPONSE_TIME_WARNING_THRESHOLD=500    # 500ms
RESPONSE_TIME_CRITICAL_THRESHOLD=1000  # 1秒

# 生产环境 (高延迟网络)
RESPONSE_TIME_WARNING_THRESHOLD=2000   # 2秒
RESPONSE_TIME_CRITICAL_THRESHOLD=5000  # 5秒
```

### 5. 数据库连接响应时间阈值

#### 推荐配置

```bash
# 开发环境
DB_RESPONSE_TIME_WARNING_THRESHOLD=500   # 500ms
DB_RESPONSE_TIME_CRITICAL_THRESHOLD=1000 # 1秒

# 生产环境 (标准)
DB_RESPONSE_TIME_WARNING_THRESHOLD=200   # 200ms
DB_RESPONSE_TIME_CRITICAL_THRESHOLD=500  # 500ms

# 生产环境 (高性能要求)
DB_RESPONSE_TIME_WARNING_THRESHOLD=100   # 100ms
DB_RESPONSE_TIME_CRITICAL_THRESHOLD=300  # 300ms
```

---

## 动态阈值配置

### 时间段动态阈值

根据不同时间段调整阈值，减少虚假告警。

```typescript
interface TimeBasedThreshold {
  timeRange: {
    start: string;  // "HH:mm"
    end: string;    // "HH:mm"
  };
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
}

// 示例配置
const timeBasedThresholds: TimeBasedThreshold[] = [
  {
    timeRange: { start: "09:00", end: "18:00" },  // 工作时间
    cpu: { warning: 75, critical: 85 },
    memory: { warning: 85, critical: 92 },
    disk: { warning: 85, critical: 92 }
  },
  {
    timeRange: { start: "18:00", end: "09:00" },  // 非工作时间
    cpu: { warning: 85, critical: 95 },
    memory: { warning: 90, critical: 95 },
    disk: { warning: 90, critical: 95 }
  }
];
```

### 周期性动态阈值

根据周期（工作日/周末/月底）调整阈值。

```typescript
interface PeriodicThreshold {
  period: "weekday" | "weekend" | "month_end" | "month_start";
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
}

// 示例配置
const periodicThresholds: PeriodicThreshold[] = [
  {
    period: "weekday",
    cpu: { warning: 75, critical: 85 },
    memory: { warning: 85, critical: 92 },
    disk: { warning: 85, critical: 92 }
  },
  {
    period: "weekend",
    cpu: { warning: 85, critical: 95 },
    memory: { warning: 90, critical: 95 },
    disk: { warning: 90, critical: 95 }
  },
  {
    period: "month_end",  // 月底数据处理高峰
    cpu: { warning: 70, critical: 80 },
    memory: { warning: 80, critical: 90 },
    disk: { warning: 80, critical: 90 }
  }
];
```

### 学习型动态阈值

基于历史数据自动调整阈值。

```typescript
interface LearningThreshold {
  metric: string;
  baselinePercentile: number;  // 基准百分位数 (e.g., 95)
  safetyMargin: number;        // 安全边际 (%)
  updateInterval: number;      // 更新间隔 (毫秒)
  minDataPoints: number;       // 最少数据点数
}

// 示例配置
const learningThresholds: LearningThreshold[] = [
  {
    metric: "cpu",
    baselinePercentile: 95,  // 使用95百分位数作为基准
    safetyMargin: 10,        // 加上10%的安全边际
    updateInterval: 86400000, // 每天更新一次
    minDataPoints: 1440      // 至少需要1440个数据点
  },
  {
    metric: "memory",
    baselinePercentile: 90,
    safetyMargin: 5,
    updateInterval: 86400000,
    minDataPoints: 1440
  }
];

// 计算动态阈值
function calculateDynamicThreshold(
  metrics: number[],
  config: LearningThreshold
): { warning: number; critical: number } {
  if (metrics.length < config.minDataPoints) {
    return { warning: 80, critical: 90 }; // 使用默认值
  }

  // 计算百分位数
  const sorted = metrics.sort((a, b) => a - b);
  const index = Math.floor((config.baselinePercentile / 100) * sorted.length);
  const baseline = sorted[index];

  // 应用安全边际
  const threshold = baseline * (1 + config.safetyMargin / 100);

  return {
    warning: Math.round(threshold * 0.9),
    critical: Math.round(threshold)
  };
}
```

---

## 告警规则模板

### 模板1: 标准生产环境

```bash
# CPU
CPU_WARNING_THRESHOLD=75
CPU_CRITICAL_THRESHOLD=85

# 内存
MEMORY_WARNING_THRESHOLD=85
MEMORY_CRITICAL_THRESHOLD=92

# 磁盘
DISK_WARNING_THRESHOLD=85
DISK_CRITICAL_THRESHOLD=92

# 应用
RESPONSE_TIME_WARNING_THRESHOLD=1000
RESPONSE_TIME_CRITICAL_THRESHOLD=3000

# 数据库
DB_RESPONSE_TIME_WARNING_THRESHOLD=200
DB_RESPONSE_TIME_CRITICAL_THRESHOLD=500

# 告警持续时间
ALERT_DURATION_SECONDS=300  # 5分钟
```

### 模板2: 高性能环境

```bash
CPU_WARNING_THRESHOLD=70
CPU_CRITICAL_THRESHOLD=80

MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=90

DISK_WARNING_THRESHOLD=80
DISK_CRITICAL_THRESHOLD=90

RESPONSE_TIME_WARNING_THRESHOLD=500
RESPONSE_TIME_CRITICAL_THRESHOLD=1000

DB_RESPONSE_TIME_WARNING_THRESHOLD=100
DB_RESPONSE_TIME_CRITICAL_THRESHOLD=300

ALERT_DURATION_SECONDS=180  # 3分钟
```

### 模板3: 宽松开发环境

```bash
CPU_WARNING_THRESHOLD=85
CPU_CRITICAL_THRESHOLD=95

MEMORY_WARNING_THRESHOLD=90
MEMORY_CRITICAL_THRESHOLD=95

DISK_WARNING_THRESHOLD=90
DISK_CRITICAL_THRESHOLD=95

RESPONSE_TIME_WARNING_THRESHOLD=2000
RESPONSE_TIME_CRITICAL_THRESHOLD=5000

DB_RESPONSE_TIME_WARNING_THRESHOLD=500
DB_RESPONSE_TIME_CRITICAL_THRESHOLD=1000

ALERT_DURATION_SECONDS=600  # 10分钟
```

---

## 虚假告警防护

### 1. 告警持续时间检查

只有当指标在指定时间内持续超过阈值时才发送告警。

```typescript
interface AlertWithDuration {
  metric: string;
  threshold: number;
  duration: number;  // 秒
  
  // 检查函数
  shouldAlert(values: number[], timestamps: number[]): boolean {
    const now = Date.now();
    const cutoff = now - (this.duration * 1000);
    
    // 获取指定时间内的值
    const recentValues = values.filter((_, i) => timestamps[i] > cutoff);
    
    // 所有值都超过阈值
    return recentValues.length > 0 && 
           recentValues.every(v => v > this.threshold);
  }
}
```

### 2. 告警去重机制

相同告警在指定时间内只发送一次。

```typescript
interface AlertDeduplication {
  lastAlertTime: Map<string, number>;
  deduplicationWindow: number;  // 毫秒
  
  shouldSendAlert(alertId: string): boolean {
    const lastTime = this.lastAlertTime.get(alertId) || 0;
    const now = Date.now();
    
    if (now - lastTime > this.deduplicationWindow) {
      this.lastAlertTime.set(alertId, now);
      return true;
    }
    
    return false;
  }
}
```

### 3. 告警升级策略

连续多次告警才升级到更高级别。

```typescript
interface AlertEscalation {
  consecutiveCount: number;
  escalationThreshold: number;  // 升级所需的连续次数
  
  shouldEscalate(alertCount: number): boolean {
    this.consecutiveCount++;
    
    if (this.consecutiveCount >= this.escalationThreshold) {
      this.consecutiveCount = 0;
      return true;
    }
    
    return false;
  }
  
  reset(): void {
    this.consecutiveCount = 0;
  }
}
```

### 4. 异常值过滤

使用统计方法过滤异常值。

```typescript
function filterOutliers(values: number[], stdDevThreshold: number = 2): number[] {
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2)) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return values.filter(v => Math.abs(v - mean) <= stdDevThreshold * stdDev);
}

// 使用示例
const cpuValues = [45, 50, 48, 52, 95, 49, 51];  // 95是异常值
const filtered = filterOutliers(cpuValues);
console.log(filtered);  // [45, 50, 48, 52, 49, 51]
```

---

## 性能基准测试

### 基准测试方法

```bash
# 1. 收集基线数据（至少7天）
# 2. 计算统计指标
# 3. 设置告警阈值
# 4. 监控虚假告警率
# 5. 调整阈值
```

### 基准数据收集

```typescript
interface BaselineMetrics {
  metric: string;
  samples: number[];
  
  // 统计指标
  mean(): number {
    return this.samples.reduce((a, b) => a + b) / this.samples.length;
  }
  
  median(): number {
    const sorted = this.samples.sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  
  percentile(p: number): number {
    const sorted = this.samples.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  stdDev(): number {
    const mean = this.mean();
    const variance = this.samples.reduce((a, b) => a + Math.pow(b - mean, 2)) / this.samples.length;
    return Math.sqrt(variance);
  }
  
  // 生成报告
  generateReport(): string {
    return `
      指标: ${this.metric}
      样本数: ${this.samples.length}
      平均值: ${this.mean().toFixed(2)}
      中位数: ${this.median().toFixed(2)}
      标准差: ${this.stdDev().toFixed(2)}
      P50: ${this.percentile(50).toFixed(2)}
      P95: ${this.percentile(95).toFixed(2)}
      P99: ${this.percentile(99).toFixed(2)}
    `;
  }
}
```

---

## 规则调整流程

### 调整步骤

```
1. 收集数据 (7-14天)
   ↓
2. 分析基线 (计算统计指标)
   ↓
3. 设置初始阈值 (基于P95)
   ↓
4. 监控虚假告警率 (目标: < 5%)
   ↓
5. 调整阈值 (根据虚假告警率)
   ↓
6. 验证效果 (再监控7天)
   ↓
7. 固化规则 (部署到生产)
```

### 虚假告警率计算

```typescript
interface AlertMetrics {
  totalAlerts: number;
  falseAlerts: number;
  
  falseAlertRate(): number {
    return (this.falseAlerts / this.totalAlerts) * 100;
  }
  
  shouldAdjustThreshold(): boolean {
    return this.falseAlertRate() > 5;  // 虚假告警率 > 5%
  }
  
  recommendedAdjustment(): number {
    const rate = this.falseAlertRate();
    if (rate > 10) return 10;  // 增加10%
    if (rate > 5) return 5;    // 增加5%
    return 0;                  // 无需调整
  }
}
```

### 调整记录

```typescript
interface ThresholdAdjustmentLog {
  timestamp: Date;
  metric: string;
  oldThreshold: number;
  newThreshold: number;
  reason: string;
  falseAlertRate: number;
  approvedBy: string;
}

// 示例
const log: ThresholdAdjustmentLog = {
  timestamp: new Date(),
  metric: "cpu",
  oldThreshold: 80,
  newThreshold: 85,
  reason: "虚假告警率过高 (8.5%)",
  falseAlertRate: 8.5,
  approvedBy: "admin@company.com"
};
```

---

## 最佳实践

### 1. 定期审查

- **每周**: 检查虚假告警率和告警趋势
- **每月**: 调整阈值，优化规则
- **每季度**: 性能基准测试，容量规划

### 2. 告警优先级

- 只对关键指标设置严重告警
- 使用分级告警减少噪音
- 根据业务影响设置优先级

### 3. 通知策略

- 严重告警: 立即通知所有通道
- 警告告警: 邮件 + Slack
- 信息告警: 仅日志记录

### 4. 文档维护

- 记录所有阈值调整
- 保存调整原因和效果
- 定期审查和更新文档

---

**最后更新**: 2026年2月5日  
**版本**: 1.0.0
