# GRT系统智能会议功能完善方案

## 📋 项目概述

**目标**：为GRT系统添加企业级智能会议功能，包括实时记录、AI分析、权限管理和协作编辑。

**目标用户**：工业清洁设备制造商（GRT）的管理层、项目经理、销售团队

**核心业务指标**：
- 50M 年度收入目标
- 14% 利润率目标
- M0-M12 项目生命周期

---

## 🏗️ 架构设计

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 14+ (App Router) | 服务端渲染和API路由 |
| **UI框架** | Tailwind CSS + Shadcn/UI | 现代化UI组件库 |
| **编辑器** | Tiptap (ProseMirror) | 富文本编辑和实时协作 |
| **状态管理** | Zustand + Y.js | 本地状态和CRDT同步 |
| **数据库** | PostgreSQL (Supabase) | 企业级关系数据库 |
| **ORM** | Prisma | 类型安全的数据库访问 |
| **AI引擎** | Gemini 1.5 Pro | 会议分析和洞察生成 |
| **实时通信** | WebSocket | 实时协作和通知 |
| **音频处理** | Web Audio API | 音频录制和转录 |

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     GRT Smart Meeting System                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Frontend (Next.js 14+)                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • MeetingDashboard      (会议列表和管理)             │   │
│  │ • MeetingEditor         (实时编辑器)                 │   │
│  │ • ChannelNavigator      (频道导航)                   │   │
│  │ • InsightPanel          (AI洞察面板)                 │   │
│  │ • PermissionManager     (权限管理UI)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Backend (Next.js API Routes)               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • /api/meetings         (会议CRUD)                   │   │
│  │ • /api/channels         (频道管理)                   │   │
│  │ • /api/permissions      (权限检查)                   │   │
│  │ • /api/ai/insights      (AI分析)                     │   │
│  │ • /api/ws               (WebSocket)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Database (PostgreSQL + Prisma)               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • meetings              (会议记录)                   │   │
│  │ • channels              (频道)                       │   │
│  │ • channel_members       (频道成员)                   │   │
│  │ • meeting_notes         (会议笔记)                   │   │
│  │ • ai_insights           (AI洞察)                     │   │
│  │ • audit_logs            (审计日志)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         External Services                            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • Gemini 1.5 Pro API    (AI分析)                     │   │
│  │ • Google Cloud Storage  (文件存储)                   │   │
│  │ • SendGrid              (邮件通知)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 数据库模式设计

### 核心表结构

#### 1. meetings（会议表）
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  channel_id UUID NOT NULL REFERENCES channels(id),
  created_by UUID NOT NULL REFERENCES users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
  meeting_type ENUM('standup', 'review', 'planning', 'retrospective', 'other'),
  project_phase VARCHAR(10), -- M0-M12
  revenue_target DECIMAL(15,2), -- 50M
  profit_margin DECIMAL(5,2), -- 14%
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- 软删除
);
```

#### 2. channels（频道表）
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  visibility ENUM('public', 'private', 'confidential'),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);
```

#### 3. channel_members（频道成员表）
```sql
CREATE TABLE channel_members (
  id UUID PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES channels(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role ENUM('owner', 'manager', 'member', 'viewer'),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);
```

#### 4. meeting_notes（会议笔记表）
```sql
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  content TEXT NOT NULL, -- Tiptap JSON
  edited_by UUID NOT NULL REFERENCES users(id),
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. ai_insights（AI洞察表）
```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  insight_type ENUM('summary', 'action_items', 'decisions', 'risks', 'opportunities'),
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.0-1.0
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(50) -- 'gemini-1.5-pro'
);
```

#### 6. audit_logs（审计日志表）
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET
);
```

### 行级安全（RLS）策略

```sql
-- 用户只能访问他们所在频道的会议
CREATE POLICY meeting_access_policy ON meetings
  FOR SELECT
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members 
      WHERE user_id = auth.uid()
    )
  );

-- 用户只能编辑他们有权限的会议笔记
CREATE POLICY meeting_notes_edit_policy ON meeting_notes
  FOR UPDATE
  USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE channel_id IN (
        SELECT channel_id FROM channel_members 
        WHERE user_id = auth.uid()
      )
    )
  );
```

---

## 🎨 前端UI组件

### 1. MeetingDashboard
**路径**: `/app/meetings/page.tsx`

**功能**：
- 显示所有会议列表
- 按状态、日期、频道筛选
- 创建新会议
- 快速操作（编辑、删除、导出）

**关键特性**：
```typescript
interface MeetingDashboardProps {
  meetings: Meeting[];
  channels: Channel[];
  onCreateMeeting: (data: CreateMeetingInput) => Promise<void>;
  onDeleteMeeting: (id: string) => Promise<void>;
}
```

### 2. MeetingEditor
**路径**: `/app/meetings/[id]/editor.tsx`

**功能**：
- 实时编辑会议笔记
- Tiptap富文本编辑
- 实时协作（Y.js）
- 自动保存

**关键特性**：
```typescript
interface MeetingEditorProps {
  meetingId: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  collaborators: User[];
}
```

### 3. ChannelNavigator
**路径**: `/components/layout/ChannelSidebar.tsx`

**功能**：
- 树形显示所有频道
- 权限指示器（Confidential标签）
- 快速切换频道
- 频道搜索

**关键特性**：
```typescript
interface ChannelNavigatorProps {
  channels: Channel[];
  userRole: UserRole;
  onChannelSelect: (channelId: string) => void;
}
```

### 4. InsightPanel
**路径**: `/components/notebook/InsightPanel.tsx`

**功能**：
- 实时显示AI洞察
- 显示关键指标（50M收入目标、14%利润率）
- 行动项提取
- 决策记录

**关键特性**：
```typescript
interface InsightPanelProps {
  meetingId: string;
  insights: AIInsight[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}
```

### 5. PermissionManager
**路径**: `/components/settings/PermissionManager.tsx`

**功能**：
- 管理频道成员
- 设置用户角色
- 权限审计
- 批量操作

**关键特性**：
```typescript
interface PermissionManagerProps {
  channelId: string;
  members: ChannelMember[];
  onUpdateRole: (userId: string, role: UserRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}
```

---

## 🔌 后端API端点

### 会议管理

```typescript
// GET /api/meetings - 获取会议列表
GET /api/meetings?channelId=xxx&status=in_progress

// POST /api/meetings - 创建会议
POST /api/meetings
{
  title: string;
  description: string;
  channelId: string;
  startTime: Date;
  meetingType: 'standup' | 'review' | 'planning' | 'retrospective';
  projectPhase: 'M0' | 'M1' | ... | 'M12';
}

// GET /api/meetings/[id] - 获取会议详情
GET /api/meetings/[id]

// PUT /api/meetings/[id] - 更新会议
PUT /api/meetings/[id]
{
  title?: string;
  description?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

// DELETE /api/meetings/[id] - 删除会议
DELETE /api/meetings/[id]
```

### 频道管理

```typescript
// GET /api/channels - 获取频道列表
GET /api/channels

// POST /api/channels - 创建频道
POST /api/channels
{
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'confidential';
}

// GET /api/channels/[id]/members - 获取频道成员
GET /api/channels/[id]/members

// POST /api/channels/[id]/members - 添加成员
POST /api/channels/[id]/members
{
  userId: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
}

// PUT /api/channels/[id]/members/[userId] - 更新成员角色
PUT /api/channels/[id]/members/[userId]
{
  role: 'owner' | 'manager' | 'member' | 'viewer';
}

// DELETE /api/channels/[id]/members/[userId] - 移除成员
DELETE /api/channels/[id]/members/[userId]
```

### 会议笔记

```typescript
// GET /api/meetings/[id]/notes - 获取笔记
GET /api/meetings/[id]/notes

// PUT /api/meetings/[id]/notes - 更新笔记
PUT /api/meetings/[id]/notes
{
  content: string; // Tiptap JSON
}

// POST /api/meetings/[id]/notes/export - 导出笔记
POST /api/meetings/[id]/notes/export
{
  format: 'pdf' | 'docx' | 'markdown';
}
```

### AI洞察

```typescript
// GET /api/meetings/[id]/insights - 获取AI洞察
GET /api/meetings/[id]/insights

// POST /api/meetings/[id]/insights/generate - 生成AI洞察
POST /api/meetings/[id]/insights/generate
{
  insightTypes: ('summary' | 'action_items' | 'decisions' | 'risks' | 'opportunities')[];
}

// GET /api/meetings/[id]/insights/stream - 流式获取AI洞察
GET /api/meetings/[id]/insights/stream
```

### 权限检查

```typescript
// GET /api/permissions/check - 检查权限
GET /api/permissions/check?resource=meeting&resourceId=xxx&action=edit

// Response
{
  hasPermission: boolean;
  reason?: string;
}
```

---

## 🤖 Gemini AI集成

### 会议分析流程

```
1. 会议结束
   ↓
2. 收集会议笔记和元数据
   ↓
3. 调用Gemini API进行分析
   ↓
4. 生成多种洞察（总结、行动项、决策、风险、机会）
   ↓
5. 存储到数据库
   ↓
6. 实时推送到前端
```

### 系统提示词

```typescript
const MEETING_ANALYSIS_PROMPT = `
You are an expert business analyst for GRT, an industrial cleaning equipment manufacturer.

Context:
- Organization: GRT (工业清洁设备制造商)
- Annual Revenue Target: 50M
- Profit Margin Target: 14%
- Project Lifecycle: M0-M12 phases

Your task is to analyze the meeting notes and provide:
1. Executive Summary (2-3 sentences)
2. Key Decisions (bullet points)
3. Action Items (with owners and deadlines)
4. Risks & Mitigation Strategies
5. Opportunities for Revenue/Margin Improvement

Format your response as JSON with these exact keys:
{
  "summary": "...",
  "decisions": ["..."],
  "actionItems": [{"task": "...", "owner": "...", "deadline": "..."}],
  "risks": [{"risk": "...", "mitigation": "..."}],
  "opportunities": ["..."]
}

Always link recommendations to the 50M revenue target and 14% profit margin goal.
Use M0-M12 project phase terminology when applicable.
`;
```

### 实现代码

```typescript
// app/api/meetings/[id]/insights/generate/route.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const meetingId = params.id;
  
  // 获取会议信息
  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    include: { notes: true, channel: true }
  });

  // 构建提示词
  const userPrompt = `
Meeting Title: ${meeting.title}
Meeting Type: ${meeting.meetingType}
Project Phase: ${meeting.projectPhase}
Meeting Notes:
${meeting.notes.map(n => n.content).join('\n')}
  `;

  // 调用Gemini API
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const result = await model.generateContent([
    {
      text: MEETING_ANALYSIS_PROMPT
    },
    {
      text: userPrompt
    }
  ]);

  const insights = JSON.parse(result.response.text());

  // 存储洞察
  await db.aiInsight.createMany({
    data: [
      {
        meetingId,
        insightType: 'summary',
        content: insights.summary,
        confidenceScore: 0.95
      },
      // ... 其他洞察类型
    ]
  });

  return Response.json({ success: true, insights });
}
```

---

## 🔐 安全和合规

### 数据加密

```typescript
// AES-256加密音频文件
import crypto from 'crypto';

function encryptAudioFile(buffer: Buffer, key: string): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return Buffer.concat([iv, encrypted]);
}
```

### 审计日志

```typescript
// 记录所有敏感操作
async function logAuditEvent(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any
) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: getClientIP()
    }
  });
}
```

### 权限验证

```typescript
// 中间件：检查用户是否有权访问频道
export async function checkChannelAccess(
  userId: string,
  channelId: string,
  requiredRole?: UserRole
): Promise<boolean> {
  const member = await db.channelMember.findUnique({
    where: {
      channelId_userId: { channelId, userId }
    }
  });

  if (!member) return false;

  if (requiredRole) {
    const roleHierarchy = { owner: 4, manager: 3, member: 2, viewer: 1 };
    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }

  return true;
}
```

---

## 📈 实现时间表

| 阶段 | 任务 | 时间 | 优先级 |
|------|------|------|--------|
| 1 | 数据库模式设计和迁移 | 1周 | 🔴 高 |
| 2 | 后端API实现 | 2周 | 🔴 高 |
| 3 | 前端UI组件开发 | 2周 | 🔴 高 |
| 4 | Gemini AI集成 | 1周 | 🟡 中 |
| 5 | 实时协作功能 | 1.5周 | 🟡 中 |
| 6 | 测试和优化 | 1周 | 🔴 高 |
| 7 | 部署和文档 | 0.5周 | 🟡 中 |

**总计**: 8.5周

---

## ✅ 成功标准

- [ ] 所有API端点都已实现并通过测试
- [ ] 前端UI美观且响应式
- [ ] Gemini AI能正确分析会议内容
- [ ] 权限系统正确执行RLS策略
- [ ] 实时协作功能流畅
- [ ] 审计日志完整记录所有操作
- [ ] 性能达到SLA要求（<200ms响应时间）
- [ ] 安全审计通过

---

## 📚 相关文档

- [数据库模式详细说明](./DB_SCHEMA.md)
- [API文档](./API_DOCUMENTATION.md)
- [前端组件库](./COMPONENT_LIBRARY.md)
- [AI集成指南](./AI_INTEGRATION_GUIDE.md)
- [安全和合规指南](./SECURITY_COMPLIANCE.md)

---

**文档版本**: 1.0  
**最后更新**: 2026-02-05  
**作者**: GRT Development Team
