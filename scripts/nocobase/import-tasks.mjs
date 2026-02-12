#!/usr/bin/env node
/**
 * NocoBase AI助手任务导入工具
 * 
 * 使用方法:
 *   node import-tasks.mjs --url http://localhost:13000 --token YOUR_API_TOKEN
 * 
 * 环境变量:
 *   NOCOBASE_URL - NocoBase服务地址
 *   NOCOBASE_TOKEN - API访问令牌
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
};

const NOCOBASE_URL = getArg('url') || process.env.NOCOBASE_URL || 'http://localhost:13000';
const NOCOBASE_TOKEN = getArg('token') || process.env.NOCOBASE_TOKEN;

// 17个AI助手开发任务
const AI_ASSISTANT_TASKS = [
  {
    taskId: "T001",
    phase: "Phase 1",
    name: "Solution Assistant基础架构",
    priority: "P0",
    status: "待开始",
    assignee: "开发团队",
    estimatedHours: 40,
    description: "实现方案助手的基础对话功能和知识库集成",
    acceptanceCriteria: [
      "能够接收用户输入的产品需求",
      "能够查询历史方案数据库",
      "能够生成初步方案建议",
      "支持多轮对话交互"
    ],
    dependencies: []
  },
  {
    taskId: "T002",
    phase: "Phase 1",
    name: "Quotation Assistant基础架构",
    priority: "P0",
    status: "待开始",
    assignee: "开发团队",
    estimatedHours: 40,
    description: "实现报价助手的成本计算和报价生成功能",
    acceptanceCriteria: [
      "能够计算BOM成本",
      "能够计算人工成本",
      "能够生成报价单",
      "支持多种报价模板"
    ],
    dependencies: ["T001"]
  },
  {
    taskId: "T003",
    phase: "Phase 1",
    name: "Planning Assistant基础架构",
    priority: "P0",
    status: "待开始",
    assignee: "开发团队",
    estimatedHours: 40,
    description: "实现计划助手的任务分解和进度规划功能",
    acceptanceCriteria: [
      "能够分解项目任务",
      "能够估算任务工时",
      "能够生成甘特图数据",
      "支持资源分配建议"
    ],
    dependencies: []
  },
  {
    taskId: "T004",
    phase: "Phase 1",
    name: "KPI Assistant基础架构",
    priority: "P0",
    status: "待开始",
    assignee: "开发团队",
    estimatedHours: 40,
    description: "实现KPI助手的绩效分析和评分功能",
    acceptanceCriteria: [
      "能够采集KPI数据",
      "能够计算绩效得分",
      "能够生成趋势分析",
      "支持多维度评估"
    ],
    dependencies: []
  },
  {
    taskId: "T005",
    phase: "Phase 2",
    name: "历史案例学习模块",
    priority: "P1",
    status: "待开始",
    assignee: "AI团队",
    estimatedHours: 60,
    description: "实现从历史项目中学习的机器学习模块",
    acceptanceCriteria: [
      "能够解析历史项目数据",
      "能够提取关键特征",
      "能够建立相似度模型",
      "支持增量学习"
    ],
    dependencies: ["T001", "T002", "T003", "T004"]
  },
  {
    taskId: "T006",
    phase: "Phase 2",
    name: "方案推荐引擎",
    priority: "P1",
    status: "待开始",
    assignee: "AI团队",
    estimatedHours: 50,
    description: "基于客户需求的智能方案推荐算法",
    acceptanceCriteria: [
      "能够匹配客户需求",
      "能够推荐相似方案",
      "能够解释推荐理由",
      "推荐准确率>80%"
    ],
    dependencies: ["T005"]
  },
  {
    taskId: "T007",
    phase: "Phase 2",
    name: "报价优化算法",
    priority: "P1",
    status: "待开始",
    assignee: "AI团队",
    estimatedHours: 50,
    description: "成本优化和竞争力分析的报价算法",
    acceptanceCriteria: [
      "能够分析成本结构",
      "能够建议优化方向",
      "能够评估竞争力",
      "支持利润率目标设定"
    ],
    dependencies: ["T005"]
  },
  {
    taskId: "T008",
    phase: "Phase 2",
    name: "计划生成器",
    priority: "P1",
    status: "待开始",
    assignee: "AI团队",
    estimatedHours: 50,
    description: "自动生成项目计划和里程碑的模块",
    acceptanceCriteria: [
      "能够生成标准项目计划",
      "能够设置关键里程碑",
      "能够识别关键路径",
      "支持计划调整建议"
    ],
    dependencies: ["T005"]
  },
  {
    taskId: "T009",
    phase: "Phase 3",
    name: "多源数据集成",
    priority: "P1",
    status: "待开始",
    assignee: "后端团队",
    estimatedHours: 60,
    description: "集成ERP、CRM等多个数据源",
    acceptanceCriteria: [
      "支持ERP数据同步",
      "支持CRM数据同步",
      "支持简道云数据同步",
      "数据一致性保证"
    ],
    dependencies: ["T006", "T007", "T008"]
  },
  {
    taskId: "T010",
    phase: "Phase 3",
    name: "实时追踪模块",
    priority: "P1",
    status: "待开始",
    assignee: "后端团队",
    estimatedHours: 50,
    description: "项目进度和任务状态的实时追踪",
    acceptanceCriteria: [
      "支持实时进度更新",
      "支持任务状态变更",
      "支持延期预警",
      "支持移动端推送"
    ],
    dependencies: ["T009"]
  },
  {
    taskId: "T011",
    phase: "Phase 3",
    name: "KPI评分系统",
    priority: "P1",
    status: "待开始",
    assignee: "后端团队",
    estimatedHours: 50,
    description: "多维度KPI评分和趋势分析系统",
    acceptanceCriteria: [
      "支持日/周/月评分",
      "支持多维度分析",
      "支持趋势预测",
      "支持对比分析"
    ],
    dependencies: ["T009"]
  },
  {
    taskId: "T012",
    phase: "Phase 3",
    name: "通知调度器",
    priority: "P1",
    status: "待开始",
    assignee: "后端团队",
    estimatedHours: 40,
    description: "智能通知时间优化和多渠道分发",
    acceptanceCriteria: [
      "支持邮件通知",
      "支持站内消息",
      "支持时间优化",
      "支持确认回执"
    ],
    dependencies: ["T010", "T011"]
  },
  {
    taskId: "T013",
    phase: "Phase 4",
    name: "AI对话界面",
    priority: "P2",
    status: "待开始",
    assignee: "前端团队",
    estimatedHours: 60,
    description: "统一的AI助手对话界面和交互设计",
    acceptanceCriteria: [
      "支持多助手切换",
      "支持历史对话查看",
      "支持Markdown渲染",
      "支持移动端适配"
    ],
    dependencies: ["T012"]
  },
  {
    taskId: "T014",
    phase: "Phase 4",
    name: "反馈学习系统",
    priority: "P2",
    status: "待开始",
    assignee: "AI团队",
    estimatedHours: 50,
    description: "用户反馈收集和模型持续优化",
    acceptanceCriteria: [
      "支持点赞/点踩反馈",
      "支持文字评价",
      "支持反馈分析",
      "支持模型更新"
    ],
    dependencies: ["T013"]
  },
  {
    taskId: "T015",
    phase: "Phase 4",
    name: "报告生成器",
    priority: "P2",
    status: "待开始",
    assignee: "前端团队",
    estimatedHours: 50,
    description: "自动生成分析报告和可视化图表",
    acceptanceCriteria: [
      "支持PDF导出",
      "支持Excel导出",
      "支持图表生成",
      "支持模板定制"
    ],
    dependencies: ["T013"]
  },
  {
    taskId: "T016",
    phase: "Phase 5",
    name: "系统集成测试",
    priority: "P2",
    status: "待开始",
    assignee: "测试团队",
    estimatedHours: 40,
    description: "端到端测试和性能压力测试",
    acceptanceCriteria: [
      "功能测试覆盖率>90%",
      "性能测试通过",
      "安全测试通过",
      "兼容性测试通过"
    ],
    dependencies: ["T014", "T015"]
  },
  {
    taskId: "T017",
    phase: "Phase 5",
    name: "用户培训材料",
    priority: "P2",
    status: "待开始",
    assignee: "产品团队",
    estimatedHours: 30,
    description: "用户手册、视频教程和培训文档",
    acceptanceCriteria: [
      "用户手册完成",
      "视频教程录制",
      "FAQ文档完成",
      "培训PPT完成"
    ],
    dependencies: ["T016"]
  }
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

// API请求函数
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${NOCOBASE_URL}/api/${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NOCOBASE_TOKEN}`
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// 检查连接
async function checkConnection() {
  log.info(`检查NocoBase连接: ${NOCOBASE_URL}`);
  try {
    const response = await fetch(`${NOCOBASE_URL}/api/app:getLang`);
    if (response.ok) {
      log.success('NocoBase连接正常');
      return true;
    }
  } catch (error) {
    log.error(`无法连接到NocoBase: ${error.message}`);
  }
  return false;
}

// 导出任务到JSON文件
function exportToJson() {
  const outputPath = path.join(__dirname, 'ai-assistant-tasks.json');
  fs.writeFileSync(outputPath, JSON.stringify(AI_ASSISTANT_TASKS, null, 2), 'utf8');
  log.success(`任务已导出到: ${outputPath}`);
  return outputPath;
}

// 生成CSV文件
function exportToCsv() {
  const headers = ['任务ID', '阶段', '名称', '优先级', '状态', '负责人', '预估工时', '描述'];
  const rows = AI_ASSISTANT_TASKS.map(task => [
    task.taskId,
    task.phase,
    task.name,
    task.priority,
    task.status,
    task.assignee,
    task.estimatedHours,
    task.description
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const outputPath = path.join(__dirname, 'ai-assistant-tasks.csv');
  fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8'); // BOM for Excel
  log.success(`任务已导出到: ${outputPath}`);
  return outputPath;
}

// 生成看板视图配置
function generateKanbanConfig() {
  const config = {
    name: "AI助手开发任务看板",
    collection: "ai_assistant_tasks",
    view: "kanban",
    groupField: "status",
    groups: [
      { value: "待开始", color: "#808080" },
      { value: "进行中", color: "#1890ff" },
      { value: "待验收", color: "#faad14" },
      { value: "已完成", color: "#52c41a" },
      { value: "已取消", color: "#ff4d4f" }
    ],
    sortField: "priority",
    cardFields: ["taskId", "name", "assignee", "priority", "phase"],
    filters: []
  };
  
  const outputPath = path.join(__dirname, 'kanban-config.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
  log.success(`看板配置已导出到: ${outputPath}`);
  return outputPath;
}

// 主函数
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        NocoBase AI助手任务导入工具 v1.0                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // 导出文件
  log.info('生成任务数据文件...');
  exportToJson();
  exportToCsv();
  generateKanbanConfig();
  
  console.log('');
  log.info(`共 ${AI_ASSISTANT_TASKS.length} 个任务`);
  
  // 按阶段统计
  const phaseStats = AI_ASSISTANT_TASKS.reduce((acc, task) => {
    acc[task.phase] = (acc[task.phase] || 0) + 1;
    return acc;
  }, {});
  
  console.log('');
  console.log('任务分布:');
  Object.entries(phaseStats).forEach(([phase, count]) => {
    console.log(`  ${phase}: ${count} 个任务`);
  });
  
  // 计算总工时
  const totalHours = AI_ASSISTANT_TASKS.reduce((sum, task) => sum + task.estimatedHours, 0);
  console.log('');
  console.log(`总预估工时: ${totalHours} 小时 (约 ${Math.ceil(totalHours / 8)} 人天)`);
  
  // 检查NocoBase连接
  if (NOCOBASE_TOKEN) {
    console.log('');
    const connected = await checkConnection();
    if (connected) {
      log.info('可以通过API导入任务');
      log.warning('API导入功能需要在NocoBase中先创建数据表');
    }
  } else {
    console.log('');
    log.warning('未提供API Token，跳过在线导入');
    log.info('请手动在NocoBase中导入生成的CSV或JSON文件');
  }
  
  console.log('');
  console.log('导入步骤:');
  console.log('1. 登录NocoBase管理界面');
  console.log('2. 创建"AI助手任务"数据表');
  console.log('3. 使用数据导入功能导入 ai-assistant-tasks.csv');
  console.log('4. 创建看板视图，使用 kanban-config.json 配置');
  console.log('');
}

main().catch(console.error);
