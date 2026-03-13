# GRT 企业组织架构文件体系

> **版本**: v1.0
> **生效日期**: 2026-03-09
> **维护人**: CEO / 体系管理部
> **系统版本**: GRT Implementation Platform v2.0

## 导航指南

本文件体系涵盖 GRT 机器人科技集团全部组织管理文档，按职能域划分为 15 个一级分区。每个分区下包含 README（概述）和 TPL-* 模板文件。

| 编号 | 分区 | 说明 | 链接 |
|------|------|------|------|
| 00 | [公司治理](./00-公司治理/README.md) | 组织架构、战略规划、董事会治理、风险管理、合规认证、ESG | Corporate Governance |
| 01 | [研发管理](./01-研发管理/README.md) | NPI/NPD、门禁评审、BOM管理、试验验证 | R&D Management |
| 02 | [项目管理](./02-项目管理/README.md) | M0-M12生命周期、Stage-Gate、项目数字孪生 | Project Management |
| 03 | [生产制造](./03-生产制造/README.md) | 工艺路线、排产计划、MES、OEE | Production & Manufacturing |
| 04 | [质量管理](./04-质量管理/README.md) | IATF 16949、FMEA、8D/CAPA、PPAP、MSA | Quality Management |
| 05 | [供应链管理](./05-供应链管理/README.md) | 采购、供应商、仓库、物料追溯 | Supply Chain Management |
| 06 | [销售与CRM](./06-销售与CRM/README.md) | 线索管理、客户关系、合同、报价 | Sales & CRM |
| 07 | [客户服务](./07-客户服务/README.md) | 售后、FAT/SAT、备件、客诉、客户授权 | Customer Service |
| 08 | [人力资源](./08-人力资源/README.md) | 招聘、绩效、薪酬、培训、组织发展 | Human Resources |
| 09 | [财务管理](./09-财务管理/README.md) | 预算、费用、差旅、成本核算 | Finance Management |
| 10 | [IT与系统](./10-IT与系统/README.md) | 权限、安全合规、集成配置、数据运维 | IT & Systems |
| 11 | [行政与OA](./11-行政与OA/README.md) | OA审批流、会议管理、公文管理 | Admin & OA |
| 12 | [安全与环保](./12-安全与环保/README.md) | EHS、安全规程、环境管理 | Safety & Environment |
| 13 | [知识管理](./13-知识管理/README.md) | 文档中心、知识库、培训资料 | Knowledge Management |
| 14 | [数字化平台](./14-数字化平台/README.md) | AI助手、数字孪生、IoT、数据分析 | Digital Platform |

## 责任矩阵

| 分区 | Owner | 审批人 | 系统模块 |
|------|-------|--------|----------|
| 00-公司治理 | CEO | 董事会 | /strategy, /ceo-dashboard |
| 01-研发管理 | CTO | CEO | /rnd-npi, /rd-verification, /design-engine |
| 02-项目管理 | COO | CEO | /pos, /stage-gate, /project-digital-twin |
| 03-生产制造 | COO | CEO | /shopfloor, /production, /scheduling |
| 04-质量管理 | 质量总监 | COO | /quality, /fmea, /eight-d-capa, /ppap |
| 05-供应链管理 | 采购总监 | COO/CFO | /supply-chain, /procurement, /warehouse |
| 06-销售与CRM | 销售VP | CEO | /crm, /sales, /lead-analytics |
| 07-客户服务 | 服务总监 | COO | /after-sales, /fat-coordination, /customer-portal |
| 08-人力资源 | HR VP | CEO | /hrm, /employee, /perf-salary |
| 09-财务管理 | CFO | CEO | /finance, /expense-report, /budget |
| 10-IT与系统 | CTO | CEO | /admin, /permission, /security |
| 11-行政与OA | HR VP | COO | /oa, /oa-forms, /meeting |
| 12-安全与环保 | COO | CEO | /safety-rule, /eco-impact |
| 13-知识管理 | CTO | COO | /knowledge, /doc-intelligence |
| 14-数字化平台 | CTO | CEO | /ai-canvas, /digital-twin, /iot |

## 系统模块对照表

| 组织文件夹 | GRT 系统路由 | 系统角色 | 备注 |
|------------|-------------|----------|------|
| 00-公司治理/01-组织架构 | /org, /employee-profile | ceo, vp_hr | 组织架构图、岗位说明书 |
| 00-公司治理/02-战略规划 | /strategy, /okr | ceo, bu_gm | OKR四级对齐 |
| 00-公司治理/03-董事会与治理 | /ceo-dashboard | ceo | 董事会决议、股东会 |
| 00-公司治理/04-风险管理 | /risk, /compliance | ceo, cfo | 风险登记册、BCP |
| 00-公司治理/05-合规与认证 | /compliance, /equipment-compliance | quality_director | IATF/ISO审核 |
| 00-公司治理/06-ESG与社会责任 | /eco-impact, /carbon-footprint | ceo | ESG年报 |
| 01-研发管理 | /rnd-npi, /design-engine | cto, bu_mech, bu_elec | NPI工作台 |
| 02-项目管理 | /pos, /stage-gate | bu_pm, team_leader | M0-M12管道 |
| 03-生产制造 | /shopfloor, /production | coo, team_leader | 车间主板 |
| 04-质量管理 | /quality, /fmea | quality_director | IATF体系 |
| 05-供应链管理 | /supply-chain, /procurement | procurement_director | 追溯工作台 |
| 06-销售与CRM | /crm, /lead-analytics | vp_sales, bu_sales | CRM工作台 |
| 07-客户服务 | /after-sales, /customer-portal | service_director, cs_engineer | 售后工作台 |
| 08-人力资源 | /hrm, /perf-salary | vp_hr | 人力全景 |
| 09-财务管理 | /expense-report, /budget | cfo | 费用报表 |
| 10-IT与系统 | /permission, /security | cto, admin | RBAC权限 |

## 五大事业部 (BU)

| BU代码 | 名称 | 英文 | 负责人角色 |
|--------|------|------|-----------|
| overseas | 海外事业部 | Overseas BU | bu_gm |
| commercial | 商用车事业部 | Commercial Vehicle BU | bu_gm |
| passenger | 乘用车事业部 | Passenger Vehicle BU | bu_gm |
| semiconductor | 半导体事业部 | Semiconductor BU | bu_gm |
| industrial | 工业通用事业部 | Industrial General BU | bu_gm |

## 18 系统角色

| 角色代码 | 中文名称 | 层级 |
|----------|---------|------|
| ceo | 首席执行官 | 10 |
| cto | 首席技术官 | 9 |
| coo | 首席运营官 | 9 |
| cfo | 首席财务官 | 9 |
| vp_sales | 销售副总裁 | 8 |
| vp_hr | 人力资源副总裁 | 8 |
| bu_gm | 事业部总经理 | 7 |
| quality_director | 质量总监 | 7 |
| procurement_director | 采购总监 | 7 |
| service_director | 服务总监 | 7 |
| bu_sales | 事业部销售 | 5 |
| bu_pm | 事业部项目经理 | 5 |
| bu_mech | 事业部机械工程师 | 5 |
| bu_elec | 事业部电气工程师 | 5 |
| team_leader | 班组长 | 4 |
| engineer | 工程师 | 3 |
| technician | 技术员 | 2 |
| employee | 员工 | 1 |

## 使用说明

1. **查找文档**: 通过上方导航表定位到对应分区，进入 README 查看文件清单
2. **使用模板**: TPL-* 文件为标准模板，复制后填写具体内容，保存为正式文件
3. **命名规范**: 正式文件命名格式 `YYYY-MM-DD-[模板名]-[主题].md`
4. **审批流程**: 按责任矩阵中的审批人进行签批，系统中通过 OA 审批流完成
5. **版本管理**: 所有文件通过 Git 版本控制，重大变更需在 CHANGELOG 中记录
6. **系统联动**: 模板中标注了对应的系统路由，填写完成后数据可同步至平台

## 文件命名约定

| 前缀 | 含义 | 示例 |
|------|------|------|
| TPL- | 模板文件 | TPL-组织架构图.md |
| REG- | 登记台账 | REG-认证登记台账.md |
| RPT- | 报告/报表 | RPT-ESG年报.md |
| POL- | 制度/政策 | POL-风险管理制度.md |
| SOP- | 标准操作程序 | SOP-入职流程.md |
