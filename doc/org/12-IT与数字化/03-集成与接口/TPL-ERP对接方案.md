# TPL-ERP对接方案

> **适用范围**：IT 开发团队、业务流程负责人
> **更新频率**：接口变更时更新
> **审批流程**：IT 设计 → 业务确认 → CTO 审批

## 模板

### 一、对接概述

| 项目 | 内容 |
|------|------|
| ERP 系统名称 | 天思 ERP（TianSi ERP） |
| ERP 版本 | V8.x |
| 对接方式 | REST API + 数据库视图（只读） |
| 对接协议 | HTTPS + JSON |
| 认证方式 | API Key + IP 白名单 |
| GRT 侧 Router | `server/erp/erp.router.ts`, `server/erp/tiansi-erp.router.ts` |

### 二、数据映射

#### 2.1 物料主数据同步

| 天思字段 | GRT 字段 | 类型 | 映射规则 | 同步方向 |
|----------|----------|------|----------|----------|
| item_code | materialCode | string | 直接映射 | ERP → GRT |
| item_name | materialName | string | 直接映射 | ERP → GRT |
| item_spec | specification | string | 直接映射 | ERP → GRT |
| unit | unit | string | 代码转换（PC→个, KG→千克） | ERP → GRT |
| category | category | string | 类别映射表 | ERP → GRT |
| price | unitPrice | decimal | 直接映射 | ERP → GRT |
| stock_qty | stockQuantity | integer | 直接映射 | ERP → GRT |
| min_stock | safetyStock | integer | 直接映射 | ERP → GRT |
| supplier | supplierCode | string | 直接映射 | ERP → GRT |
| last_update | erpLastSync | datetime | 同步时间戳 | 自动 |

#### 2.2 采购订单同步

| 天思字段 | GRT 字段 | 同步方向 | 说明 |
|----------|----------|----------|------|
| po_number | purchaseOrderNo | GRT → ERP | GRT 创建 PO 推送到 ERP |
| po_date | orderDate | GRT → ERP | |
| supplier_code | supplierCode | GRT → ERP | |
| items[] | orderItems[] | GRT → ERP | 明细行 |
| approval_status | erpApprovalStatus | ERP → GRT | ERP 审批结果回传 |
| receipt_qty | receivedQuantity | ERP → GRT | 收货数量回传 |
| invoice_no | invoiceNumber | ERP → GRT | 发票信息回传 |

#### 2.3 库存数据同步

| 天思字段 | GRT 字段 | 同步方向 | 频率 |
|----------|----------|----------|------|
| warehouse | warehouseCode | ERP → GRT | 每小时 |
| location | locationCode | ERP → GRT | 每小时 |
| item_code | materialCode | ERP → GRT | 每小时 |
| qty_on_hand | currentStock | ERP → GRT | 每小时 |
| qty_reserved | reservedStock | ERP → GRT | 每小时 |
| qty_available | availableStock | ERP → GRT | 计算值 |

### 三、同步策略

| 数据类型 | 同步频率 | 同步方式 | 冲突解决 | 失败处理 |
|----------|----------|----------|----------|----------|
| 物料主数据 | 每日 1 次（凌晨） | 全量覆盖 | ERP 为准 | 重试 3 次 → 告警 |
| 库存数据 | 每小时 | 增量同步 | ERP 为准 | 重试 3 次 → 告警 |
| 采购订单 | 实时 | 事件驱动 | GRT 创建, ERP 审批 | 队列重试 → 人工 |
| 供应商信息 | 每日 1 次 | 全量覆盖 | ERP 为准 | 重试 3 次 → 告警 |
| 财务凭证 | 每日 1 次 | 增量推送 | 人工确认 | 告警 → 人工 |

### 四、接口规格

#### 4.1 查询物料接口

```
POST /api/erp/materials/query
Request:
{
  "apiKey": "xxx",
  "lastSyncTime": "2026-03-01T00:00:00Z",
  "pageSize": 500,
  "pageNo": 1
}

Response:
{
  "code": 200,
  "data": [
    {
      "item_code": "ME-001-A",
      "item_name": "伺服电机 400W",
      "item_spec": "MSMJ042G1U",
      "unit": "PC",
      "category": "电气件",
      "price": 2800.00,
      "stock_qty": 15,
      "supplier": "SUP-001"
    }
  ],
  "total": 1200,
  "pageCount": 3
}
```

#### 4.2 创建采购订单接口

```
POST /api/erp/purchase-orders/create
Request:
{
  "apiKey": "xxx",
  "poNumber": "PO-2026-0315",
  "supplierCode": "SUP-001",
  "orderDate": "2026-03-15",
  "items": [
    {
      "itemCode": "ME-001-A",
      "quantity": 10,
      "unitPrice": 2800.00,
      "deliveryDate": "2026-04-15"
    }
  ],
  "remarks": "PRJ-2026-008 项目采购"
}

Response:
{
  "code": 200,
  "erpPoId": "ERP-PO-2026-0315",
  "status": "pending_approval"
}
```

### 五、错误处理

| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查参数格式，修正后重试 |
| 401 | API Key 无效 | 检查 API Key 配置 |
| 404 | 资源不存在 | 记录日志，跳过该条 |
| 409 | 数据冲突 | 以 ERP 数据为准覆盖 |
| 429 | 请求过于频繁 | 等待 60 秒后重试 |
| 500 | ERP 服务端错误 | 重试 3 次，间隔 30 秒 |
| 503 | ERP 维护中 | 队列缓存，待恢复后重发 |

### 六、监控与告警

| 监控项 | 告警条件 | 通知方式 |
|--------|----------|----------|
| 同步成功率 | < 95% | 钉钉群 |
| 同步延迟 | > 2 小时 | 钉钉群 |
| 数据差异 | 差异记录 > 50 条 | 钉钉 + 邮件 |
| 接口响应时间 | P95 > 5 秒 | 日志告警 |
| 连接失败 | 连续 3 次失败 | 钉钉 + 短信 |

## 使用说明

1. **环境配置**：ERP 连接信息存储在 `.env` 文件的 `TIANSI_ERP_*` 变量中
2. **API Key 管理**：API Key 由 ERP 管理员分配，通过 `/vault` 加密存储
3. **字段映射变更**：修改 `server/erp/` 下的映射配置文件
4. **手动同步**：管理员可通过 `/admin` 界面触发手动同步
5. **数据校验**：每月执行一次 GRT 与 ERP 数据比对，发现差异后人工处理
