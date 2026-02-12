# RFC-031: 全球分公司对接与多组织SaaS架构升级

**版本**: 1.0  
**状态**: 已批准  
**创建日期**: 2026-01-18  
**作者**: Manus AI  
**关联版本**: v2.6.2

---

## 1. 概述

本RFC定义了GRT智能系统从单一组织架构向全球化多组织SaaS架构的升级方案。该方案旨在支持GRT全球分公司对接、实现本地服务器向云端的平滑迁移，并建立完善的多租户数据隔离机制。

### 1.1 业务背景

随着GRT业务的全球化扩展，系统面临以下挑战：

| 挑战领域 | 具体问题 | 影响范围 |
|---------|---------|---------|
| 全球分公司对接 | 欧美分公司需要独立的财务结算、多语言支持 | 德国、美国分公司 |
| 数据迁移 | 本地服务器向云端迁移时数据一致性保障 | 全部业务数据 |
| 多组织隔离 | 客户公司数据与GRT核心工艺数据需物理隔离 | 安全与合规 |
| 时区与货币 | 跨时区协作、多币种财务结算 | 全球运营 |

### 1.2 目标

本次架构升级的核心目标包括：

1. **环境一致性**：所有模块支持Docker容器化部署
2. **数据迁移能力**：建立增量同步机制，确保本地到云端的平滑迁移
3. **全球化适配**：多时区、多币种、多语言AI引擎
4. **多租户架构**：organization_id租户标识、RAG向量索引物理隔离
5. **无状态服务**：S3兼容存储抽象层、全球网关统一接口

---

## 2. 基础设施与部署规范

### 2.1 Docker容器化配置

系统所有模块必须支持容器化部署，以确保开发、测试、生产环境的一致性。

```yaml
# docker-compose.yml 核心服务定义
version: '3.8'
services:
  grt-api:
    image: grt-system/api:${VERSION}
    environment:
      - NODE_ENV=${NODE_ENV}
      - DATABASE_URL=${DATABASE_URL}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_BUCKET=${S3_BUCKET}
    volumes:
      - ./config:/app/config:ro
    networks:
      - grt-network
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

### 2.2 环境配置模板 (config.env)

```bash
# ============================================
# GRT System Environment Configuration Template
# ============================================

# 环境标识
NODE_ENV=production
DEPLOYMENT_MODE=cloud  # local | cloud | hybrid

# 数据库配置
DATABASE_URL=mysql://user:pass@host:3306/grt_db
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT_MS=30000

# 存储配置 (S3兼容)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=grt-production
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
S3_REGION=ap-northeast-1

# 本地存储路径 (仅本地部署使用)
LOCAL_STORAGE_PATH=/data/grt/attachments
LOCAL_BACKUP_PATH=/data/grt/backups

# 全球网关配置
GLOBAL_GATEWAY_URL=https://gateway.gerrytech.com
GATEWAY_REGION=asia  # asia | europe | americas
GATEWAY_TIMEOUT_MS=10000

# 多租户配置
DEFAULT_ORGANIZATION_ID=grt-headquarters
TENANT_ISOLATION_MODE=strict  # strict | shared | hybrid

# AI服务配置
AI_SERVICE_ENDPOINT=${AI_SERVICE_ENDPOINT}
AI_DEFAULT_LANGUAGE=zh-CN
AI_SUPPORTED_LANGUAGES=zh-CN,en-US,de-DE
```

### 2.3 迁移日志表 (grt_migration_log)

```sql
CREATE TABLE grt_migration_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_id VARCHAR(100) NOT NULL UNIQUE,
  migration_type ENUM('config', 'data', 'schema', 'attachment', 'full') NOT NULL,
  source_environment VARCHAR(50) NOT NULL,
  target_environment VARCHAR(50) NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed', 'rolled_back') DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_records INT DEFAULT 0,
  processed_records INT DEFAULT 0,
  failed_records INT DEFAULT 0,
  last_sync_checkpoint TEXT,  -- JSON: 增量同步断点信息
  error_details TEXT,
  rollback_data TEXT,  -- JSON: 回滚所需数据
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_migration_type (migration_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### 2.4 增量数据同步机制

增量同步采用Change Data Capture (CDC)模式，基于时间戳和版本号进行增量识别：

| 同步策略 | 适用场景 | 同步频率 | 数据量级 |
|---------|---------|---------|---------|
| 实时同步 | 关键业务数据（订单、报价） | 秒级 | 小批量 |
| 准实时同步 | 服务报告、工时记录 | 分钟级 | 中批量 |
| 批量同步 | 历史数据、知识库 | 小时级 | 大批量 |
| 全量同步 | 初始迁移、灾难恢复 | 按需 | 全量 |

---

## 3. 全球化业务适配逻辑

### 3.1 多时区支持

所有时间戳必须以UTC格式存储，前端根据用户时区设置自动转换显示。

```typescript
// 时区处理规范
interface TimezoneConfig {
  // 数据库存储：始终使用UTC
  storageFormat: 'UTC';
  
  // 用户时区配置
  userTimezone: string;  // e.g., 'Asia/Shanghai', 'Europe/Berlin', 'America/New_York'
  
  // 显示格式
  displayFormat: {
    date: 'YYYY-MM-DD',
    time: 'HH:mm:ss',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    timezone: 'Z'  // 显示时区标识
  };
}

// 时区转换函数
function toUserTimezone(utcTimestamp: Date, userTimezone: string): string;
function toUTC(localTimestamp: Date, userTimezone: string): Date;
```

### 3.2 多币种财务结算

```sql
-- 汇率配置表
CREATE TABLE currency_exchange_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_currency CHAR(3) NOT NULL DEFAULT 'CNY',
  target_currency CHAR(3) NOT NULL,
  exchange_rate DECIMAL(15, 6) NOT NULL,
  rate_source VARCHAR(50) DEFAULT 'manual',  -- manual | api | bank
  effective_date DATE NOT NULL,
  expiry_date DATE,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_currency_date (base_currency, target_currency, effective_date),
  INDEX idx_effective_date (effective_date),
  INDEX idx_is_active (is_active)
);

-- 支持的货币列表
-- CNY (人民币), EUR (欧元), USD (美元), GBP (英镑), JPY (日元)
```

### 3.3 多语言AI引擎

AI助手需根据客户位置自动切换语种，支持中英德三语翻译功能：

```typescript
interface MultiLanguageAIConfig {
  // 支持的语言
  supportedLanguages: ['zh-CN', 'en-US', 'de-DE'];
  
  // 语言检测规则
  languageDetection: {
    priority: ['user_preference', 'client_location', 'browser_locale', 'default'];
    default: 'zh-CN';
  };
  
  // 翻译配置
  translation: {
    engine: 'built-in' | 'google' | 'deepl';
    cacheEnabled: true;
    cacheTTL: 86400;  // 24小时
  };
  
  // 语言-地区映射
  regionMapping: {
    'CN': 'zh-CN',
    'TW': 'zh-CN',
    'HK': 'zh-CN',
    'US': 'en-US',
    'GB': 'en-US',
    'AU': 'en-US',
    'DE': 'de-DE',
    'AT': 'de-DE',
    'CH': 'de-DE'
  };
}
```

---

## 4. 多组织/多公司架构 (SaaS Architecture)

### 4.1 租户标识规范

所有业务表必须包含`organization_id`字段，用于租户数据隔离：

```sql
-- 组织/租户表
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id VARCHAR(50) NOT NULL UNIQUE,
  organization_name VARCHAR(200) NOT NULL,
  organization_type ENUM('headquarters', 'subsidiary', 'partner', 'customer') NOT NULL,
  parent_organization_id VARCHAR(50),
  region VARCHAR(50),  -- asia | europe | americas
  timezone VARCHAR(50) DEFAULT 'UTC',
  default_currency CHAR(3) DEFAULT 'CNY',
  default_language VARCHAR(10) DEFAULT 'zh-CN',
  data_isolation_level ENUM('strict', 'shared', 'hybrid') DEFAULT 'strict',
  storage_quota_gb INT DEFAULT 100,
  api_rate_limit INT DEFAULT 1000,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_organization_type (organization_type),
  INDEX idx_parent_org (parent_organization_id),
  INDEX idx_region (region)
);

-- 示例：需要添加organization_id的表
-- grt_ai_solutions, service_tasks, travel_records, parts_catalog, knowledge_base, etc.
ALTER TABLE grt_ai_solutions ADD COLUMN organization_id VARCHAR(50) NOT NULL DEFAULT 'grt-headquarters';
ALTER TABLE grt_ai_solutions ADD INDEX idx_organization_id (organization_id);
```

### 4.2 授权分级体系

```typescript
// 角色层级定义
enum UserRole {
  // 超级管理员 - GRT总部
  SUPER_ADMIN = 'super_admin',
  
  // 组织管理员 - 分公司/客户公司
  ORG_ADMIN = 'org_admin',
  
  // 部门管理员
  DEPT_ADMIN = 'dept_admin',
  
  // 普通员工
  EMPLOYEE = 'employee',
  
  // 客户用户
  CUSTOMER = 'customer',
  
  // 访客
  GUEST = 'guest'
}

// 权限矩阵
interface PermissionMatrix {
  [UserRole.SUPER_ADMIN]: {
    scope: 'global',
    canManageOrganizations: true,
    canAccessAllData: true,
    canConfigureSystem: true,
    canManageUsers: true,
    canViewAuditLogs: true
  };
  [UserRole.ORG_ADMIN]: {
    scope: 'organization',
    canManageOrganizations: false,
    canAccessAllData: false,  // 仅限本组织
    canConfigureSystem: false,
    canManageUsers: true,  // 仅限本组织用户
    canViewAuditLogs: true  // 仅限本组织日志
  };
  // ...
}
```

### 4.3 数据隔离规则 (Data_Isolation_Rule)

```typescript
interface DataIsolationRule {
  // 隔离级别
  level: 'strict' | 'shared' | 'hybrid';
  
  // 严格隔离：完全物理隔离
  strict: {
    database: 'separate_schema',  // 每个租户独立schema
    storage: 'separate_bucket',   // 每个租户独立存储桶
    vectorIndex: 'separate_index', // RAG向量索引物理隔离
    encryption: 'tenant_key'      // 租户独立加密密钥
  };
  
  // 共享模式：逻辑隔离
  shared: {
    database: 'row_level_security',
    storage: 'prefix_isolation',
    vectorIndex: 'metadata_filter',
    encryption: 'shared_key'
  };
  
  // 混合模式：核心数据严格隔离，通用数据共享
  hybrid: {
    coreData: 'strict',  // 工艺配方、价格等
    commonData: 'shared' // 通用知识库、公开文档
  };
}
```

### 4.4 RAG向量索引物理隔离

```typescript
// RAG索引隔离配置
interface RAGIsolationConfig {
  // 索引命名规范
  indexNaming: {
    pattern: 'grt_rag_{organization_id}_{index_type}',
    example: 'grt_rag_grt_headquarters_knowledge'
  };
  
  // 查询时强制过滤
  queryFilter: {
    mandatory: true,
    filterField: 'organization_id',
    errorOnMissing: true  // 缺少organization_id时拒绝查询
  };
  
  // 跨组织访问控制
  crossOrgAccess: {
    enabled: false,
    whitelist: ['grt-headquarters'],  // 仅总部可跨组织访问
    auditRequired: true
  };
}
```

---

## 5. 迁移与升级指令

### 5.1 无状态服务设计原则

```typescript
// 无状态服务设计规范
interface StatelessServiceDesign {
  // 禁止本地文件依赖
  fileStorage: {
    type: 'S3_Compatible',
    localFallback: false,
    tempFileMaxAge: 3600  // 临时文件最大存活时间（秒）
  };
  
  // 会话管理
  session: {
    type: 'distributed',
    storage: 'redis' | 'database',
    ttl: 86400
  };
  
  // 配置管理
  config: {
    source: 'environment' | 'configMap',
    hotReload: true,
    secretsManager: 'vault' | 'aws_secrets'
  };
}
```

### 5.2 S3兼容存储抽象层

```typescript
// S3兼容存储接口
interface S3CompatibleStorage {
  // 存储提供商
  provider: 'aws_s3' | 'aliyun_oss' | 'minio' | 'local_fs';
  
  // 统一接口
  operations: {
    put(key: string, data: Buffer, options?: PutOptions): Promise<PutResult>;
    get(key: string, options?: GetOptions): Promise<Buffer>;
    delete(key: string): Promise<void>;
    list(prefix: string, options?: ListOptions): Promise<ListResult>;
    getSignedUrl(key: string, expiresIn: number): Promise<string>;
  };
  
  // 迁移支持
  migration: {
    copyBetweenProviders(source: string, target: string): Promise<void>;
    syncBucket(sourceBucket: string, targetBucket: string): Promise<SyncResult>;
  };
}
```

### 5.3 GRT-Global-Gateway 统一接口

```typescript
// 全球网关配置
interface GlobalGatewayConfig {
  // 区域端点
  endpoints: {
    asia: 'https://asia.gateway.gerrytech.com',
    europe: 'https://eu.gateway.gerrytech.com',
    americas: 'https://us.gateway.gerrytech.com'
  };
  
  // 路由策略
  routing: {
    strategy: 'geo_proximity' | 'round_robin' | 'weighted';
    healthCheck: {
      interval: 30,
      timeout: 5,
      unhealthyThreshold: 3
    };
  };
  
  // 低延迟调用优化
  optimization: {
    connectionPooling: true,
    keepAlive: true,
    compression: 'gzip',
    caching: {
      enabled: true,
      ttl: 300,
      maxSize: '100MB'
    }
  };
}
```

---

## 6. 系统健康检查与迁移评估插件

### 6.1 自动检测功能

```typescript
interface HealthCheckConfig {
  // 检测项目
  checks: {
    database: {
      sizeThreshold: '50GB',
      connectionPoolUsage: 80,
      queryLatencyMs: 100
    };
    storage: {
      attachmentCount: 100000,
      totalSizeGB: 200,
      orphanedFiles: true
    };
    api: {
      latencyP95Ms: 500,
      errorRate: 0.01,
      requestsPerSecond: 1000
    };
    system: {
      cpuUsage: 70,
      memoryUsage: 80,
      diskUsage: 85
    };
  };
  
  // 检测频率
  schedule: {
    healthCheck: '*/5 * * * *',  // 每5分钟
    fullAssessment: '0 2 * * *'  // 每天凌晨2点
  };
}
```

### 6.2 一键镜像功能

```typescript
interface MigrationExportConfig {
  // 触发条件
  triggers: {
    cpuUsageThreshold: 70,
    memoryUsageThreshold: 80,
    manualTrigger: true
  };
  
  // 导出内容
  exportContent: {
    databaseSchema: true,
    databaseData: true,
    attachments: true,
    configurations: true,
    userPermissions: true,
    aiModels: false  // AI模型单独处理
  };
  
  // 导出格式
  exportFormat: {
    schema: 'sql',
    data: 'json',
    attachments: 's3_manifest',
    config: 'json'
  };
  
  // 云端注入
  cloudInjection: {
    targetEnvironment: 'cloud',
    validationRequired: true,
    rollbackEnabled: true
  };
}
```

---

## 7. 数据库变更清单

本次升级需要创建或修改的数据库表：

| 表名 | 操作类型 | 说明 |
|-----|---------|-----|
| grt_migration_log | 新增 | 迁移日志记录 |
| currency_exchange_rates | 新增 | 汇率配置 |
| organizations | 新增 | 组织/租户管理 |
| system_health_checks | 新增 | 系统健康检查记录 |
| migration_export_jobs | 新增 | 迁移导出任务 |
| 所有业务表 | 修改 | 添加organization_id字段 |

---

## 8. 实施计划

| 阶段 | 任务 | 预计工时 | 优先级 |
|-----|------|---------|-------|
| Phase 1 | 基础设施Docker化 | 8h | P0 |
| Phase 2 | 迁移日志表与增量同步 | 12h | P0 |
| Phase 3 | 多时区与多币种支持 | 16h | P1 |
| Phase 4 | 多语言AI引擎 | 20h | P1 |
| Phase 5 | 多租户架构改造 | 24h | P0 |
| Phase 6 | S3抽象层与全球网关 | 16h | P1 |
| Phase 7 | 健康检查与迁移评估插件 | 12h | P2 |

---

## 9. 风险评估

| 风险项 | 风险等级 | 缓解措施 |
|-------|---------|---------|
| 数据迁移丢失 | 高 | 增量同步+断点续传+回滚机制 |
| 多租户数据泄露 | 高 | 严格隔离+审计日志+加密存储 |
| 时区转换错误 | 中 | 统一UTC存储+前端转换+测试覆盖 |
| 汇率计算偏差 | 中 | 多数据源校验+人工审核+历史追溯 |
| 全球网关延迟 | 中 | 多区域部署+智能路由+缓存优化 |

---

## 10. 参考资料

1. [AWS Multi-Tenant SaaS Architecture](https://aws.amazon.com/solutions/implementations/saas-identity-cognito/)
2. [Docker Compose Best Practices](https://docs.docker.com/compose/compose-file/)
3. [IANA Time Zone Database](https://www.iana.org/time-zones)
4. [ISO 4217 Currency Codes](https://www.iso.org/iso-4217-currency-codes.html)
