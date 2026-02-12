#!/usr/bin/env node
/**
 * NocoBase 数据模型导出脚本
 * 
 * 将GRT智能系统的数据模型导出为NocoBase可导入的配置格式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// NocoBase Collection 定义
// ============================================================================

const collections = [
  // CRM模块
  {
    name: 'customers',
    title: '客户',
    fields: [
      { name: 'name', type: 'string', title: '客户名称', required: true },
      { name: 'code', type: 'string', title: '客户编码', unique: true },
      { name: 'type', type: 'select', title: '客户类型', options: ['潜在客户', '正式客户', 'VIP客户'] },
      { name: 'industry', type: 'string', title: '所属行业' },
      { name: 'region', type: 'string', title: '所在区域' },
      { name: 'tier', type: 'select', title: '客户等级', options: ['A', 'B', 'C', 'D'] },
      { name: 'contact', type: 'string', title: '联系人' },
      { name: 'phone', type: 'string', title: '联系电话' },
      { name: 'email', type: 'email', title: '邮箱' },
      { name: 'address', type: 'text', title: '地址' },
      { name: 'creditLimit', type: 'number', title: '信用额度' },
      { name: 'status', type: 'select', title: '状态', options: ['活跃', '休眠', '流失'] },
    ],
  },
  {
    name: 'leads',
    title: '线索',
    fields: [
      { name: 'name', type: 'string', title: '线索名称', required: true },
      { name: 'source', type: 'select', title: '来源', options: ['官网', '展会', '转介绍', '电话', '其他'] },
      { name: 'contact', type: 'string', title: '联系人' },
      { name: 'phone', type: 'string', title: '联系电话' },
      { name: 'email', type: 'email', title: '邮箱' },
      { name: 'company', type: 'string', title: '公司名称' },
      { name: 'requirement', type: 'text', title: '需求描述' },
      { name: 'budget', type: 'number', title: '预算' },
      { name: 'bantScore', type: 'number', title: 'BANT评分' },
      { name: 'status', type: 'select', title: '状态', options: ['新建', '跟进中', '已转化', '已关闭'] },
      { name: 'assignee', type: 'belongsTo', title: '负责人', target: 'employees' },
    ],
  },
  {
    name: 'opportunities',
    title: '商机',
    fields: [
      { name: 'name', type: 'string', title: '商机名称', required: true },
      { name: 'customer', type: 'belongsTo', title: '客户', target: 'customers' },
      { name: 'amount', type: 'number', title: '金额' },
      { name: 'probability', type: 'number', title: '成功概率' },
      { name: 'stage', type: 'select', title: '阶段', options: ['初步接触', '需求确认', '方案报价', '商务谈判', '赢单', '输单'] },
      { name: 'expectedCloseDate', type: 'date', title: '预计成交日期' },
      { name: 'competitor', type: 'string', title: '竞争对手' },
      { name: 'assignee', type: 'belongsTo', title: '负责人', target: 'employees' },
    ],
  },
  
  // 项目管理模块
  {
    name: 'projects',
    title: '项目',
    fields: [
      { name: 'name', type: 'string', title: '项目名称', required: true },
      { name: 'code', type: 'string', title: '项目编码', unique: true },
      { name: 'customer', type: 'belongsTo', title: '客户', target: 'customers' },
      { name: 'type', type: 'select', title: '项目类型', options: ['标准项目', '定制项目', '服务项目'] },
      { name: 'status', type: 'select', title: '状态', options: ['立项', '设计', '制造', '调试', '交付', '验收', '完成'] },
      { name: 'currentPhase', type: 'string', title: '当前阶段' },
      { name: 'startDate', type: 'date', title: '开始日期' },
      { name: 'endDate', type: 'date', title: '结束日期' },
      { name: 'budget', type: 'number', title: '预算' },
      { name: 'actualCost', type: 'number', title: '实际成本' },
      { name: 'manager', type: 'belongsTo', title: '项目经理', target: 'employees' },
    ],
  },
  {
    name: 'project_phases',
    title: '项目阶段',
    fields: [
      { name: 'project', type: 'belongsTo', title: '项目', target: 'projects' },
      { name: 'phase', type: 'select', title: '阶段', options: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'] },
      { name: 'name', type: 'string', title: '阶段名称' },
      { name: 'status', type: 'select', title: '状态', options: ['未开始', '进行中', '已完成', '已跳过'] },
      { name: 'plannedStart', type: 'date', title: '计划开始' },
      { name: 'plannedEnd', type: 'date', title: '计划结束' },
      { name: 'actualStart', type: 'date', title: '实际开始' },
      { name: 'actualEnd', type: 'date', title: '实际结束' },
      { name: 'gateReviewStatus', type: 'select', title: '门径评审状态', options: ['待评审', '通过', '有条件通过', '未通过'] },
    ],
  },
  {
    name: 'tasks',
    title: '任务',
    fields: [
      { name: 'name', type: 'string', title: '任务名称', required: true },
      { name: 'project', type: 'belongsTo', title: '项目', target: 'projects' },
      { name: 'phase', type: 'belongsTo', title: '阶段', target: 'project_phases' },
      { name: 'type', type: 'select', title: '任务类型', options: ['设计', '制造', '测试', '文档', '其他'] },
      { name: 'priority', type: 'select', title: '优先级', options: ['低', '中', '高', '紧急'] },
      { name: 'status', type: 'select', title: '状态', options: ['待处理', '进行中', '已完成', '已取消'] },
      { name: 'assignee', type: 'belongsTo', title: '负责人', target: 'employees' },
      { name: 'dueDate', type: 'date', title: '截止日期' },
      { name: 'estimatedHours', type: 'number', title: '预估工时' },
      { name: 'actualHours', type: 'number', title: '实际工时' },
    ],
  },
  
  // 人力资源模块
  {
    name: 'employees',
    title: '员工',
    fields: [
      { name: 'name', type: 'string', title: '姓名', required: true },
      { name: 'code', type: 'string', title: '工号', unique: true },
      { name: 'department', type: 'string', title: '部门' },
      { name: 'position', type: 'string', title: '职位' },
      { name: 'email', type: 'email', title: '邮箱' },
      { name: 'phone', type: 'string', title: '电话' },
      { name: 'hireDate', type: 'date', title: '入职日期' },
      { name: 'status', type: 'select', title: '状态', options: ['在职', '离职', '休假'] },
      { name: 'manager', type: 'belongsTo', title: '直属上级', target: 'employees' },
    ],
  },
  {
    name: 'skills',
    title: '技能',
    fields: [
      { name: 'name', type: 'string', title: '技能名称', required: true },
      { name: 'category', type: 'select', title: '类别', options: ['技术', '管理', '语言', '其他'] },
      { name: 'description', type: 'text', title: '描述' },
    ],
  },
  {
    name: 'employee_skills',
    title: '员工技能',
    fields: [
      { name: 'employee', type: 'belongsTo', title: '员工', target: 'employees' },
      { name: 'skill', type: 'belongsTo', title: '技能', target: 'skills' },
      { name: 'level', type: 'select', title: '等级', options: ['初级', '中级', '高级', '专家'] },
      { name: 'certifiedDate', type: 'date', title: '认证日期' },
    ],
  },
  {
    name: 'attendance',
    title: '考勤',
    fields: [
      { name: 'employee', type: 'belongsTo', title: '员工', target: 'employees' },
      { name: 'date', type: 'date', title: '日期' },
      { name: 'checkIn', type: 'datetime', title: '签到时间' },
      { name: 'checkOut', type: 'datetime', title: '签退时间' },
      { name: 'status', type: 'select', title: '状态', options: ['正常', '迟到', '早退', '缺勤', '请假', '出差'] },
      { name: 'location', type: 'string', title: '打卡位置' },
    ],
  },
  
  // 成本管理模块
  {
    name: 'budgets',
    title: '预算',
    fields: [
      { name: 'project', type: 'belongsTo', title: '项目', target: 'projects' },
      { name: 'category', type: 'select', title: '类别', options: ['人工', '材料', '设备', '外协', '其他'] },
      { name: 'amount', type: 'number', title: '预算金额' },
      { name: 'usedAmount', type: 'number', title: '已用金额' },
      { name: 'year', type: 'number', title: '年度' },
      { name: 'month', type: 'number', title: '月份' },
    ],
  },
  {
    name: 'cost_entries',
    title: '成本条目',
    fields: [
      { name: 'project', type: 'belongsTo', title: '项目', target: 'projects' },
      { name: 'budget', type: 'belongsTo', title: '预算', target: 'budgets' },
      { name: 'category', type: 'select', title: '类别', options: ['人工', '材料', '设备', '外协', '其他'] },
      { name: 'description', type: 'string', title: '描述' },
      { name: 'amount', type: 'number', title: '金额' },
      { name: 'date', type: 'date', title: '日期' },
      { name: 'submitter', type: 'belongsTo', title: '提交人', target: 'employees' },
      { name: 'status', type: 'select', title: '状态', options: ['待审批', '已批准', '已拒绝'] },
    ],
  },
  {
    name: 'payment_nodes',
    title: '付款节点',
    fields: [
      { name: 'project', type: 'belongsTo', title: '项目', target: 'projects' },
      { name: 'name', type: 'string', title: '节点名称' },
      { name: 'percentage', type: 'number', title: '比例(%)' },
      { name: 'amount', type: 'number', title: '金额' },
      { name: 'condition', type: 'text', title: '触发条件' },
      { name: 'dueDate', type: 'date', title: '计划日期' },
      { name: 'actualDate', type: 'date', title: '实际日期' },
      { name: 'status', type: 'select', title: '状态', options: ['待触发', '待付款', '已付款'] },
    ],
  },
  
  // AI助手模块
  {
    name: 'ai_assistants',
    title: 'AI助手配置',
    fields: [
      { name: 'name', type: 'string', title: '助手名称', required: true },
      { name: 'type', type: 'select', title: '类型', options: ['方案助手', '报价助手', 'KPI助手', '采购助手', '规划助手', '工程助手'] },
      { name: 'model', type: 'select', title: '模型', options: ['internal', 'gemini-flash', 'gemini-pro', 'claude'] },
      { name: 'systemPrompt', type: 'text', title: '系统提示词' },
      { name: 'enabled', type: 'boolean', title: '启用' },
      { name: 'accessLevel', type: 'select', title: '访问级别', options: ['公开', '认证', '机密'] },
    ],
  },
  {
    name: 'ai_conversations',
    title: 'AI对话记录',
    fields: [
      { name: 'assistant', type: 'belongsTo', title: '助手', target: 'ai_assistants' },
      { name: 'user', type: 'belongsTo', title: '用户', target: 'employees' },
      { name: 'sessionId', type: 'string', title: '会话ID' },
      { name: 'message', type: 'text', title: '消息内容' },
      { name: 'role', type: 'select', title: '角色', options: ['user', 'assistant', 'system'] },
      { name: 'timestamp', type: 'datetime', title: '时间戳' },
    ],
  },
  
  // 监控模块
  {
    name: 'deadlock_records',
    title: '死锁记录',
    fields: [
      { name: 'detectedAt', type: 'datetime', title: '检测时间' },
      { name: 'resources', type: 'json', title: '涉及资源' },
      { name: 'cycle', type: 'json', title: '死锁环' },
      { name: 'resolvedAt', type: 'datetime', title: '解决时间' },
      { name: 'resolution', type: 'text', title: '解决方案' },
      { name: 'status', type: 'select', title: '状态', options: ['检测中', '已解决', '需人工处理'] },
    ],
  },
  {
    name: 'audit_logs',
    title: '审计日志',
    fields: [
      { name: 'user', type: 'belongsTo', title: '用户', target: 'employees' },
      { name: 'action', type: 'string', title: '操作' },
      { name: 'resource', type: 'string', title: '资源' },
      { name: 'resourceId', type: 'string', title: '资源ID' },
      { name: 'oldValue', type: 'json', title: '原值' },
      { name: 'newValue', type: 'json', title: '新值' },
      { name: 'ip', type: 'string', title: 'IP地址' },
      { name: 'timestamp', type: 'datetime', title: '时间戳' },
    ],
  },
];

// ============================================================================
// NocoBase Workflow 定义
// ============================================================================

const workflows = [
  {
    name: 'sales_process',
    title: '销售流程',
    trigger: { type: 'collection', collection: 'leads', event: 'create' },
    nodes: [
      { type: 'condition', title: 'BANT评分检查', config: { field: 'bantScore', operator: '>=', value: 70 } },
      { type: 'create', title: '创建商机', config: { collection: 'opportunities' } },
      { type: 'update', title: '更新线索状态', config: { collection: 'leads', field: 'status', value: '已转化' } },
      { type: 'notification', title: '通知销售', config: { type: 'email' } },
    ],
  },
  {
    name: 'project_gate_review',
    title: '项目门径评审',
    trigger: { type: 'collection', collection: 'project_phases', event: 'update' },
    nodes: [
      { type: 'condition', title: '检查阶段完成', config: { field: 'status', operator: '==', value: '已完成' } },
      { type: 'approval', title: '门径评审', config: { approvers: ['project_manager', 'quality_manager'] } },
      { type: 'update', title: '更新评审状态', config: { collection: 'project_phases', field: 'gateReviewStatus' } },
      { type: 'notification', title: '通知相关人员', config: { type: 'email' } },
    ],
  },
  {
    name: 'expense_approval',
    title: '费用审批',
    trigger: { type: 'collection', collection: 'cost_entries', event: 'create' },
    nodes: [
      { type: 'condition', title: '金额检查', config: { field: 'amount', operator: '>', value: 5000 } },
      { type: 'approval', title: '主管审批', config: { approvers: ['manager'] } },
      { type: 'condition', title: '大额检查', config: { field: 'amount', operator: '>', value: 50000 } },
      { type: 'approval', title: '财务总监审批', config: { approvers: ['cfo'] } },
      { type: 'update', title: '更新状态', config: { collection: 'cost_entries', field: 'status' } },
    ],
  },
  {
    name: 'deadlock_detection',
    title: '死锁检测',
    trigger: { type: 'schedule', cron: '*/5 * * * *' },
    nodes: [
      { type: 'script', title: '执行检测', config: { script: 'detectDeadlocks()' } },
      { type: 'condition', title: '检查结果', config: { field: 'hasDeadlock', operator: '==', value: true } },
      { type: 'create', title: '记录死锁', config: { collection: 'deadlock_records' } },
      { type: 'notification', title: '告警通知', config: { type: 'webhook', level: 'critical' } },
    ],
  },
];

// ============================================================================
// 导出函数
// ============================================================================

function exportCollections() {
  const outputDir = path.join(projectRoot, 'nocobase', 'collections');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const collection of collections) {
    const nocobaseCollection = {
      name: collection.name,
      title: collection.title,
      inherit: false,
      hidden: false,
      fields: collection.fields.map(field => ({
        name: field.name,
        type: mapFieldType(field.type),
        interface: mapFieldInterface(field.type),
        uiSchema: {
          title: field.title,
          'x-component': mapFieldComponent(field.type),
          ...(field.options ? { enum: field.options.map(o => ({ value: o, label: o })) } : {}),
        },
        ...(field.required ? { required: true } : {}),
        ...(field.unique ? { unique: true } : {}),
        ...(field.target ? { target: field.target } : {}),
      })),
    };
    
    const filePath = path.join(outputDir, `${collection.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(nocobaseCollection, null, 2));
    console.log(`  ✅ ${collection.title} (${collection.name})`);
  }
  
  // 导出合并文件
  const allCollections = collections.map(c => c.name);
  fs.writeFileSync(
    path.join(outputDir, '_all_collections.json'),
    JSON.stringify({ collections: allCollections }, null, 2)
  );
  console.log(`  📄 合并配置: _all_collections.json`);
}

function exportWorkflows() {
  const outputDir = path.join(projectRoot, 'nocobase', 'workflows');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const workflow of workflows) {
    const nocobaseWorkflow = {
      key: workflow.name,
      title: workflow.title,
      enabled: true,
      type: workflow.trigger.type === 'schedule' ? 'schedule' : 'collection',
      config: workflow.trigger,
      nodes: workflow.nodes.map((node, index) => ({
        id: `node_${index + 1}`,
        type: node.type,
        title: node.title,
        config: node.config,
      })),
    };
    
    const filePath = path.join(outputDir, `${workflow.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(nocobaseWorkflow, null, 2));
    console.log(`  ✅ ${workflow.title} (${workflow.name})`);
  }
  
  // 导出合并文件
  const allWorkflows = workflows.map(w => w.name);
  fs.writeFileSync(
    path.join(outputDir, '_all_workflows.json'),
    JSON.stringify({ workflows: allWorkflows }, null, 2)
  );
  console.log(`  📄 合并配置: _all_workflows.json`);
}

function mapFieldType(type) {
  const typeMap = {
    string: 'string',
    text: 'text',
    number: 'float',
    date: 'date',
    datetime: 'datetime',
    email: 'string',
    select: 'string',
    boolean: 'boolean',
    json: 'json',
    belongsTo: 'belongsTo',
  };
  return typeMap[type] || 'string';
}

function mapFieldInterface(type) {
  const interfaceMap = {
    string: 'input',
    text: 'textarea',
    number: 'number',
    date: 'datePicker',
    datetime: 'datetime',
    email: 'email',
    select: 'select',
    boolean: 'checkbox',
    json: 'json',
    belongsTo: 'linkTo',
  };
  return interfaceMap[type] || 'input';
}

function mapFieldComponent(type) {
  const componentMap = {
    string: 'Input',
    text: 'Input.TextArea',
    number: 'InputNumber',
    date: 'DatePicker',
    datetime: 'DatePicker',
    email: 'Input',
    select: 'Select',
    boolean: 'Checkbox',
    json: 'Input.TextArea',
    belongsTo: 'RecordPicker',
  };
  return componentMap[type] || 'Input';
}

function generateReadme() {
  const readme = `# GRT智能系统 NocoBase 配置

## 概述

本目录包含GRT智能系统导出的NocoBase配置文件，可用于在NocoBase中快速搭建系统。

## 目录结构

\`\`\`
nocobase/
├── collections/          # 数据模型配置
│   ├── customers.json    # 客户
│   ├── leads.json        # 线索
│   ├── opportunities.json # 商机
│   ├── projects.json     # 项目
│   ├── ...
│   └── _all_collections.json
├── workflows/            # 工作流配置
│   ├── sales_process.json
│   ├── project_gate_review.json
│   ├── expense_approval.json
│   ├── deadlock_detection.json
│   └── _all_workflows.json
└── README.md
\`\`\`

## 导入步骤

1. 登录NocoBase管理后台
2. 进入"数据表管理"
3. 点击"导入"，选择collections目录下的JSON文件
4. 进入"工作流管理"
5. 点击"导入"，选择workflows目录下的JSON文件

## Collection列表

| 名称 | 标题 | 说明 |
|------|------|------|
${collections.map(c => `| ${c.name} | ${c.title} | ${c.fields.length}个字段 |`).join('\n')}

## Workflow列表

| 名称 | 标题 | 触发方式 |
|------|------|----------|
${workflows.map(w => `| ${w.name} | ${w.title} | ${w.trigger.type} |`).join('\n')}

## 注意事项

1. 导入前请确保NocoBase版本兼容
2. 关联字段需要按顺序导入（先导入被引用的表）
3. 工作流中的脚本节点需要根据实际环境调整

## 生成时间

${new Date().toISOString()}
`;

  fs.writeFileSync(path.join(projectRoot, 'nocobase', 'README.md'), readme);
  console.log(`📝 生成README.md`);
}

// ============================================================================
// 主函数
// ============================================================================

function main() {
  console.log('🚀 开始导出GRT智能系统到NocoBase配置...\n');
  
  console.log('📦 导出数据模型配置...');
  exportCollections();
  
  console.log('\n⚙️ 导出工作流配置...');
  exportWorkflows();
  
  console.log('\n📝 生成README.md');
  generateReadme();
  
  console.log('\n✨ 导出完成！');
  console.log(`   输出目录: ${path.join(projectRoot, 'nocobase')}`);
  console.log(`   Collection数量: ${collections.length}`);
  console.log(`   Workflow数量: ${workflows.length}`);
}

main();
