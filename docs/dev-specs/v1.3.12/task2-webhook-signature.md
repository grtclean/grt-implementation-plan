# 任务2：Webhook签名验证

**版本**: v1.3.12  
**任务编号**: TASK-2  
**负责方**: Claude Code  
**检查方**: Manus  
**预计工时**: 3-4小时  
**优先级**: P1

---

## 1. 任务概述

本任务旨在为Webhook模块添加HMAC签名验证机制，确保Webhook请求的安全性和完整性。通过签名验证，接收方可以确认请求确实来自GRT系统，且内容未被篡改。该功能是企业级Webhook集成的标准安全实践。

### 1.1 业务价值

Webhook签名验证是企业级系统集成的必备功能，能够防止以下安全风险：

| 风险类型 | 描述 | 签名验证如何防护 |
|----------|------|------------------|
| 请求伪造 | 攻击者伪造Webhook请求 | 无法生成正确签名 |
| 内容篡改 | 中间人修改请求内容 | 签名验证失败 |
| 重放攻击 | 重复发送旧请求 | 时间戳验证 |
| 信息泄露 | 敏感数据暴露 | 签名不包含密钥明文 |

### 1.2 功能范围

| 功能模块 | 描述 | 优先级 |
|----------|------|--------|
| 签名生成 | 使用HMAC-SHA256生成请求签名 | P1 |
| 签名验证 | 验证接收到的签名是否正确 | P1 |
| 密钥管理 | Webhook配置中的密钥CRUD | P1 |
| 签名日志 | 记录签名验证结果 | P1 |
| 测试工具 | 前端签名测试和验证工具 | P2 |

---

## 2. 技术设计

### 2.1 签名算法设计

采用业界标准的HMAC-SHA256签名算法，签名流程如下：

```
签名字符串 = timestamp + "." + JSON.stringify(payload)
签名 = HMAC-SHA256(签名字符串, secretKey)
请求头 = {
  "X-Webhook-Signature": "sha256=" + 签名,
  "X-Webhook-Timestamp": timestamp
}
```

**签名验证流程**：

1. 从请求头提取签名和时间戳
2. 检查时间戳是否在有效范围内（±5分钟）
3. 使用相同算法重新计算签名
4. 比较计算签名与请求签名
5. 记录验证结果到日志

### 2.2 数据库Schema更新

在 `drizzle/schema.ts` 中更新 `webhookConfigs` 表：

```typescript
// 在现有webhookConfigs表中添加签名相关字段
export const webhookConfigs = mysqlTable("webhook_configs", {
  // ... 现有字段 ...
  
  // 签名验证配置
  signatureEnabled: boolean("signature_enabled").default(false).notNull(),
  signatureSecret: varchar("signature_secret", { length: 64 }), // HMAC密钥
  signatureAlgorithm: mysqlEnum("signature_algorithm", ["sha256", "sha512"]).default("sha256"),
  signatureTimestampTolerance: int("signature_timestamp_tolerance").default(300), // 时间戳容差（秒）
  
  // ... 其他字段 ...
});
```

在 `webhookLogs` 表中添加签名验证结果：

```typescript
export const webhookLogs = mysqlTable("webhook_logs", {
  // ... 现有字段 ...
  
  // 签名相关字段
  signatureIncluded: boolean("signature_included").default(false),
  signatureValue: varchar("signature_value", { length: 128 }),
  signatureTimestamp: bigint("signature_timestamp", { mode: "number" }),
  
  // ... 其他字段 ...
});
```

### 2.3 签名工具函数

在 `server/webhook/signature.ts` 中创建签名工具：

```typescript
import crypto from "crypto";

/**
 * 签名配置接口
 */
interface SignatureConfig {
  secret: string;
  algorithm: "sha256" | "sha512";
  timestampTolerance: number; // 秒
}

/**
 * 生成Webhook签名
 * @param payload - 请求体对象
 * @param secret - HMAC密钥
 * @param algorithm - 签名算法
 * @returns 签名对象，包含签名值和时间戳
 */
export function generateSignature(
  payload: object,
  secret: string,
  algorithm: "sha256" | "sha512" = "sha256"
): { signature: string; timestamp: number }

/**
 * 验证Webhook签名
 * @param payload - 请求体对象
 * @param signature - 请求头中的签名
 * @param timestamp - 请求头中的时间戳
 * @param config - 签名配置
 * @returns 验证结果
 */
export function verifySignature(
  payload: object,
  signature: string,
  timestamp: number,
  config: SignatureConfig
): { valid: boolean; error?: string }

/**
 * 生成随机密钥
 * @param length - 密钥长度（字节）
 * @returns 十六进制密钥字符串
 */
export function generateSecretKey(length: number = 32): string

/**
 * 构建签名请求头
 * @param signature - 签名值
 * @param timestamp - 时间戳
 * @returns 请求头对象
 */
export function buildSignatureHeaders(
  signature: string,
  timestamp: number
): Record<string, string>

/**
 * 从请求头解析签名信息
 * @param headers - 请求头对象
 * @returns 解析结果
 */
export function parseSignatureHeaders(
  headers: Record<string, string>
): { signature: string; timestamp: number } | null
```

### 2.4 API路由更新

在 `server/routers.ts` 中更新Webhook路由：

```typescript
webhook: router({
  // ... 现有路由 ...
  
  // 更新create路由，添加签名配置
  create: protectedProcedure
    .input(z.object({
      // ... 现有字段 ...
      signatureEnabled: z.boolean().default(false),
      signatureSecret: z.string().max(64).optional(),
      signatureAlgorithm: z.enum(["sha256", "sha512"]).default("sha256"),
      signatureTimestampTolerance: z.number().min(60).max(3600).default(300),
    }))
    .mutation(async ({ input }) => {
      // 如果启用签名但未提供密钥，自动生成
      if (input.signatureEnabled && !input.signatureSecret) {
        input.signatureSecret = generateSecretKey();
      }
      return createWebhookConfig(input);
    }),
    
  // 更新update路由，添加签名配置
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      // ... 现有字段 ...
      signatureEnabled: z.boolean().optional(),
      signatureSecret: z.string().max(64).optional(),
      signatureAlgorithm: z.enum(["sha256", "sha512"]).optional(),
      signatureTimestampTolerance: z.number().min(60).max(3600).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateWebhookConfig(id, data);
    }),
    
  // 新增：生成密钥
  generateSecret: protectedProcedure
    .input(z.object({
      length: z.number().min(16).max(64).default(32),
    }))
    .mutation(async ({ input }) => {
      return { secret: generateSecretKey(input.length) };
    }),
    
  // 新增：测试签名
  testSignature: protectedProcedure
    .input(z.object({
      payload: z.record(z.any()),
      secret: z.string(),
      algorithm: z.enum(["sha256", "sha512"]).default("sha256"),
    }))
    .mutation(async ({ input }) => {
      const { signature, timestamp } = generateSignature(
        input.payload,
        input.secret,
        input.algorithm
      );
      return {
        signature,
        timestamp,
        headers: buildSignatureHeaders(signature, timestamp),
        verificationCode: `
// 验证代码示例 (Node.js)
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  const signatureString = timestamp + '.' + JSON.stringify(payload);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('${input.algorithm}', secret)
    .update(signatureString)
    .digest('hex');
  return signature === expectedSignature;
}
        `.trim(),
      };
    }),
    
  // 新增：验证签名
  verifySignature: protectedProcedure
    .input(z.object({
      payload: z.record(z.any()),
      signature: z.string(),
      timestamp: z.number(),
      secret: z.string(),
      algorithm: z.enum(["sha256", "sha512"]).default("sha256"),
      timestampTolerance: z.number().default(300),
    }))
    .mutation(async ({ input }) => {
      return verifySignature(input.payload, input.signature, input.timestamp, {
        secret: input.secret,
        algorithm: input.algorithm,
        timestampTolerance: input.timestampTolerance,
      });
    }),
}),
```

### 2.5 发送函数更新

更新 `server/webhook/index.ts` 中的发送函数：

```typescript
/**
 * 发送Webhook消息（带签名）
 */
export async function sendWebhookWithSignature(
  config: WebhookConfig,
  payload: object
): Promise<WebhookSendResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  let signatureValue: string | undefined;
  let signatureTimestamp: number | undefined;
  
  // 如果启用签名，添加签名头
  if (config.signatureEnabled && config.signatureSecret) {
    const { signature, timestamp } = generateSignature(
      payload,
      config.signatureSecret,
      config.signatureAlgorithm || "sha256"
    );
    signatureValue = signature;
    signatureTimestamp = timestamp;
    
    const signatureHeaders = buildSignatureHeaders(signature, timestamp);
    Object.assign(headers, signatureHeaders);
  }
  
  // 发送请求
  const result = await sendRequest(config.url, payload, headers);
  
  // 记录日志（包含签名信息）
  await createWebhookLog({
    configId: config.id,
    payload: JSON.stringify(payload),
    status: result.success ? "success" : "failed",
    responseCode: result.statusCode,
    responseBody: result.body,
    errorMessage: result.error,
    signatureIncluded: config.signatureEnabled,
    signatureValue,
    signatureTimestamp,
  });
  
  return result;
}
```

### 2.6 前端组件设计

#### 2.6.1 签名配置表单

在 `WebhookManagement.tsx` 的表单中添加签名配置：

```typescript
// 签名配置区域
function SignatureConfigSection({ 
  enabled, 
  secret, 
  algorithm, 
  tolerance,
  onChange 
}: SignatureConfigProps) {
  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <Label>签名验证</Label>
        <Switch checked={enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
      </div>
      
      {enabled && (
        <>
          <div className="space-y-2">
            <Label>密钥</Label>
            <div className="flex gap-2">
              <Input 
                type="password" 
                value={secret} 
                onChange={(e) => onChange({ secret: e.target.value })}
                placeholder="HMAC密钥"
              />
              <Button variant="outline" onClick={handleGenerateSecret}>
                <RefreshCw className="w-4 h-4 mr-2" />
                生成
              </Button>
              <Button variant="outline" onClick={handleCopySecret}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>签名算法</Label>
              <Select value={algorithm} onValueChange={(v) => onChange({ algorithm: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sha256">HMAC-SHA256</SelectItem>
                  <SelectItem value="sha512">HMAC-SHA512</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>时间戳容差（秒）</Label>
              <Input 
                type="number" 
                value={tolerance} 
                onChange={(e) => onChange({ tolerance: parseInt(e.target.value) })}
                min={60}
                max={3600}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

#### 2.6.2 签名测试工具

```typescript
// 签名测试对话框
function SignatureTestDialog({ open, onClose, config }: Props) {
  const [testPayload, setTestPayload] = useState('{"event": "test"}');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  const testMutation = trpc.webhook.testSignature.useMutation();
  
  const handleTest = async () => {
    const result = await testMutation.mutateAsync({
      payload: JSON.parse(testPayload),
      secret: config.signatureSecret,
      algorithm: config.signatureAlgorithm,
    });
    setTestResult(result);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>签名测试</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>测试Payload</Label>
            <Textarea 
              value={testPayload} 
              onChange={(e) => setTestPayload(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
          </div>
          
          <Button onClick={handleTest} disabled={testMutation.isPending}>
            {testMutation.isPending ? "生成中..." : "生成签名"}
          </Button>
          
          {testResult && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted">
              <div className="space-y-2">
                <Label>签名值</Label>
                <code className="block p-2 bg-background rounded text-sm break-all">
                  {testResult.signature}
                </code>
              </div>
              
              <div className="space-y-2">
                <Label>时间戳</Label>
                <code className="block p-2 bg-background rounded text-sm">
                  {testResult.timestamp}
                </code>
              </div>
              
              <div className="space-y-2">
                <Label>请求头</Label>
                <pre className="p-2 bg-background rounded text-sm overflow-x-auto">
                  {JSON.stringify(testResult.headers, null, 2)}
                </pre>
              </div>
              
              <div className="space-y-2">
                <Label>验证代码示例</Label>
                <pre className="p-2 bg-background rounded text-sm overflow-x-auto">
                  {testResult.verificationCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. 实施步骤

### 步骤1：签名工具函数实现

1. 创建 `server/webhook/signature.ts` 文件
2. 实现 `generateSignature` 函数
3. 实现 `verifySignature` 函数
4. 实现 `generateSecretKey` 函数
5. 实现辅助函数

**验收标准**：
- [ ] 签名生成正确
- [ ] 签名验证正确
- [ ] 时间戳验证正确
- [ ] 密钥生成随机且安全

### 步骤2：数据库Schema更新

1. 在 `webhookConfigs` 表添加签名配置字段
2. 在 `webhookLogs` 表添加签名记录字段
3. 运行 `pnpm db:push` 或执行SQL更新

**验收标准**：
- [ ] 字段成功添加
- [ ] 默认值正确
- [ ] 不影响现有数据

### 步骤3：API路由更新

1. 更新 `webhook.create` 路由
2. 更新 `webhook.update` 路由
3. 添加 `webhook.generateSecret` 路由
4. 添加 `webhook.testSignature` 路由
5. 添加 `webhook.verifySignature` 路由

**验收标准**：
- [ ] 所有API端点可正常调用
- [ ] 输入验证正确
- [ ] 错误响应格式统一

### 步骤4：发送函数更新

1. 更新 `sendWebhookMessage` 函数添加签名支持
2. 更新日志记录包含签名信息
3. 确保向后兼容（未启用签名的配置正常工作）

**验收标准**：
- [ ] 启用签名时正确添加签名头
- [ ] 未启用签名时正常发送
- [ ] 日志正确记录签名信息

### 步骤5：单元测试编写

1. 创建 `server/v1.3.12-webhook-signature.test.ts`
2. 编写签名生成测试
3. 编写签名验证测试
4. 编写时间戳验证测试
5. 编写API路由测试

**测试用例清单**：

| 测试场景 | 描述 |
|----------|------|
| 签名生成-SHA256 | 验证SHA256签名生成正确 |
| 签名生成-SHA512 | 验证SHA512签名生成正确 |
| 签名验证-有效 | 验证有效签名通过验证 |
| 签名验证-无效 | 验证无效签名被拒绝 |
| 签名验证-过期 | 验证过期时间戳被拒绝 |
| 签名验证-篡改 | 验证篡改内容被检测 |
| 密钥生成 | 验证密钥长度和随机性 |
| API-生成密钥 | 验证API正确生成密钥 |
| API-测试签名 | 验证API正确测试签名 |
| API-验证签名 | 验证API正确验证签名 |

**验收标准**：
- [ ] 测试覆盖所有核心场景
- [ ] 所有测试通过
- [ ] 无跳过的测试

### 步骤6：前端开发

1. 在 `WebhookManagement.tsx` 添加签名配置区域
2. 实现密钥生成和复制功能
3. 实现签名测试对话框
4. 更新表单状态管理
5. 添加国际化翻译

**验收标准**：
- [ ] 签名配置UI正确渲染
- [ ] 密钥生成功能正常
- [ ] 签名测试功能正常
- [ ] 表单提交正确

### 步骤7：集成测试

1. 在浏览器中测试完整流程
2. 验证签名发送正确
3. 使用外部工具验证签名
4. 检查日志记录

**验收标准**：
- [ ] 创建带签名的Webhook → 发送测试 → 验证签名 流程正常
- [ ] 签名头格式正确
- [ ] 日志记录完整

---

## 4. 签名规范

### 4.1 请求头格式

| 请求头 | 格式 | 示例 |
|--------|------|------|
| X-Webhook-Signature | sha256={signature} | sha256=abc123... |
| X-Webhook-Timestamp | Unix时间戳（秒） | 1705401600 |

### 4.2 签名字符串格式

```
{timestamp}.{JSON.stringify(payload)}
```

示例：
```
1705401600.{"event":"cost_alert","data":{"projectId":"123"}}
```

### 4.3 验证代码示例

**Node.js**：
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  // 检查时间戳
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return { valid: false, error: 'Timestamp expired' };
  }
  
  // 计算签名
  const signatureString = timestamp + '.' + JSON.stringify(payload);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(signatureString)
    .digest('hex');
  
  // 比较签名
  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  return { valid: true };
}
```

**Python**：
```python
import hmac
import hashlib
import json
import time

def verify_webhook_signature(payload, signature, timestamp, secret):
    # 检查时间戳
    now = int(time.time())
    if abs(now - timestamp) > 300:
        return False, 'Timestamp expired'
    
    # 计算签名
    signature_string = f"{timestamp}.{json.dumps(payload, separators=(',', ':'))}"
    expected_signature = 'sha256=' + hmac.new(
        secret.encode(),
        signature_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # 比较签名
    if signature != expected_signature:
        return False, 'Invalid signature'
    
    return True, None
```

---

## 5. 检查清单

### 5.1 代码检查

- [ ] 代码符合命名规范
- [ ] 包含必要的注释
- [ ] 无TypeScript类型错误
- [ ] 无ESLint警告
- [ ] 密钥处理安全（不在日志中明文输出）

### 5.2 功能检查

- [ ] 签名生成正确
- [ ] 签名验证正确
- [ ] 时间戳验证正确
- [ ] 密钥生成安全
- [ ] 向后兼容

### 5.3 测试检查

- [ ] 单元测试全部通过
- [ ] 测试覆盖核心场景
- [ ] 无跳过的测试用例

### 5.4 安全检查

- [ ] 密钥不在前端明文显示（除非用户主动查看）
- [ ] 密钥不在日志中明文输出
- [ ] 使用安全的随机数生成器
- [ ] 时间戳验证防止重放攻击

---

## 6. 参考资源

### 6.1 现有代码参考

| 功能 | 文件路径 | 参考内容 |
|------|----------|----------|
| Webhook发送 | `server/webhook/index.ts` | `sendWebhookMessage` 函数 |
| Webhook配置 | `drizzle/schema.ts` | `webhookConfigs` 表 |
| 前端表单 | `client/src/pages/WebhookManagement.tsx` | 表单组件 |

### 6.2 外部参考

- [GitHub Webhook签名验证](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Stripe Webhook签名](https://stripe.com/docs/webhooks/signatures)
- [Node.js crypto模块](https://nodejs.org/api/crypto.html)

---

**文档版本**: 1.0  
**创建日期**: 2026-01-16  
**作者**: Manus AI
