# 03-集成与接口

## 概述

集成与接口模块管理 GRT 数字化平台与外部系统的所有集成连接，包括 ERP（天思）、OA（钉钉/企微）、Office 365、简道云、AI 模型服务等。确保数据在各系统间准确、及时、安全地流转。

### 集成架构

| 外部系统 | 集成方式 | 数据方向 | 主要数据 | 负责 Router |
|----------|----------|----------|----------|-------------|
| 天思 ERP | REST API | 双向同步 | 物料/订单/库存 | erp, tiansi-erp |
| 钉钉 | Open API | 双向 | 消息/审批/组织 | dingtalk |
| 简道云 | Open API | 单向导入 | 表单数据 | jiandaoyun |
| Office 365 | MS Graph | 双向 | 邮件/日历/文件 | microsoft-graph |
| AI 模型 | REST API | 请求-响应 | GPT/Gemini 推理 | ai-adapter |

## 文件清单

| 文件 | 说明 |
|------|------|
| TPL-API接口清单.md | tRPC 路由器接口清单 |
| TPL-ERP对接方案.md | 天思 ERP 集成方案 |
| TPL-钉钉-企微集成.md | 钉钉/企微集成方案 |
