# RFC-026: 流程笔记系统（Process Notebook + AI Recognition）

**版本**: 1.0  
**状态**: 已批准  
**创建日期**: 2026-01-18  
**作者**: Manus AI  
**优先级**: P0

---

## 1. 概述

### 1.1 背景

在企业业务流程执行过程中，员工需要记录大量的工作笔记、会议纪要、客户沟通内容等信息。这些信息往往分散在不同的系统和文档中，难以与业务流程形成有效关联。同时，这些笔记中包含的关键信息（如客户需求、技术参数、问题反馈等）需要被识别并更新到相应的业务数据中。

### 1.2 目标

构建一个集成在业务流程中的笔记系统，支持多媒体内容记录，并通过AI智能识别笔记内容，自动关联到相关业务流程和数据字段，实现信息的高效流转和更新。

---

## 2. 需求分析

### 2.1 功能需求

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| FR-001 | 左侧员工Notebook支持富文本编辑 | P0 |
| FR-002 | 支持附录文件上传（PDF、Word、Excel等） | P0 |
| FR-003 | 支持图片上传和预览 | P0 |
| FR-004 | 支持语音录制和播放 | P1 |
| FR-005 | 右侧AI识别面板显示建议内容 | P0 |
| FR-006 | AI自动关联笔记内容到相关流程 | P0 |
| FR-007 | 显示确认更换按钮，支持一键更新 | P0 |
| FR-008 | 支持查看已记录内容的关联建议 | P1 |
| FR-009 | 笔记版本历史和回溯 | P2 |

### 2.2 非功能需求

| 需求编号 | 需求描述 | 指标 |
|---------|---------|------|
| NFR-001 | AI识别响应时间 | < 3秒 |
| NFR-002 | 文件上传大小限制 | 50MB |
| NFR-003 | 语音录制时长限制 | 10分钟 |
| NFR-004 | 并发用户支持 | 100+ |

---

## 3. 系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     流程笔记系统 (Process Notebook)               │
├─────────────────────────────────┬───────────────────────────────┤
│         左侧：员工Notebook        │       右侧：AI识别建议         │
├─────────────────────────────────┼───────────────────────────────┤
│  ┌─────────────────────────┐   │  ┌─────────────────────────┐  │
│  │     富文本编辑器         │   │  │    AI分析结果显示        │  │
│  │  - 文字输入             │   │  │  - 识别的关键信息        │  │
│  │  - 格式化工具           │   │  │  - 关联的流程字段        │  │
│  └─────────────────────────┘   │  │  - 已记录内容匹配        │  │
│  ┌─────────────────────────┐   │  └─────────────────────────┘  │
│  │     附件上传区域         │   │  ┌─────────────────────────┐  │
│  │  - 文件拖拽上传         │   │  │    确认更换按钮区域       │  │
│  │  - 图片预览             │   │  │  [确认更新] [忽略]       │  │
│  │  - 语音录制             │   │  │  [查看详情] [编辑]       │  │
│  └─────────────────────────┘   │  └─────────────────────────┘  │
└─────────────────────────────────┴───────────────────────────────┘
```

### 3.2 数据流程

```
员工输入笔记内容
       ↓
  内容保存到数据库
       ↓
  触发AI分析任务
       ↓
┌──────────────────────────────────────┐
│           AI内容识别引擎              │
├──────────────────────────────────────┤
│  1. 文本分析（NLP实体识别）           │
│  2. 文件解析（PDF/Word/Excel提取）    │
│  3. 图片OCR（文字识别）              │
│  4. 语音转文字（ASR）                │
└──────────────────────────────────────┘
       ↓
  生成关联建议
       ↓
  显示在右侧面板
       ↓
  用户确认/修改
       ↓
  更新关联业务数据
```

---

## 4. 数据库设计

### 4.1 核心表结构

#### process_notebooks（流程笔记本）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| process_type | VARCHAR(50) | 流程类型（project/crm/cost等） |
| process_id | VARCHAR(100) | 关联的流程ID |
| process_step | VARCHAR(50) | 流程步骤（M0-M12等） |
| title | VARCHAR(200) | 笔记本标题 |
| created_by | BIGINT | 创建人ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| status | ENUM | 状态（active/archived） |

#### notebook_entries（笔记条目）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| notebook_id | BIGINT | 所属笔记本ID |
| entry_type | ENUM | 条目类型（text/file/image/voice） |
| content | TEXT | 文本内容（富文本HTML） |
| file_url | VARCHAR(500) | 文件URL（S3路径） |
| file_name | VARCHAR(200) | 原始文件名 |
| file_type | VARCHAR(50) | 文件MIME类型 |
| file_size | INT | 文件大小（字节） |
| voice_duration | INT | 语音时长（秒） |
| voice_transcript | TEXT | 语音转文字结果 |
| ocr_result | TEXT | 图片OCR结果 |
| created_by | BIGINT | 创建人ID |
| created_at | TIMESTAMP | 创建时间 |
| is_ai_processed | BOOLEAN | 是否已AI处理 |

#### ai_notebook_suggestions（AI笔记建议）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| entry_id | BIGINT | 关联的笔记条目ID |
| suggestion_type | ENUM | 建议类型（field_update/process_link/content_match） |
| target_process_type | VARCHAR(50) | 目标流程类型 |
| target_process_id | VARCHAR(100) | 目标流程ID |
| target_field | VARCHAR(100) | 目标字段名 |
| current_value | TEXT | 当前值 |
| suggested_value | TEXT | 建议值 |
| confidence_score | DECIMAL(3,2) | 置信度（0-1） |
| extracted_keywords | JSON | 提取的关键词 |
| reasoning | TEXT | AI推理说明 |
| status | ENUM | 状态（pending/accepted/rejected/modified） |
| accepted_value | TEXT | 用户接受的值（可能修改） |
| accepted_by | BIGINT | 接受人ID |
| accepted_at | TIMESTAMP | 接受时间 |
| created_at | TIMESTAMP | 创建时间 |

---

## 5. API设计

### 5.1 笔记管理API

| 端点 | 方法 | 说明 |
|------|------|------|
| processNotebook.create | mutation | 创建流程笔记本 |
| processNotebook.getByProcess | query | 获取流程关联的笔记本 |
| processNotebook.addEntry | mutation | 添加笔记条目 |
| processNotebook.updateEntry | mutation | 更新笔记条目 |
| processNotebook.deleteEntry | mutation | 删除笔记条目 |
| processNotebook.uploadFile | mutation | 上传附件文件 |
| processNotebook.uploadVoice | mutation | 上传语音录音 |

### 5.2 AI建议API

| 端点 | 方法 | 说明 |
|------|------|------|
| aiNotebook.analyzeEntry | mutation | 分析笔记条目生成建议 |
| aiNotebook.getSuggestions | query | 获取笔记的AI建议列表 |
| aiNotebook.acceptSuggestion | mutation | 接受AI建议并更新目标 |
| aiNotebook.rejectSuggestion | mutation | 拒绝AI建议 |
| aiNotebook.modifySuggestion | mutation | 修改后接受AI建议 |
| aiNotebook.getRelatedContent | query | 获取关联的已记录内容 |

---

## 6. AI识别引擎设计

### 6.1 内容分析流程

```typescript
interface AIAnalysisResult {
  keywords: string[];           // 提取的关键词
  entities: {                   // 识别的实体
    type: 'customer' | 'product' | 'date' | 'amount' | 'person' | 'requirement';
    value: string;
    confidence: number;
  }[];
  suggestions: {                // 生成的建议
    targetField: string;
    suggestedValue: string;
    reasoning: string;
    confidence: number;
  }[];
  relatedContent: {             // 关联的已有内容
    processType: string;
    processId: string;
    fieldName: string;
    currentValue: string;
    matchScore: number;
  }[];
}
```

### 6.2 关联规则

| 识别内容 | 关联目标 | 示例 |
|---------|---------|------|
| 客户名称 | CRM客户档案 | "与华为沟通" → 关联华为客户 |
| 产品型号 | 项目设备配置 | "SC800W设备" → 关联设备型号 |
| 清洁度标准 | 方案技术参数 | "VDA19.1标准" → 更新清洁度要求 |
| 节拍要求 | 项目生产参数 | "60秒/件" → 更新节拍时间 |
| 金额数字 | 报价/成本字段 | "报价150万" → 更新报价金额 |
| 日期时间 | 项目里程碑 | "3月15日交付" → 更新交付日期 |
| 问题描述 | OPL问题清单 | "盲孔清洗困难" → 添加OPL条目 |

---

## 7. 风险评估

| 风险项 | 影响程度 | 缓解措施 |
|--------|---------|---------|
| AI识别准确率不足 | 中 | 设置置信度阈值，低于阈值需人工确认 |
| 大文件上传性能 | 中 | 使用分片上传，设置文件大小限制 |
| 语音识别延迟 | 低 | 异步处理，显示处理进度 |
| 数据安全风险 | 高 | 文件加密存储，访问权限控制 |

---

## 8. 实施计划

| 阶段 | 任务 | 预计工时 |
|------|------|---------|
| Phase 1 | 数据库设计和基础API | 4小时 |
| Phase 2 | 笔记UI组件开发 | 6小时 |
| Phase 3 | AI识别引擎集成 | 4小时 |
| Phase 4 | 业务页面集成 | 3小时 |
| Phase 5 | 测试和优化 | 3小时 |
| **总计** | | **20小时** |

---

## 9. 审批记录

| 日期 | 审批人 | 决定 | 备注 |
|------|--------|------|------|
| 2026-01-18 | 系统 | 批准 | RFC-026正式批准实施 |

---

## 10. 参考文档

- RFC-023: AI助手双层体系架构
- RFC-024: AI助手实现方案
- RFC-025: AI执行模式选择功能
- Claude Code + NocoBase技术规范 v2.3.0
