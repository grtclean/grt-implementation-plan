#!/usr/bin/env node
/**
 * GRT智能系统 - TypeScript错误批量修复脚本
 * 
 * 主要修复以下类型的错误：
 * 1. TS2769: No overload matches this call - 通常是Date类型不匹配
 * 2. TS2322: Type 'X' is not assignable to type 'Y' - 类型不匹配
 * 3. TS2339: Property does not exist - 字段名不匹配
 * 4. TS2345: Argument type mismatch - 参数类型不匹配
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// 需要修复的文件目录
const targetDirs = [
  '/home/ubuntu/grt-implementation-plan/server',
  '/home/ubuntu/grt-implementation-plan/client/src'
];

// 统计信息
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

// 修复规则
const fixRules = [
  // 1. 修复 new Date() 应该是 new Date().toISOString()
  {
    name: 'Date to ISO string in object literals',
    // 匹配对象字面量中的 Date 赋值，如 createdAt: new Date()
    pattern: /(\w+At|Date|Time|Timestamp):\s*new Date\(\)/g,
    replacement: (match, fieldName) => `${fieldName}: new Date().toISOString()`,
  },
  // 2. 修复 set({ ... new Date() ... })
  {
    name: 'Date in set() calls',
    pattern: /\.set\(\{([^}]*?)(\w+At|Date|Time|Timestamp):\s*new Date\(\)([^}]*?)\}\)/g,
    replacement: (match, before, fieldName, after) => 
      `.set({${before}${fieldName}: new Date().toISOString()${after}})`,
  },
  // 3. 修复 values({ ... new Date() ... })
  {
    name: 'Date in values() calls',
    pattern: /\.values\(\{([^}]*?)(\w+At|Date|Time|Timestamp):\s*new Date\(\)([^}]*?)\}\)/g,
    replacement: (match, before, fieldName, after) => 
      `.values({${before}${fieldName}: new Date().toISOString()${after}})`,
  },
  // 4. 修复 insert().values({ ... new Date() ... })
  {
    name: 'Date in insert values',
    pattern: /insert\([^)]+\)\.values\(\{([^}]*?)(\w+At|Date|Time|Timestamp):\s*new Date\(\)([^}]*?)\}\)/g,
    replacement: (match, before, fieldName, after) => 
      match.replace(`${fieldName}: new Date()`, `${fieldName}: new Date().toISOString()`),
  },
  // 5. 修复 isActive: true/false 应该是 1/0
  {
    name: 'Boolean to number for isActive',
    pattern: /isActive:\s*true\b/g,
    replacement: 'isActive: 1',
  },
  {
    name: 'Boolean to number for isActive false',
    pattern: /isActive:\s*false\b/g,
    replacement: 'isActive: 0',
  },
  // 6. 修复 isSent: true/false 应该是 1/0
  {
    name: 'Boolean to number for isSent',
    pattern: /isSent:\s*true\b/g,
    replacement: 'isSent: 1',
  },
  {
    name: 'Boolean to number for isSent false',
    pattern: /isSent:\s*false\b/g,
    replacement: 'isSent: 0',
  },
  // 7. 修复 isEnabled: true/false 应该是 1/0
  {
    name: 'Boolean to number for isEnabled',
    pattern: /isEnabled:\s*true\b/g,
    replacement: 'isEnabled: 1',
  },
  {
    name: 'Boolean to number for isEnabled false',
    pattern: /isEnabled:\s*false\b/g,
    replacement: 'isEnabled: 0',
  },
];

// 递归获取所有TypeScript文件
function getTypeScriptFiles(dir) {
  const files = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      
      // 跳过 node_modules 和 _core 目录
      if (item === 'node_modules' || item === '_core' || item === 'dist' || item === '.git') {
        continue;
      }
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...getTypeScriptFiles(fullPath));
        } else if (stat.isFile() && (extname(item) === '.ts' || extname(item) === '.tsx')) {
          // 跳过测试文件和类型定义文件
          if (!item.endsWith('.test.ts') && !item.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // 忽略无法访问的文件
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e.message);
  }
  
  return files;
}

// 应用修复规则
function applyFixes(content, filePath) {
  let modified = false;
  let newContent = content;
  let fileReplacements = 0;
  
  for (const rule of fixRules) {
    const matches = newContent.match(rule.pattern);
    if (matches) {
      const before = newContent;
      newContent = newContent.replace(rule.pattern, rule.replacement);
      
      if (before !== newContent) {
        modified = true;
        fileReplacements += matches.length;
        console.log(`  [${rule.name}] ${matches.length} replacements`);
      }
    }
  }
  
  return { content: newContent, modified, replacements: fileReplacements };
}

// 主函数
function main() {
  console.log('=== GRT智能系统 TypeScript错误批量修复脚本 ===\n');
  
  const allFiles = [];
  
  for (const dir of targetDirs) {
    console.log(`Scanning directory: ${dir}`);
    const files = getTypeScriptFiles(dir);
    allFiles.push(...files);
    console.log(`  Found ${files.length} TypeScript files\n`);
  }
  
  totalFiles = allFiles.length;
  console.log(`Total files to process: ${totalFiles}\n`);
  console.log('--- Processing files ---\n');
  
  for (const filePath of allFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const result = applyFixes(content, filePath);
      
      if (result.modified) {
        writeFileSync(filePath, result.content, 'utf-8');
        modifiedFiles++;
        totalReplacements += result.replacements;
        console.log(`✓ Modified: ${filePath.replace('/home/ubuntu/grt-implementation-plan/', '')}`);
      }
    } catch (e) {
      console.error(`✗ Error processing ${filePath}:`, e.message);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log('\nDone!');
}

main();
