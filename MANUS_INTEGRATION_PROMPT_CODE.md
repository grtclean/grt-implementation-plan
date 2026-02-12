# GRT智能会议系统 - Manus集成Prompt Code

## 📋 系统概述

本文档定义了GRT智能会议系统在Manus平台上的完整集成方案，包括所有高级功能、Manus通知系统集成、以及在线直接更新机制。

---

## 🎯 集成目标

### 核心功能集成
- ✓ Whisper音频转录
- ✓ 会议导出和分享
- ✓ Y.js实时协作编辑
- ✓ 实时会议记录
- ✓ AI智能分析（Gemini）
- ✓ 权限管理和RLS
- ✓ 审计日志记录
- ✓ Manus通知系统

### 技术栈
- **前端**: React 19 + Tailwind CSS 4 + Shadcn/UI
- **后端**: Express 4 + tRPC 11 + Drizzle ORM
- **数据库**: MySQL/TiDB (Supabase)
- **实时协作**: Y.js + WebSocket
- **AI引擎**: Gemini 1.5 Pro
- **音频处理**: Whisper API
- **通知系统**: Manus Built-in Notification API

---

## 📦 数据库模式

### 核心表结构

```typescript
// 会议表
export const meetings = mysqlTable("meetings", {
  id: varchar({ length: 36 }).primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  meetingType: mysqlEnum([
    'employee_interview',
    'performance_dialogue',
    'production_weekly',
    'monthly_analysis',
    'monthly_planning',
    'annual_planning',
    'annual_summary',
    'customer_handover',
    'customer_drawing_review',
    'customer_pre_acceptance',
    'customer_final_acceptance',
    'solution_confirmation'
  ]).notNull(),
  projectPhase: varchar({ length: 20 }), // M0-M12
  revenueTarget: decimal({ precision: 10, scale: 2 }), // 50M
  profitMargin: decimal({ precision: 5, scale: 2 }), // 14%
  startTime: timestamp({ mode: 'string' }).notNull(),
  endTime: timestamp({ mode: 'string' }),
  status: mysqlEnum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// 会议笔记表
export const meetingNotes = mysqlTable("meeting_notes", {
  id: varchar({ length: 36 }).primaryKey(),
  meetingId: varchar({ length: 36 }).notNull(),
  content: text().notNull(), // Tiptap JSON
  editedBy: int().notNull(),
  version: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// AI洞察表
export const aiInsights = mysqlTable("ai_insights", {
  id: varchar({ length: 36 }).primaryKey(),
  meetingId: varchar({ length: 36 }).notNull(),
  insightType: mysqlEnum(['summary', 'action_items', 'decisions', 'risks', 'opportunities']).notNull(),
  content: text().notNull(),
  confidenceScore: decimal({ precision: 3, scale: 2 }).default('0.95'),
  generatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  generatedBy: varchar({ length: 50 }).default('gemini-1.5-pro'),
});

// 权限管理表
export const channelMembers = mysqlTable("channel_members", {
  id: varchar({ length: 36 }).primaryKey(),
  channelId: varchar({ length: 36 }).notNull(),
  userId: int().notNull(),
  role: mysqlEnum(['owner', 'manager', 'member', 'viewer']).notNull(),
  permissions: text(), // JSON array
  addedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

// 审计日志表
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar({ length: 36 }).primaryKey(),
  meetingId: varchar({ length: 36 }).notNull(),
  userId: int().notNull(),
  action: varchar({ length: 100 }).notNull(),
  details: text(),
  timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

// 实时协作状态表
export const collaborationStates = mysqlTable("collaboration_states", {
  id: varchar({ length: 36 }).primaryKey(),
  meetingId: varchar({ length: 36 }).notNull(),
  documentId: varchar({ length: 36 }).notNull(),
  state: text().notNull(), // Y.js binary state (base64 encoded)
  version: int().default(0).notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
```

---

## 🔧 后端API和服务

### tRPC路由器结构

```typescript
// 会议管理路由
export const meetingsRouter = router({
  // 创建会议
  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      meetingType: z.enum([...]),
      projectPhase: z.string().optional(),
      revenueTarget: z.number().optional(),
      profitMargin: z.number().optional(),
      startTime: z.date(),
      endTime: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 创建会议
      // 发送Manus通知
      // 记录审计日志
    }),

  // 获取会议列表
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(10),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      // 获取用户有权限的会议
      // 应用RLS检查
    }),

  // 获取会议详情
  get: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input, ctx }) => {
      // 获取会议信息
      // 获取笔记、洞察、参与者
    }),

  // 更新会议
  update: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      title: z.string().optional(),
      status: z.enum([...]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 更新会议
      // 发送Manus通知
      // 记录审计日志
    }),

  // 删除会议
  delete: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 删除会议
      // 发送Manus通知
      // 记录审计日志
    }),
});

// 高级功能路由
export const advancedFeaturesRouter = router({
  // 实时协作
  collaboration: router({
    init: protectedProcedure.mutation(...),
    getActiveUsers: protectedProcedure.query(...),
    save: protectedProcedure.mutation(...),
  }),

  // 音频转录
  transcription: router({
    transcribe: protectedProcedure.mutation(...),
    transcribeAndGenerateNotes: protectedProcedure.mutation(...),
    getStats: protectedProcedure.query(...),
  }),

  // 导出和分享
  export: router({
    report: protectedProcedure.mutation(...),
    generateShareLink: protectedProcedure.mutation(...),
  }),
});
```

---

## 🔔 Manus通知系统集成

### 通知类型定义

```typescript
export enum NotificationType {
  // 会议通知
  MEETING_CREATED = 'meeting_created',
  MEETING_UPDATED = 'meeting_updated',
  MEETING_CANCELLED = 'meeting_cancelled',
  MEETING_STARTED = 'meeting_started',
  MEETING_ENDED = 'meeting_ended',

  // 任务通知
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',

  // AI通知
  AI_ANALYSIS_READY = 'ai_analysis_ready',
  AI_INSIGHT_GENERATED = 'ai_insight_generated',

  // 权限通知
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  content: string;
  meetingId?: string;
  taskId?: string;
  recipientId: number;
  actionUrl?: string;
  metadata?: Record<string, any>;
}
```

### 通知发送服务

```typescript
import { notifyOwner } from "./server/_core/notification";

export async function sendMeetingNotification(
  type: NotificationType,
  meeting: Meeting,
  recipients: number[],
  metadata?: Record<string, any>
) {
  const payload: NotificationPayload = {
    type,
    title: getMeetingNotificationTitle(type, meeting),
    content: getMeetingNotificationContent(type, meeting),
    meetingId: meeting.id,
    recipientId: recipients[0], // 主要接收者
    actionUrl: `/meetings/${meeting.id}`,
    metadata: {
      meetingType: meeting.meetingType,
      projectPhase: meeting.projectPhase,
      ...metadata,
    },
  };

  // 发送给所有接收者
  for (const recipientId of recipients) {
    payload.recipientId = recipientId;
    await notifyOwner({
      title: payload.title,
      content: payload.content,
    });
  }
}

function getMeetingNotificationTitle(type: NotificationType, meeting: Meeting): string {
  const titles: Record<NotificationType, string> = {
    [NotificationType.MEETING_CREATED]: `新会议: ${meeting.title}`,
    [NotificationType.MEETING_UPDATED]: `会议已更新: ${meeting.title}`,
    [NotificationType.MEETING_CANCELLED]: `会议已取消: ${meeting.title}`,
    [NotificationType.MEETING_STARTED]: `会议开始: ${meeting.title}`,
    [NotificationType.MEETING_ENDED]: `会议结束: ${meeting.title}`,
    // ... 其他类型
  };
  return titles[type] || '会议通知';
}

function getMeetingNotificationContent(type: NotificationType, meeting: Meeting): string {
  const contents: Record<NotificationType, string> = {
    [NotificationType.MEETING_CREATED]: 
      `新会议已创建: ${meeting.title}\n时间: ${format(new Date(meeting.startTime), 'PPP HH:mm')}\n类型: ${meeting.meetingType}`,
    [NotificationType.MEETING_UPDATED]: 
      `会议已更新: ${meeting.title}\n新状态: ${meeting.status}`,
    [NotificationType.MEETING_CANCELLED]: 
      `会议已取消: ${meeting.title}`,
    [NotificationType.MEETING_STARTED]: 
      `会议已开始: ${meeting.title}\n请及时加入`,
    [NotificationType.MEETING_ENDED]: 
      `会议已结束: ${meeting.title}\n请查看会议笔记和AI洞察`,
    // ... 其他类型
  };
  return contents[type] || '会议通知';
}
```

---

## 🎨 前端UI组件

### 会议仪表板

```typescript
export default function MeetingDashboard() {
  const { data: meetings, isLoading } = trpc.meetings.list.useQuery({
    page: 1,
    pageSize: 10,
  });

  const createMeetingMutation = trpc.meetings.create.useMutation({
    onSuccess: () => {
      // 刷新列表
      // 显示成功提示
    },
  });

  return (
    <div className="space-y-6">
      {/* 创建会议按钮 */}
      <Button onClick={() => setShowCreateDialog(true)}>
        新建会议
      </Button>

      {/* 会议列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meetings?.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>

      {/* 创建会议对话框 */}
      <CreateMeetingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createMeetingMutation.mutate}
      />
    </div>
  );
}
```

### 会议编辑器

```typescript
export default function MeetingEditor({ meetingId }: { meetingId: string }) {
  const { data: meeting } = trpc.meetings.get.useQuery({ meetingId });

  return (
    <div className="space-y-6">
      {/* 会议信息 */}
      <MeetingInfo meeting={meeting} />

      {/* 实时协作编辑器 */}
      <CollaborativeEditor meetingId={meetingId} />

      {/* AI洞察面板 */}
      <AIInsightPanel meetingId={meetingId} />

      {/* 导出和分享 */}
      <ExportAndShare meetingId={meetingId} />
    </div>
  );
}
```

---

## 🤖 AI智能分析集成

### Gemini分析服务

```typescript
import { invokeLLM } from "./server/_core/llm";

export async function analyzeAndGenerateInsights(
  meetingId: string,
  meetingNotes: string,
  meetingType: string,
  projectPhase?: string
): Promise<AIInsights[]> {
  const systemPrompt = `
You are an intelligent meeting analysis assistant for GRT (a cleaning equipment manufacturer).

Your responsibilities:
1. Analyze meeting notes and extract key information
2. Generate summaries, action items, decisions, risks, and opportunities
3. Link decisions to business goals (50M Revenue Target, 14% Profit Margin)
4. Use M0-M12 project phase terminology
5. Provide actionable insights

Meeting Type: ${meetingType}
Project Phase: ${projectPhase || 'Not specified'}
`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Please analyze the following meeting notes and provide insights:\n\n${meetingNotes}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "meeting_insights",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Meeting summary",
            },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  owner: { type: "string" },
                  deadline: { type: "string" },
                },
              },
            },
            decisions: {
              type: "array",
              items: { type: "string" },
            },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  mitigation: { type: "string" },
                },
              },
            },
            opportunities: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["summary", "action_items", "decisions", "risks", "opportunities"],
        },
      },
    },
  });

  // 解析响应并保存到数据库
  const insights = parseInsightsFromResponse(response);
  await saveInsightsToDatabase(meetingId, insights);

  return insights;
}
```

---

## 🔐 权限管理和RLS

### 行级安全策略

```typescript
// 在数据库中实现RLS
export async function getUserMeetings(userId: number) {
  const database = await db();

  // 只返回用户有权限的会议
  return database
    .select()
    .from(meetings)
    .where(
      or(
        eq(meetings.createdBy, userId),
        inArray(
          meetings.id,
          database
            .select({ meetingId: meetingParticipants.meetingId })
            .from(meetingParticipants)
            .where(eq(meetingParticipants.userId, userId))
        )
      )
    );
}

// 检查用户权限
export async function checkMeetingPermission(
  userId: number,
  meetingId: string,
  requiredRole: 'owner' | 'manager' | 'member' | 'viewer'
): Promise<boolean> {
  const database = await db();

  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .then((results) => results[0]);

  if (!meeting) return false;

  // 创建者是所有者
  if (meeting.createdBy === userId) return true;

  // 检查参与者权限
  const participant = await database
    .select()
    .from(meetingParticipants)
    .where(
      and(
        eq(meetingParticipants.meetingId, meetingId),
        eq(meetingParticipants.userId, userId)
      )
    )
    .then((results) => results[0]);

  if (!participant) return false;

  // 检查角色权限
  const roleHierarchy = { owner: 4, manager: 3, member: 2, viewer: 1 };
  return roleHierarchy[participant.role] >= roleHierarchy[requiredRole];
}
```

---

## 📊 审计日志

### 审计日志记录

```typescript
export async function logAuditEvent(
  meetingId: string,
  userId: number,
  action: string,
  details?: Record<string, any>
) {
  const database = await db();

  await database.insert(auditLogs).values({
    id: uuidv4(),
    meetingId,
    userId,
    action,
    details: details ? JSON.stringify(details) : null,
    timestamp: new Date().toISOString(),
  });
}

// 使用示例
await logAuditEvent(
  meetingId,
  userId,
  'meeting_created',
  {
    title: meeting.title,
    meetingType: meeting.meetingType,
    projectPhase: meeting.projectPhase,
  }
);
```

---

## 🚀 部署配置

### 环境变量

```env
# 数据库
DATABASE_URL=mysql://user:password@host:port/database

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# AI和LLM
GEMINI_API_KEY=your_gemini_api_key
BUILT_IN_FORGE_API_KEY=your_forge_api_key
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge

# 存储
AWS_S3_BUCKET=your_bucket
AWS_S3_REGION=us-east-1

# 通知
MANUS_NOTIFICATION_ENABLED=true

# 实时协作
WEBSOCKET_URL=wss://your-domain.com
```

### Docker配置

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

---

## 📝 单元测试

### 测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTRPCMsw } from 'trpc-msw';
import { appRouter } from '../server/routers';

describe('Meeting Management', () => {
  it('should create a meeting', async () => {
    const result = await trpc.meetings.create.mutate({
      title: 'Test Meeting',
      meetingType: 'production_weekly',
      startTime: new Date(),
    });

    expect(result).toHaveProperty('id');
    expect(result.title).toBe('Test Meeting');
  });

  it('should list meetings', async () => {
    const result = await trpc.meetings.list.query({
      page: 1,
      pageSize: 10,
    });

    expect(Array.isArray(result.meetings)).toBe(true);
  });

  it('should generate AI insights', async () => {
    const insights = await analyzeAndGenerateInsights(
      'meeting-123',
      'Sample meeting notes',
      'production_weekly'
    );

    expect(insights).toHaveProperty('summary');
    expect(insights).toHaveProperty('action_items');
  });
});
```

---

## 🔄 在线直接更新机制

### 更新流程

1. **检查更新** - 系统定期检查新版本
2. **下载更新** - 从Manus CDN下载更新包
3. **验证签名** - 验证更新包的数字签名
4. **应用更新** - 应用更新到系统
5. **重启服务** - 重启应用服务
6. **通知用户** - 发送Manus通知告知用户

### 实现代码

```typescript
export async function checkAndApplyUpdates() {
  const currentVersion = require('../package.json').version;

  // 检查最新版本
  const latestVersion = await fetchLatestVersion();

  if (latestVersion > currentVersion) {
    // 下载更新
    const updatePackage = await downloadUpdate(latestVersion);

    // 验证签名
    if (!verifySignature(updatePackage)) {
      throw new Error('Invalid update signature');
    }

    // 应用更新
    await applyUpdate(updatePackage);

    // 重启服务
    await restartService();

    // 通知用户
    await notifyOwner({
      title: '系统已更新',
      content: `GRT智能会议系统已更新到版本 ${latestVersion}`,
    });
  }
}
```

---

## 📚 集成检查清单

- [ ] 数据库模式已创建
- [ ] 所有tRPC路由器已实现
- [ ] Manus通知系统已集成
- [ ] Gemini AI分析已配置
- [ ] Y.js实时协作已实现
- [ ] Whisper音频转录已集成
- [ ] 导出和分享功能已实现
- [ ] 权限管理和RLS已配置
- [ ] 审计日志已实现
- [ ] 单元测试已编写
- [ ] 部署配置已完成
- [ ] 在线更新机制已实现
- [ ] 所有环境变量已配置

---

## 🎯 下一步

1. **部署到生产环境** - 点击Manus Management UI中的Publish按钮
2. **用户培训** - 为团队成员提供系统使用培训
3. **功能验证** - 在生产环境中验证所有功能
4. **持续改进** - 根据用户反馈不断优化系统

---

**版本**: 1.0  
**最后更新**: 2026-02-05  
**维护者**: GRT开发团队
