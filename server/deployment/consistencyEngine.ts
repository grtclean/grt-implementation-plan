/**
 * GRT智能系统 - 一致性检测引擎
 * 
 * 提供自动化的变更内容一致性验证功能
 * 确保申请内容与实际执行内容一致
 */

import { createHash } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

import { createChildLogger } from "../lib/logger";
const log = createChildLogger("consistency");

// ===== 类型定义 =====

export interface FileChangeRecord {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;  // 用于重命名
  contentHash?: string;
  linesAdded?: number;
  linesDeleted?: number;
  timestamp: Date;
}

export interface SqlExecutionRecord {
  sql: string;
  normalizedSql: string;
  executionTime: Date;
  affectedRows?: number;
  tableName?: string;
  operationType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'OTHER';
}

export interface CommandExecutionRecord {
  command: string;
  args: string[];
  exitCode: number;
  stdout?: string;
  stderr?: string;
  executionTime: Date;
  duration: number;
}

export interface ConsistencyReport {
  executionId: number;
  requestId: number;
  checkTime: Date;
  overallResult: 'passed' | 'warning' | 'failed';
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  fileChecks: FileConsistencyResult[];
  sqlChecks: SqlConsistencyResult[];
  commandChecks: CommandConsistencyResult[];
  dataImpactCheck?: DataImpactResult;
  recommendations: string[];
  blockingIssues: string[];
}

export interface FileConsistencyResult {
  expectedFile: string;
  actualFile?: string;
  status: 'match' | 'missing' | 'unexpected' | 'mismatch';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: string;
}

export interface SqlConsistencyResult {
  expectedSql: string;
  actualSql?: string;
  status: 'match' | 'missing' | 'unexpected' | 'semantic_mismatch';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: string;
  affectedRows?: number;
}

export interface CommandConsistencyResult {
  expectedCommand: string;
  actualCommand?: string;
  status: 'match' | 'missing' | 'unexpected' | 'partial_match';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: string;
}

export interface DataImpactResult {
  expectedImpact: {
    tables: string[];
    estimatedRows: number;
  };
  actualImpact: {
    tables: string[];
    actualRows: number;
  };
  exceedsThreshold: boolean;
  thresholdPercentage: number;
  severity: 'info' | 'warning' | 'error';
}

// ===== 一致性检测引擎 =====

export class ConsistencyEngine {
  private static instance: ConsistencyEngine;
  
  // 配置
  private config = {
    dataImpactThreshold: 2.0,  // 200% - 实际影响行数不能超过预估的200%
    allowedCommandPatterns: [
      /^pnpm\s+/,
      /^npm\s+/,
      /^git\s+/,
      /^node\s+/,
      /^tsx\s+/,
    ],
    blockedCommands: [
      /rm\s+-rf\s+\//,
      /sudo\s+rm/,
      /DROP\s+DATABASE/i,
      /TRUNCATE\s+TABLE/i,
    ],
  };
  
  // 执行记录存储
  private fileChanges: Map<number, FileChangeRecord[]> = new Map();
  private sqlExecutions: Map<number, SqlExecutionRecord[]> = new Map();
  private commandExecutions: Map<number, CommandExecutionRecord[]> = new Map();
  
  private constructor() {}
  
  static getInstance(): ConsistencyEngine {
    if (!ConsistencyEngine.instance) {
      ConsistencyEngine.instance = new ConsistencyEngine();
    }
    return ConsistencyEngine.instance;
  }
  
  // ===== 记录变更 =====
  
  /**
   * 记录文件变更
   */
  recordFileChange(executionId: number, record: Omit<FileChangeRecord, 'timestamp'>): void {
    if (!this.fileChanges.has(executionId)) {
      this.fileChanges.set(executionId, []);
    }
    
    this.fileChanges.get(executionId)!.push({
      ...record,
      timestamp: new Date(),
    });
  }
  
  /**
   * 记录SQL执行
   */
  recordSqlExecution(executionId: number, sql: string, affectedRows?: number): void {
    if (!this.sqlExecutions.has(executionId)) {
      this.sqlExecutions.set(executionId, []);
    }
    
    const record: SqlExecutionRecord = {
      sql,
      normalizedSql: this.normalizeSql(sql),
      executionTime: new Date(),
      affectedRows,
      tableName: this.extractTableName(sql),
      operationType: this.detectSqlOperationType(sql),
    };
    
    this.sqlExecutions.get(executionId)!.push(record);
  }
  
  /**
   * 记录命令执行
   */
  recordCommandExecution(
    executionId: number, 
    command: string, 
    args: string[], 
    exitCode: number,
    duration: number,
    stdout?: string,
    stderr?: string
  ): void {
    if (!this.commandExecutions.has(executionId)) {
      this.commandExecutions.set(executionId, []);
    }
    
    this.commandExecutions.get(executionId)!.push({
      command,
      args,
      exitCode,
      stdout,
      stderr,
      executionTime: new Date(),
      duration,
    });
  }
  
  // ===== 一致性检查 =====
  
  /**
   * 执行完整的一致性检查
   */
  performFullCheck(
    executionId: number,
    requestId: number,
    expected: {
      files: string[];
      sql?: string[];
      commands?: string[];
      estimatedDataImpact?: { tables: string[]; rows: number };
    }
  ): ConsistencyReport {
    const report: ConsistencyReport = {
      executionId,
      requestId,
      checkTime: new Date(),
      overallResult: 'passed',
      summary: { totalChecks: 0, passed: 0, warnings: 0, errors: 0 },
      fileChecks: [],
      sqlChecks: [],
      commandChecks: [],
      recommendations: [],
      blockingIssues: [],
    };
    
    // 1. 文件一致性检查
    const actualFiles = this.fileChanges.get(executionId) || [];
    report.fileChecks = this.checkFileConsistency(
      expected.files,
      actualFiles.map(f => f.filePath)
    );
    
    // 2. SQL一致性检查
    if (expected.sql && expected.sql.length > 0) {
      const actualSql = this.sqlExecutions.get(executionId) || [];
      report.sqlChecks = this.checkSqlConsistency(
        expected.sql,
        actualSql.map(s => s.sql)
      );
    }
    
    // 3. 命令一致性检查
    if (expected.commands && expected.commands.length > 0) {
      const actualCommands = this.commandExecutions.get(executionId) || [];
      report.commandChecks = this.checkCommandConsistency(
        expected.commands,
        actualCommands.map(c => `${c.command} ${c.args.join(' ')}`.trim())
      );
    }
    
    // 4. 数据影响检查
    if (expected.estimatedDataImpact) {
      const actualSql = this.sqlExecutions.get(executionId) || [];
      report.dataImpactCheck = this.checkDataImpact(
        expected.estimatedDataImpact,
        actualSql
      );
    }
    
    // 5. 汇总结果
    this.summarizeReport(report);
    
    return report;
  }
  
  /**
   * 检查文件一致性
   */
  private checkFileConsistency(expected: string[], actual: string[]): FileConsistencyResult[] {
    const results: FileConsistencyResult[] = [];
    
    // 检查预期文件
    for (const file of expected) {
      const found = actual.some(a => this.matchFilePath(file, a));
      results.push({
        expectedFile: file,
        actualFile: found ? file : undefined,
        status: found ? 'match' : 'missing',
        severity: found ? 'info' : 'warning',
        details: found ? '文件已按预期修改' : '预期修改的文件未被修改',
      });
    }
    
    // 检查未预期的文件
    for (const file of actual) {
      const isExpected = expected.some(e => this.matchFilePath(e, file));
      if (!isExpected) {
        results.push({
          expectedFile: '',
          actualFile: file,
          status: 'unexpected',
          severity: 'error',
          details: `文件 ${file} 被修改但未在申请中声明`,
        });
      }
    }
    
    return results;
  }
  
  /**
   * 检查SQL一致性
   */
  private checkSqlConsistency(expected: string[], actual: string[]): SqlConsistencyResult[] {
    const results: SqlConsistencyResult[] = [];
    
    const normalizedExpected = expected.map(s => this.normalizeSql(s));
    const normalizedActual = actual.map(s => this.normalizeSql(s));
    
    // 检查预期SQL
    for (let i = 0; i < expected.length; i++) {
      const expectedNorm = normalizedExpected[i];
      const matchIndex = normalizedActual.findIndex(a => 
        this.compareSqlStatements(expectedNorm, a)
      );
      
      if (matchIndex >= 0) {
        results.push({
          expectedSql: expected[i],
          actualSql: actual[matchIndex],
          status: 'match',
          severity: 'info',
          details: 'SQL语句匹配',
        });
      } else {
        results.push({
          expectedSql: expected[i],
          status: 'missing',
          severity: 'warning',
          details: '预期的SQL语句未被执行',
        });
      }
    }
    
    // 检查未预期的SQL
    for (let i = 0; i < actual.length; i++) {
      const actualNorm = normalizedActual[i];
      const isExpected = normalizedExpected.some(e => 
        this.compareSqlStatements(e, actualNorm)
      );
      
      if (!isExpected) {
        // 检查是否是危险操作
        const isDangerous = this.isDangerousSql(actual[i]);
        results.push({
          expectedSql: '',
          actualSql: actual[i],
          status: 'unexpected',
          severity: isDangerous ? 'critical' : 'error',
          details: isDangerous 
            ? `危险SQL操作未在申请中声明: ${actual[i].substring(0, 100)}...`
            : `SQL语句未在申请中声明`,
        });
      }
    }
    
    return results;
  }
  
  /**
   * 检查命令一致性
   */
  private checkCommandConsistency(expected: string[], actual: string[]): CommandConsistencyResult[] {
    const results: CommandConsistencyResult[] = [];
    
    // 检查预期命令
    for (const cmd of expected) {
      const found = actual.some(a => this.matchCommand(cmd, a));
      results.push({
        expectedCommand: cmd,
        actualCommand: found ? cmd : undefined,
        status: found ? 'match' : 'missing',
        severity: found ? 'info' : 'warning',
        details: found ? '命令已执行' : '预期的命令未被执行',
      });
    }
    
    // 检查未预期的命令
    for (const cmd of actual) {
      const isExpected = expected.some(e => this.matchCommand(e, cmd));
      if (!isExpected) {
        // 检查是否是危险命令
        const isDangerous = this.isDangerousCommand(cmd);
        results.push({
          expectedCommand: '',
          actualCommand: cmd,
          status: 'unexpected',
          severity: isDangerous ? 'critical' : 'error',
          details: isDangerous
            ? `危险命令未在申请中声明: ${cmd}`
            : `命令未在申请中声明`,
        });
      }
    }
    
    return results;
  }
  
  /**
   * 检查数据影响
   */
  private checkDataImpact(
    expected: { tables: string[]; rows: number },
    actualSql: SqlExecutionRecord[]
  ): DataImpactResult {
    const actualTables = new Set<string>();
    let actualRows = 0;
    
    for (const record of actualSql) {
      if (record.tableName) {
        actualTables.add(record.tableName);
      }
      if (record.affectedRows) {
        actualRows += record.affectedRows;
      }
    }
    
    const exceedsThreshold = actualRows > expected.rows * this.config.dataImpactThreshold;
    
    return {
      expectedImpact: {
        tables: expected.tables,
        estimatedRows: expected.rows,
      },
      actualImpact: {
        tables: Array.from(actualTables),
        actualRows,
      },
      exceedsThreshold,
      thresholdPercentage: expected.rows > 0 ? (actualRows / expected.rows) * 100 : 0,
      severity: exceedsThreshold ? 'error' : (actualRows > expected.rows ? 'warning' : 'info'),
    };
  }
  
  /**
   * 汇总报告
   */
  private summarizeReport(report: ConsistencyReport): void {
    const allChecks = [
      ...report.fileChecks,
      ...report.sqlChecks,
      ...report.commandChecks,
    ];
    
    report.summary.totalChecks = allChecks.length;
    report.summary.passed = allChecks.filter(c => c.severity === 'info').length;
    report.summary.warnings = allChecks.filter(c => c.severity === 'warning').length;
    report.summary.errors = allChecks.filter(c => c.severity === 'error' || c.severity === 'critical').length;
    
    // 确定总体结果
    const hasCritical = allChecks.some(c => c.severity === 'critical');
    const hasError = allChecks.some(c => c.severity === 'error');
    const hasWarning = allChecks.some(c => c.severity === 'warning');
    
    if (hasCritical || hasError) {
      report.overallResult = 'failed';
    } else if (hasWarning) {
      report.overallResult = 'warning';
    } else {
      report.overallResult = 'passed';
    }
    
    // 生成阻断问题列表
    for (const check of allChecks) {
      if (check.severity === 'critical' || check.severity === 'error') {
        report.blockingIssues.push(check.details);
      }
    }
    
    // 生成建议
    if (report.summary.warnings > 0) {
      report.recommendations.push('存在警告项，建议人工确认后再继续');
    }
    if (report.fileChecks.some(c => c.status === 'missing')) {
      report.recommendations.push('部分预期文件未被修改，请确认是否遗漏');
    }
    if (report.dataImpactCheck?.exceedsThreshold) {
      report.recommendations.push('数据影响超出预估，请确认是否符合预期');
    }
  }
  
  // ===== 辅助方法 =====
  
  /**
   * 规范化SQL语句
   */
  private normalizeSql(sql: string): string {
    return sql
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*=\s*/g, '=')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .trim();
  }
  
  /**
   * 比较SQL语句
   */
  private compareSqlStatements(sql1: string, sql2: string): boolean {
    // 简单比较：检查是否包含关键部分
    const keywords1 = this.extractSqlKeywords(sql1);
    const keywords2 = this.extractSqlKeywords(sql2);
    
    // 如果关键词匹配度超过80%，认为是匹配的
    const matchCount = keywords1.filter(k => keywords2.includes(k)).length;
    const matchRate = matchCount / Math.max(keywords1.length, keywords2.length);
    
    return matchRate >= 0.8;
  }
  
  /**
   * 提取SQL关键词
   */
  private extractSqlKeywords(sql: string): string[] {
    const keywords = sql.match(/\b(select|insert|update|delete|from|into|where|set|values|join|on|and|or|table|create|alter|drop|index)\b/gi);
    return keywords ? keywords.map(k => k.toLowerCase()) : [];
  }
  
  /**
   * 检测SQL操作类型
   */
  private detectSqlOperationType(sql: string): SqlExecutionRecord['operationType'] {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith('select')) return 'SELECT';
    if (normalized.startsWith('insert')) return 'INSERT';
    if (normalized.startsWith('update')) return 'UPDATE';
    if (normalized.startsWith('delete')) return 'DELETE';
    if (normalized.startsWith('create')) return 'CREATE';
    if (normalized.startsWith('alter')) return 'ALTER';
    if (normalized.startsWith('drop')) return 'DROP';
    return 'OTHER';
  }
  
  /**
   * 提取表名
   */
  private extractTableName(sql: string): string | undefined {
    const patterns = [
      /from\s+`?(\w+)`?/i,
      /into\s+`?(\w+)`?/i,
      /update\s+`?(\w+)`?/i,
      /table\s+`?(\w+)`?/i,
    ];
    
    for (const pattern of patterns) {
      const match = sql.match(pattern);
      if (match) return match[1];
    }
    
    return undefined;
  }
  
  /**
   * 检查是否是危险SQL
   */
  private isDangerousSql(sql: string): boolean {
    return this.config.blockedCommands.some(pattern => pattern.test(sql));
  }
  
  /**
   * 检查是否是危险命令
   */
  private isDangerousCommand(cmd: string): boolean {
    return this.config.blockedCommands.some(pattern => pattern.test(cmd));
  }
  
  /**
   * 匹配文件路径
   */
  private matchFilePath(expected: string, actual: string): boolean {
    // 支持通配符匹配
    if (expected.includes('*')) {
      const regex = new RegExp('^' + expected.replace(/\*/g, '.*') + '$');
      return regex.test(actual);
    }
    return expected === actual || actual.endsWith(expected) || expected.endsWith(actual);
  }
  
  /**
   * 匹配命令
   */
  private matchCommand(expected: string, actual: string): boolean {
    const normalizedExpected = expected.trim().toLowerCase();
    const normalizedActual = actual.trim().toLowerCase();
    
    // 精确匹配或包含匹配
    return normalizedExpected === normalizedActual ||
           normalizedActual.includes(normalizedExpected) ||
           normalizedExpected.includes(normalizedActual);
  }
  
  // ===== Git集成 =====
  
  /**
   * 获取Git变更文件列表
   */
  async getGitChangedFiles(projectPath: string, fromCommit?: string): Promise<string[]> {
    try {
      const cmd = fromCommit 
        ? `git diff --name-only ${fromCommit} HEAD`
        : 'git diff --name-only HEAD~1 HEAD';
      
      const { stdout } = await execAsync(cmd, { cwd: projectPath });
      return stdout.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      log.error({ err: error }, "Failed to get git changed files");
      return [];
    }
  }
  
  /**
   * 获取当前Git提交哈希
   */
  async getCurrentCommitHash(projectPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: projectPath });
      return stdout.trim();
    } catch (error) {
      log.error({ err: error }, "Failed to get git commit hash");
      return '';
    }
  }
  
  /**
   * 清理执行记录
   */
  clearExecutionRecords(executionId: number): void {
    this.fileChanges.delete(executionId);
    this.sqlExecutions.delete(executionId);
    this.commandExecutions.delete(executionId);
  }
}

// 导出单例
export const consistencyEngine = ConsistencyEngine.getInstance();
