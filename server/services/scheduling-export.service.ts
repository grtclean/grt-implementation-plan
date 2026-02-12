/**
 * 排程结果导出服务
 * 支持Excel和PDF格式导出
 */

import ExcelJS from 'exceljs';

// 排程任务类型
export interface SchedulingTaskExport {
  id: string;
  taskName: string;
  projectId: string;
  projectName: string;
  buCode: string;
  taskType: string;
  estimatedHours: number;
  priority: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  assignedResource?: string;
  status: string;
}

// 资源分配类型
export interface ResourceAllocationExport {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  buCode: string;
  allocatedTasks: {
    taskId: string;
    taskName: string;
    startTime: Date;
    endTime: Date;
    utilizationRate: number;
  }[];
  totalUtilization: number;
}

// 甘特图数据类型
export interface GanttDataExport {
  tasks: {
    id: string;
    name: string;
    start: Date;
    end: Date;
    progress: number;
    dependencies: string[];
    resource: string;
    bu: string;
  }[];
  resources: {
    id: string;
    name: string;
    type: string;
  }[];
  projectInfo: {
    name: string;
    startDate: Date;
    endDate: Date;
    totalTasks: number;
    completedTasks: number;
  };
}

/**
 * 导出排程结果为Excel
 */
export async function exportSchedulingToExcel(
  tasks: SchedulingTaskExport[],
  allocations: ResourceAllocationExport[],
  ganttData: GanttDataExport
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GRT智能排程系统';
  workbook.created = new Date();

  // 1. 项目概览Sheet
  const overviewSheet = workbook.addWorksheet('项目概览');
  overviewSheet.columns = [
    { header: '项目信息', key: 'label', width: 20 },
    { header: '值', key: 'value', width: 40 },
  ];
  
  overviewSheet.addRows([
    { label: '项目名称', value: ganttData.projectInfo.name },
    { label: '开始日期', value: formatDate(ganttData.projectInfo.startDate) },
    { label: '结束日期', value: formatDate(ganttData.projectInfo.endDate) },
    { label: '总任务数', value: ganttData.projectInfo.totalTasks },
    { label: '已完成任务', value: ganttData.projectInfo.completedTasks },
    { label: '完成率', value: `${((ganttData.projectInfo.completedTasks / ganttData.projectInfo.totalTasks) * 100).toFixed(1)}%` },
    { label: '导出时间', value: formatDateTime(new Date()) },
  ]);

  // 设置标题行样式
  overviewSheet.getRow(1).font = { bold: true };
  overviewSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  overviewSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // 2. 任务列表Sheet
  const tasksSheet = workbook.addWorksheet('任务列表');
  tasksSheet.columns = [
    { header: '任务ID', key: 'id', width: 15 },
    { header: '任务名称', key: 'taskName', width: 30 },
    { header: '项目', key: 'projectName', width: 25 },
    { header: 'BU', key: 'buCode', width: 10 },
    { header: '任务类型', key: 'taskType', width: 15 },
    { header: '预估工时(h)', key: 'estimatedHours', width: 12 },
    { header: '优先级', key: 'priority', width: 10 },
    { header: '计划开始', key: 'scheduledStart', width: 18 },
    { header: '计划结束', key: 'scheduledEnd', width: 18 },
    { header: '分配资源', key: 'assignedResource', width: 20 },
    { header: '状态', key: 'status', width: 12 },
  ];

  tasks.forEach(task => {
    tasksSheet.addRow({
      ...task,
      scheduledStart: task.scheduledStart ? formatDateTime(task.scheduledStart) : '-',
      scheduledEnd: task.scheduledEnd ? formatDateTime(task.scheduledEnd) : '-',
      assignedResource: task.assignedResource || '-',
    });
  });

  // 设置标题行样式
  tasksSheet.getRow(1).font = { bold: true };
  tasksSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  tasksSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // 添加条件格式（按状态着色）
  tasks.forEach((task, index) => {
    const row = tasksSheet.getRow(index + 2);
    if (task.status === 'completed') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' },
      };
    } else if (task.status === 'in_progress') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC000' },
      };
    } else if (task.status === 'delayed') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' },
      };
    }
  });

  // 3. 资源分配Sheet
  const resourcesSheet = workbook.addWorksheet('资源分配');
  resourcesSheet.columns = [
    { header: '资源ID', key: 'resourceId', width: 15 },
    { header: '资源名称', key: 'resourceName', width: 25 },
    { header: '资源类型', key: 'resourceType', width: 15 },
    { header: 'BU', key: 'buCode', width: 10 },
    { header: '分配任务数', key: 'taskCount', width: 12 },
    { header: '总利用率', key: 'totalUtilization', width: 12 },
  ];

  allocations.forEach(allocation => {
    resourcesSheet.addRow({
      resourceId: allocation.resourceId,
      resourceName: allocation.resourceName,
      resourceType: getResourceTypeLabel(allocation.resourceType),
      buCode: allocation.buCode,
      taskCount: allocation.allocatedTasks.length,
      totalUtilization: `${(allocation.totalUtilization * 100).toFixed(1)}%`,
    });
  });

  // 设置标题行样式
  resourcesSheet.getRow(1).font = { bold: true };
  resourcesSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  resourcesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // 4. 甘特图数据Sheet
  const ganttSheet = workbook.addWorksheet('甘特图数据');
  ganttSheet.columns = [
    { header: '任务ID', key: 'id', width: 15 },
    { header: '任务名称', key: 'name', width: 30 },
    { header: '开始时间', key: 'start', width: 18 },
    { header: '结束时间', key: 'end', width: 18 },
    { header: '进度(%)', key: 'progress', width: 10 },
    { header: '依赖任务', key: 'dependencies', width: 25 },
    { header: '分配资源', key: 'resource', width: 20 },
    { header: 'BU', key: 'bu', width: 10 },
  ];

  ganttData.tasks.forEach(task => {
    ganttSheet.addRow({
      id: task.id,
      name: task.name,
      start: formatDateTime(task.start),
      end: formatDateTime(task.end),
      progress: task.progress,
      dependencies: task.dependencies.join(', ') || '-',
      resource: task.resource,
      bu: task.bu,
    });
  });

  // 设置标题行样式
  ganttSheet.getRow(1).font = { bold: true };
  ganttSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  ganttSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // 5. BU统计Sheet
  const buStatsSheet = workbook.addWorksheet('BU统计');
  buStatsSheet.columns = [
    { header: 'BU', key: 'bu', width: 15 },
    { header: '任务数', key: 'taskCount', width: 12 },
    { header: '总工时(h)', key: 'totalHours', width: 12 },
    { header: '资源数', key: 'resourceCount', width: 12 },
    { header: '平均利用率', key: 'avgUtilization', width: 15 },
  ];

  const buStats = calculateBUStats(tasks, allocations);
  buStats.forEach(stat => {
    buStatsSheet.addRow(stat);
  });

  // 设置标题行样式
  buStatsSheet.getRow(1).font = { bold: true };
  buStatsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  buStatsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // 生成Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 生成PDF导出数据（返回HTML用于PDF转换）
 */
export function generateSchedulingPDFContent(
  tasks: SchedulingTaskExport[],
  allocations: ResourceAllocationExport[],
  ganttData: GanttDataExport
): string {
  const buStats = calculateBUStats(tasks, allocations);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>排程报告 - ${ganttData.projectInfo.name}</title>
  <style>
    body {
      font-family: 'Microsoft YaHei', Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #1a365d;
      border-bottom: 3px solid #3182ce;
      padding-bottom: 10px;
    }
    h2 {
      color: #2c5282;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #3182ce;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f7fafc;
    }
    .summary-card {
      display: inline-block;
      width: 22%;
      margin: 1%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: bold;
    }
    .summary-card .label {
      font-size: 14px;
      opacity: 0.9;
    }
    .gantt-container {
      margin: 20px 0;
      overflow-x: auto;
    }
    .gantt-bar {
      height: 30px;
      background: linear-gradient(90deg, #4299e1, #3182ce);
      border-radius: 4px;
      margin: 5px 0;
      position: relative;
    }
    .gantt-bar .label {
      position: absolute;
      left: 10px;
      top: 5px;
      color: white;
      font-size: 12px;
    }
    .status-completed { background-color: #48bb78; }
    .status-in_progress { background-color: #ecc94b; }
    .status-pending { background-color: #a0aec0; }
    .status-delayed { background-color: #fc8181; }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #718096;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>📊 智能排程报告</h1>
  <p><strong>项目：</strong>${ganttData.projectInfo.name}</p>
  <p><strong>报告生成时间：</strong>${formatDateTime(new Date())}</p>

  <h2>📈 项目概览</h2>
  <div>
    <div class="summary-card">
      <div class="value">${ganttData.projectInfo.totalTasks}</div>
      <div class="label">总任务数</div>
    </div>
    <div class="summary-card">
      <div class="value">${ganttData.projectInfo.completedTasks}</div>
      <div class="label">已完成</div>
    </div>
    <div class="summary-card">
      <div class="value">${((ganttData.projectInfo.completedTasks / ganttData.projectInfo.totalTasks) * 100).toFixed(0)}%</div>
      <div class="label">完成率</div>
    </div>
    <div class="summary-card">
      <div class="value">${allocations.length}</div>
      <div class="label">资源数</div>
    </div>
  </div>

  <h2>📋 任务列表</h2>
  <table>
    <thead>
      <tr>
        <th>任务名称</th>
        <th>BU</th>
        <th>类型</th>
        <th>工时(h)</th>
        <th>计划开始</th>
        <th>计划结束</th>
        <th>状态</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.map(task => `
        <tr>
          <td>${task.taskName}</td>
          <td>${task.buCode}</td>
          <td>${getTaskTypeLabel(task.taskType)}</td>
          <td>${task.estimatedHours}</td>
          <td>${task.scheduledStart ? formatDate(task.scheduledStart) : '-'}</td>
          <td>${task.scheduledEnd ? formatDate(task.scheduledEnd) : '-'}</td>
          <td class="status-${task.status}">${getStatusLabel(task.status)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>👥 资源分配</h2>
  <table>
    <thead>
      <tr>
        <th>资源名称</th>
        <th>类型</th>
        <th>BU</th>
        <th>分配任务数</th>
        <th>利用率</th>
      </tr>
    </thead>
    <tbody>
      ${allocations.map(alloc => `
        <tr>
          <td>${alloc.resourceName}</td>
          <td>${getResourceTypeLabel(alloc.resourceType)}</td>
          <td>${alloc.buCode}</td>
          <td>${alloc.allocatedTasks.length}</td>
          <td>${(alloc.totalUtilization * 100).toFixed(1)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>🏭 BU统计</h2>
  <table>
    <thead>
      <tr>
        <th>BU</th>
        <th>任务数</th>
        <th>总工时(h)</th>
        <th>资源数</th>
        <th>平均利用率</th>
      </tr>
    </thead>
    <tbody>
      ${buStats.map(stat => `
        <tr>
          <td>${stat.bu}</td>
          <td>${stat.taskCount}</td>
          <td>${stat.totalHours}</td>
          <td>${stat.resourceCount}</td>
          <td>${stat.avgUtilization}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>📅 甘特图数据</h2>
  <div class="gantt-container">
    ${ganttData.tasks.slice(0, 20).map(task => `
      <div style="display: flex; align-items: center; margin: 5px 0;">
        <div style="width: 200px; font-size: 12px;">${task.name}</div>
        <div class="gantt-bar" style="width: ${Math.max(50, task.progress * 3)}px;">
          <span class="label">${task.progress}%</span>
        </div>
      </div>
    `).join('')}
    ${ganttData.tasks.length > 20 ? `<p>... 还有 ${ganttData.tasks.length - 20} 个任务</p>` : ''}
  </div>

  <div class="footer">
    <p>GRT智能排程系统 | 报告自动生成</p>
    <p>© ${new Date().getFullYear()} GRT Industrial Solutions</p>
  </div>
</body>
</html>
  `;
}

/**
 * 导出为CSV格式
 */
export function exportSchedulingToCSV(tasks: SchedulingTaskExport[]): string {
  const headers = [
    '任务ID',
    '任务名称',
    '项目',
    'BU',
    '任务类型',
    '预估工时(h)',
    '优先级',
    '计划开始',
    '计划结束',
    '分配资源',
    '状态',
  ];

  const rows = tasks.map(task => [
    task.id,
    task.taskName,
    task.projectName,
    task.buCode,
    task.taskType,
    task.estimatedHours.toString(),
    task.priority.toString(),
    task.scheduledStart ? formatDateTime(task.scheduledStart) : '',
    task.scheduledEnd ? formatDateTime(task.scheduledEnd) : '',
    task.assignedResource || '',
    task.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// 辅助函数
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    machining: '机加工',
    welding: '焊接',
    assembly: '总装',
    debugging: '调试',
    testing: '测试',
  };
  return labels[type] || type;
}

function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    employee: '员工',
    equipment: '设备',
    workstation: '工位',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    delayed: '已延期',
  };
  return labels[status] || status;
}

function calculateBUStats(
  tasks: SchedulingTaskExport[],
  allocations: ResourceAllocationExport[]
): { bu: string; taskCount: number; totalHours: number; resourceCount: number; avgUtilization: string }[] {
  const buMap = new Map<string, { taskCount: number; totalHours: number; resourceCount: number; totalUtilization: number }>();

  // 统计任务
  tasks.forEach(task => {
    const existing = buMap.get(task.buCode) || { taskCount: 0, totalHours: 0, resourceCount: 0, totalUtilization: 0 };
    existing.taskCount++;
    existing.totalHours += task.estimatedHours;
    buMap.set(task.buCode, existing);
  });

  // 统计资源
  allocations.forEach(alloc => {
    const existing = buMap.get(alloc.buCode) || { taskCount: 0, totalHours: 0, resourceCount: 0, totalUtilization: 0 };
    existing.resourceCount++;
    existing.totalUtilization += alloc.totalUtilization;
    buMap.set(alloc.buCode, existing);
  });

  return Array.from(buMap.entries()).map(([bu, stats]) => ({
    bu,
    taskCount: stats.taskCount,
    totalHours: stats.totalHours,
    resourceCount: stats.resourceCount,
    avgUtilization: stats.resourceCount > 0 
      ? `${((stats.totalUtilization / stats.resourceCount) * 100).toFixed(1)}%` 
      : '0%',
  }));
}
