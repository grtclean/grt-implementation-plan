/**
 * 批量修复tRPC返回值数组访问问题
 * 问题：后端返回 { candidates: [] } 但前端直接调用 data?.filter()
 * 修复：改为 data?.candidates?.filter() 或使用安全的数组访问
 */

const fs = require('fs');
const path = require('path');

// 需要修复的映射关系：路由方法 -> 返回的数组属性名
const routeToArrayProp = {
  'getCandidates': 'candidates',
  'getPositions': 'positions',
  'getSalaryStructures': 'structures',
  'getPerformanceGrades': 'grades',
  'getMeetings': 'meetings',
  'getMembers': 'members',
  'getTasks': 'tasks',
  'getLogs': 'logs',
  'getAlerts': 'alerts',
  'getMessages': 'messages',
  'getGateDefinitions': 'definitions',
  'getGateReviews': 'reviews',
  'getQCRecords': 'records',
  'getRecords': 'records',
  'getTrainingRecords': 'records',
  'getItems': 'items',
  'getUpcoming': 'items',
  'getUpdateLogs': 'logs',
  'getCABMembers': 'members',
  'getAuditLogs': 'logs',
  'getProjectLogs': 'logs',
  'getWorkHourAlerts': 'alerts',
  'getRecentLogs': 'logs',
  'getProjects': 'projects',
  'getHistory': 'messages',
  'search': 'results',
  'getAll': 'users',
  'getPendingMessages': 'messages',
};

// 需要检查的文件
const filesToCheck = [
  'HRMIntelligent.tsx',
  'QCManagement.tsx',
  'AgendaManagement.tsx',
  'Community.tsx',
  'ComplianceDashboard.tsx',
  'HRLifecycle.tsx',
  'RedBlueBoard.tsx',
  'SchedulerManagement.tsx',
  'SocialCommunity.tsx',
  'WebhookManagement.tsx',
  'WebhookSettings.tsx',
  'AIAssistantHub.tsx',
];

const pagesDir = path.join(__dirname, 'client/src/pages');

filesToCheck.forEach(filename => {
  const filepath = path.join(pagesDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;
  
  // 检查每个路由方法
  Object.entries(routeToArrayProp).forEach(([method, prop]) => {
    // 匹配模式: xxx.data?.filter 或 xxx.data?.map 等
    const patterns = [
      // 直接对data调用数组方法
      new RegExp(`(\\w+)\\.data\\?\\.filter`, 'g'),
      new RegExp(`(\\w+)\\.data\\?\\.map`, 'g'),
      new RegExp(`(\\w+)\\.data\\?\\.length`, 'g'),
      new RegExp(`(\\w+)\\.data\\?\\.slice`, 'g'),
      new RegExp(`(\\w+)\\.data\\?\\.find`, 'g'),
    ];
    
    // 检查文件是否使用了这个方法
    if (content.includes(method)) {
      console.log(`${filename} uses ${method} -> should access .${prop}`);
    }
  });
});

console.log('\\nAnalysis complete. Manual fixes may be needed.');
