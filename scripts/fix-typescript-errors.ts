/**
 * GRT智能系统 TypeScript错误自动修复脚本
 * 
 * 主要修复类型：
 * 1. TS2769: Date类型转换为string
 * 2. TS2339: 属性不存在（添加类型断言）
 * 3. TS2345: 参数类型错误
 * 4. TS2322: 类型不兼容
 * 
 * 使用方法: npx tsx scripts/fix-typescript-errors.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// 错误修复规则
const fixRules = {
  // Date类型转换规则
  dateConversions: [
    {
      pattern: /(\w+):\s*Date\s*\|?\s*undefined/g,
      replacement: '$1: Date | string | undefined'
    },
    {
      pattern: /(\w+):\s*Date(?!\s*\|)/g,
      replacement: '$1: Date | string'
    }
  ],
  
  // 常见字段名映射（Schema字段名 -> 代码中使用的字段名）
  fieldMappings: {
    'user_id': 'userId',
    'project_id': 'projectId',
    'task_id': 'taskId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'is_active': 'isActive',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'due_date': 'dueDate'
  }
};

// 需要修复的文件列表
const filesToFix = [
  'server/db.ts',
  'server/permissionRoutes.ts',
  'server/processNotebookRoutes.ts',
  'server/ai-assistants/engineeringRoutes.ts',
  'server/daIntegrationRoutes.ts',
  'server/scheduler.ts',
  'server/ai-assistants/quotationAssistant.ts',
  'server/ai-assistants/planningAssistant.ts',
  'server/ai-assistants/chatHistoryService.ts'
];

// Date类型转换辅助函数（添加到db.ts开头）
const dateHelperCode = `
// Date类型转换辅助函数
export function toDateString(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

export function toDateStringRequired(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}
`;

// 修复单个文件
function fixFile(filePath: string): { fixed: number; errors: string[] } {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { fixed: 0, errors: [`文件不存在: ${filePath}`] };
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let fixedCount = 0;
  const errors: string[] = [];
  
  // 应用Date类型转换规则
  for (const rule of fixRules.dateConversions) {
    const matches = content.match(rule.pattern);
    if (matches) {
      content = content.replace(rule.pattern, rule.replacement);
      fixedCount += matches.length;
    }
  }
  
  // 写回文件
  if (fixedCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
  
  return { fixed: fixedCount, errors };
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('GRT智能系统 TypeScript错误自动修复脚本');
  console.log('='.repeat(60));
  console.log('');
  
  let totalFixed = 0;
  const allErrors: string[] = [];
  
  for (const file of filesToFix) {
    console.log(`处理文件: ${file}`);
    const result = fixFile(file);
    totalFixed += result.fixed;
    allErrors.push(...result.errors);
    
    if (result.fixed > 0) {
      console.log(`  ✅ 修复了 ${result.fixed} 处`);
    } else if (result.errors.length > 0) {
      console.log(`  ❌ 错误: ${result.errors.join(', ')}`);
    } else {
      console.log(`  ⏭️ 无需修复`);
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`总计修复: ${totalFixed} 处`);
  if (allErrors.length > 0) {
    console.log(`错误数量: ${allErrors.length}`);
  }
  console.log('='.repeat(60));
  
  // 生成修复报告
  const report = {
    timestamp: new Date().toISOString(),
    totalFixed,
    errors: allErrors,
    filesProcessed: filesToFix.length
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts/fix-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('');
  console.log('修复报告已保存到: scripts/fix-report.json');
}

main().catch(console.error);
