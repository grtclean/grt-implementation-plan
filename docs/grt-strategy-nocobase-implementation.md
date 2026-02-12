# GRT 2028/2030战略规划 NocoBase实施规范

## 执行摘要

本文档定义了GRT全球战略规划在NocoBase平台上的完整实施方案。通过四个核心模块（战略资源配置、全球销售CRM、人力资源绩效、BI驾驶舱），将静态的PPT规划转化为动态的数字化管理系统。

---

## 第一部分：战略资源配置中心

### 1.1 数据模型设计

**Strategy_Master_Plan 表**

该表是系统的战略指标库，记录GRT在2026/2028/2030年的关键目标。

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| year | Integer | 规划年份 | 2028, 2030 |
| region | String | 地区 | Global, Asia, Europe, US |
| metric | String | 指标类型 | Revenue, Headcount |
| target_value | Number | 目标值 | 300000000 |
| actual_value | Number | 实际值 | 动态更新 |
| unit | String | 单位 | CNY, EUR, USD, Person |
| achievement_rate | Number | 达成率(%) | 自动计算 |
| status | String | 状态 | On_Track, At_Risk, Off_Track |

**示例数据**

```json
{
  "year": 2028,
  "region": "Global",
  "metric": "Revenue",
  "target_value": 300000000,
  "unit": "CNY",
  "achievement_rate": 65,
  "status": "On_Track"
}
```

**Resource_Allocation 表**

该表定义了动态的部门编制，基于战略目标自动触发招聘需求。

| 字段名 | 类型 | 说明 | 触发条件 |
|--------|------|------|----------|
| department | String | 部门 | Sales, Service, ISC, PMO |
| region | String | 地区 | Asia, Europe, US |
| role | String | 职位 | Europe Tech Sales, Asia Remote Support |
| planned_headcount | Integer | 计划人数 | 根据战略调整 |
| trigger_condition | String | 触发条件 | Europe Revenue > 6M EUR |
| trigger_status | String | 触发状态 | Pending, Triggered, Completed |

### 1.2 Gemini自动化逻辑

**规则：欧洲招聘自动触发**

当满足以下条件时，系统自动在HRM_Recruitment表中创建新的招聘需求：

```
IF region = "Europe" 
   AND revenue_actual >= target_value * 0.5 
   AND recruitment_request_id IS NULL
THEN
   CREATE HRM_Recruitment {
     department: "Service",
     region: "Europe",
     role: "Europe Tech Sales Engineer",
     headcount: 1,
     status: "Open",
     trigger_reason: "Europe Revenue reached 50% of target",
     created_at: now()
   }
   UPDATE Resource_Allocation SET trigger_status = "Triggered"
```

**实现步骤**

1. 在Gemini_Automation_Rules表中创建规则记录
2. 配置触发条件和动作
3. 设置定时检查（每日凌晨2点UTC）
4. 记录触发日志供审计

---

## 第二部分：全球销售与CRM

### 2.1 欧美大客户视图 (KAM View)

**视图配置**

```json
{
  "name": "KAM_View",
  "collection": "Global_Sales_Opportunities",
  "filters": [
    {
      "field": "potential_value",
      "operator": ">=",
      "value": 500000
    },
    {
      "field": "region",
      "operator": "in",
      "value": ["Europe", "US"]
    }
  ],
  "fields": [
    "customer_name",
    "potential_value",
    "stage",
    "sales_rep",
    "expected_close_date",
    "weighted_value"
  ],
  "sort": [
    {
      "field": "weighted_value",
      "direction": "desc"
    }
  ]
}
```

**强制关联规则**

对于金额 > $1M的商机，系统强制要求关联ISC_Support_Ticket：

```javascript
// 在Global_Sales_Opportunities表的before_save钩子中
if (record.potential_value > 1000000 && !record.isc_ticket_id) {
  throw new Error("商机金额超过$1M，必须关联ISC工单");
}
```

### 2.2 亚洲ISC任务看板

**看板列配置**

| 列名 | 状态值 | 说明 |
|------|--------|------|
| 待响应 | To_Do | 新工单，等待分配 |
| 方案制作中 | Drafting | 正在制作解决方案 |
| 欧美已审核 | Reviewed | 已通过欧美销售审核 |
| 已提交客户 | Submitted | 已提交给客户 |

**时差提醒逻辑**

```javascript
// 计算客户当前是否在工作时间
function isCustomerWorkingHours(timezone, task) {
  const customerTime = moment().tz(timezone);
  const hour = customerTime.hour();
  
  // 工作时间: 9:00-18:00
  if (hour >= 9 && hour < 18 && customerTime.day() >= 1 && customerTime.day() <= 5) {
    return true;
  }
  return false;
}

// 在ISC_Task_Board表中自动更新
task.is_working_hours = isCustomerWorkingHours(task.customer_timezone);
```

### 2.3 销售效率KPI计算

**公式**

```
Sales_Efficiency = Revenue_YTD / Support_Cost_YTD
```

**实现**

```javascript
// 在BI_Dashboard_Config中配置
{
  "chart_type": "Gauge",
  "title": "销售效率指标",
  "data_source": "Global_Sales_Opportunities",
  "calculation": "SUM(revenue_ytd) / SUM(support_cost_ytd)",
  "alert_threshold": 3.0,  // 如果效率 < 3.0，显示预警
  "alert_color": "Red"
}
```

---

## 第三部分：人力资源与绩效

### 3.1 动态KPI模板

**销售人员KPI计算**

```javascript
{
  "kpi_type": "Sales",
  "weights": {
    "sales_achievement_rate": 0.70,      // 销售额达成率 70%
    "forecast_accuracy": 0.10,           // 预测准确率 10%
    "crm_data_completeness": 0.20        // CRM数据完整度 20%
  },
  "overall_score": (
    sales_achievement_rate * 0.70 +
    forecast_accuracy * 0.10 +
    crm_data_completeness * 0.20
  )
}
```

**ISC支持人员KPI计算**

```javascript
{
  "kpi_type": "ISC_Support",
  "weights": {
    "customer_satisfaction": 0.40,       // 欧美满意度评分 40%
    "response_speed": 0.30,              // 响应速度 30%
    "solution_hit_rate": 0.30            // 方案中标率 30%
  },
  "overall_score": (
    customer_satisfaction * 0.40 +
    response_speed * 0.30 +
    solution_hit_rate * 0.30
  )
}
```

### 3.2 Gemini AI Coach

**触发条件**

```
每周一 02:00 UTC 执行以下检查：
IF ytd_achievement < 80% AND trend = "Down"
THEN
  生成绩效改进建议邮件
  发送给直属经理
```

**邮件模板**

```
收件人: {manager_email}
主题: 员工绩效改进建议 - {staff_name}

尊敬的 {manager_name}，

根据本周的KPI分析，{staff_name} 的绩效需要关注：

当前状态:
- 年度累计达成率: {ytd_achievement}%
- 趋势: {trend}
- 主要薄弱环节: {weak_area}

建议措施:
{ai_suggestions}

请在本周五前反馈改进计划。

系统生成
```

**AI建议生成逻辑**

```javascript
async function generateCoachingSuggestions(scorecard) {
  const prompt = `
    员工: ${scorecard.staff_name}
    部门: ${scorecard.department}
    年度达成率: ${scorecard.ytd_achievement}%
    弱项: ${scorecard.weak_areas}
    
    请生成3-5条具体的绩效改进建议，包括:
    1. 具体的培训课程
    2. 辅导计划
    3. 目标调整建议
  `;
  
  const suggestions = await gemini.generateText(prompt);
  return suggestions;
}
```

---

## 第四部分：可视化驾驶舱

### 4.1 2030战略路径图

**图表配置**

```json
{
  "chart_type": "Line",
  "title": "2030战略路径图",
  "x_axis": {
    "field": "year",
    "range": [2025, 2030]
  },
  "y_axis": {
    "field": "revenue",
    "label": "销售额(RMB)"
  },
  "series": [
    {
      "name": "目标线",
      "data": [50000000, 100000000, 150000000, 200000000, 250000000, 300000000],
      "color": "blue",
      "style": "dashed"
    },
    {
      "name": "实际线",
      "data": "SELECT year, SUM(actual_value) FROM Strategy_Master_Plan WHERE metric='Revenue' GROUP BY year",
      "color": "green"
    }
  ],
  "annotations": [
    {
      "year": 2028,
      "label": "服务团队扩编",
      "color": "orange"
    }
  ],
  "refresh_interval": 3600  // 每小时刷新一次
}
```

### 4.2 全球人效热力图

**热力图配置**

```json
{
  "chart_type": "Heatmap",
  "title": "全球人效热力图",
  "x_axis": {
    "label": "职能",
    "values": ["Sales", "Service", "ISC", "PMO"]
  },
  "y_axis": {
    "label": "地区",
    "values": ["Asia", "Europe", "US"]
  },
  "data_source": "SELECT region, department, revenue_per_capita FROM Staff_KPI_Scorecard",
  "color_scale": {
    "min": 1000000,
    "max": 2000000,
    "colors": ["red", "yellow", "green"]
  },
  "alert_threshold": {
    "field": "revenue_per_capita",
    "value": 1500000,
    "condition": "<",
    "alert_color": "red"
  }
}
```

**预警规则**

```javascript
// 如果美国区人均产出 < $1.5M，显示红色预警
if (region === "US" && revenue_per_capita < 1500000) {
  heatmap.setCellColor(region, department, "red");
  heatmap.showAlert(`美国${department}部门人均产出低于目标`);
}
```

---

## 第五部分：实施步骤

### 5.1 部署前准备

1. **数据库准备**
   - 创建MySQL数据库 `grt_strategy`
   - 导入collections.json配置
   - 设置字符集为 utf8mb4

2. **权限配置**
   - 创建管理员账户
   - 创建销售团队账户（仅可见欧美商机）
   - 创建ISC团队账户（仅可见ISC工单）
   - 创建HR账户（仅可见招聘需求）

3. **Gemini集成**
   - 配置Gemini API密钥
   - 测试自动化规则触发
   - 配置邮件通知服务

### 5.2 部署步骤

```bash
# 1. 在NocoBase中创建新项目
nocobase create-project grt-strategy

# 2. 导入collections配置
nocobase import-collections nocobase/grt-strategy-collections.json

# 3. 配置Gemini自动化规则
nocobase setup-automation Gemini_Automation_Rules

# 4. 配置BI仪表板
nocobase setup-dashboard BI_Dashboard_Config

# 5. 验证系统
nocobase test-system

# 6. 启动定时任务
nocobase start-scheduler
```

### 5.3 数据初始化

```javascript
// 初始化Strategy_Master_Plan数据
const initialStrategies = [
  {
    year: 2026,
    region: "Global",
    metric: "Revenue",
    target_value: 150000000,
    unit: "CNY"
  },
  {
    year: 2028,
    region: "Global",
    metric: "Revenue",
    target_value: 300000000,
    unit: "CNY"
  },
  {
    year: 2030,
    region: "Global",
    metric: "Revenue",
    target_value: 600000000,
    unit: "CNY"
  },
  {
    year: 2028,
    region: "Global",
    metric: "Headcount",
    target_value: 100,
    unit: "Person"
  },
  {
    year: 2030,
    region: "Asia",
    metric: "Headcount",
    target_value: 50,
    unit: "Person"
  }
];

await db.collection('Strategy_Master_Plan').insertMany(initialStrategies);
```

---

## 第六部分：监控与维护

### 6.1 关键指标监控

| 指标 | 目标 | 检查频率 | 告警阈值 |
|------|------|----------|----------|
| Revenue达成率 | 100% | 每日 | < 80% |
| Headcount达成率 | 100% | 每周 | < 90% |
| 销售效率 | > 3.0 | 每周 | < 2.5 |
| ISC响应时间 | < 4小时 | 每日 | > 6小时 |

### 6.2 定期审查

- **周审查**：ISC工单完成率、销售机会进展
- **月审查**：销售效率、员工KPI达成情况
- **季审查**：战略目标达成率、编制调整需求
- **年审查**：全年战略执行情况、2030目标调整

---

## 第七部分：常见问题

**Q: 如何手动触发招聘需求？**

A: 在Resource_Allocation表中，将trigger_status改为"Triggered"，系统会自动在HRM_Recruitment中创建记录。

**Q: ISC时差提醒如何配置？**

A: 在ISC_Task_Board表中设置customer_timezone字段，系统会自动计算并高亮显示当前工作时间的工单。

**Q: 如何修改KPI权重？**

A: 在Staff_KPI_Scorecard表中修改weights字段，系统会自动重新计算overall_score。

---

## 附录：API接口

### 获取战略指标

```
GET /api/collections/Strategy_Master_Plan?year=2028&region=Global
```

### 创建销售机会

```
POST /api/collections/Global_Sales_Opportunities
{
  "customer_name": "Siemens Europe",
  "region": "Europe",
  "potential_value": 1500000,
  "sales_rep": "John Smith"
}
```

### 更新ISC工单状态

```
PATCH /api/collections/ISC_Task_Board/{id}
{
  "status": "Reviewed"
}
```

---

**文档版本**: 1.0  
**最后更新**: 2026年1月  
**维护者**: GRT系统团队
