# 生产工序步骤管理 - 设计笔记

## 已有的数据库表（可复用）

1. **processDefinitions** (production-process-schema.ts) - T1-T15工序定义
2. **projectProcessInstances** - 项目工序实例
3. **processTimeRecords** - 工序工时记录
4. **sopTemplates** - SOP模板
5. **aiSopRecommendations** - AI SOP推荐
6. **productionStageDefinitions** (schema.ts) - 生产阶段定义
7. **productionStages** - 项目生产阶段实例
8. **timeRecords** - 工时记录（支持多种采集方式）
9. **productionAiKnowledge** - AI洞察知识库

## 需要新增的表

1. **process_bom_steps** - 工程师手动输入的BOM步骤（左列）
   - 关联工序实例
   - 步骤序号、名称、工艺要求、工艺步骤描述
   - 理论工时、计划产线员工
   - 附件/照片
   - 状态（待开始/进行中/已完成）

2. **process_ai_preset_steps** - AI智慧预设步骤（右列）
   - 关联工序实例
   - AI生成的步骤内容
   - 参照的历史项目ID
   - 匹配度/置信度
   - 确认状态（待确认/已确认/已修改/已拒绝）
   - 确认人

3. **process_step_time_logs** - 产线员工工时打卡记录
   - 关联BOM步骤
   - 员工ID/姓名
   - 开始时间、结束时间
   - 自动计算的工时
   - 工时备注

4. **process_step_attachments** - 步骤附件
   - 关联步骤
   - 文件URL、类型、大小
   - 上传者

5. **ai_historical_references** - AI历史项目参照记录
   - 源项目ID、目标项目ID
   - 参照范围（单步骤/全部T步骤）
   - 匹配算法和分数
