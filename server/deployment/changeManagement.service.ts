/**
 * GRT智能系统 - 变更管理服务
 * 
 * 提供变更申请、审批、执行和验证的完整流程管理
 */

import { randomBytes, createHash } from 'crypto';

// ===== 类型定义 =====

export type ChangeType = 'feature' | 'bugfix' | 'performance' | 'security' | 'config' | 'database' | 'infrastructure';
export type Urgency = 'normal' | 'urgent' | 'critical';
export type ChangeStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected' | 
                           'executing' | 'testing' | 'verified' | 'deployed' | 'rolled_back' | 'cancelled';
export type Environment = 'test' | 'production';
export type ApplicantRole = 'developer' | 'tester' | 'admin' | 'devops';
export type ConsistencyResult = 'passed' | 'warning' | 'failed';
export type CheckResult = 'match' | 'mismatch' | 'unexpected' | 'missing';

export interface ChangeRequest {
  id?: number;
  requestNo: string;
  title: string;
  changeType: ChangeType;
  urgency: Urgency;
  applicantId: number;
  applicantName: string;
  applicantRole: ApplicantRole;
  description: string;
  technicalPlan: string;
  impactAnalysis: string;
  rollbackPlan: string;
  testPlan: string;
  affectedModules: string[];
  expectedFiles: string[];
  expectedSql?: string[];
  expectedCommands?: string[];
  plannedStartTime?: Date;
  plannedEndTime?: Date;
  status: ChangeStatus;
  targetEnvironment: Environment | 'both';
}

export interface ExecutionToken {
  tokenId: string;
  changeRequestId: number;
  applicantId: number;
  approverId: number;
  scope: {
    allowedFiles: string[];
    allowedSql: string[];
    allowedCommands: string[];
  };
  validFrom: Date;
  validUntil: Date;
  usedAt?: Date;
  status: 'pending' | 'used' | 'expired' | 'revoked';
}

export interface ConsistencyCheck {
  executionId: number;
  checkType: 'file' | 'sql' | 'command' | 'data_impact' | 'dependency';
  expectedValue: string;
  actualValue: string;
  result: CheckResult;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details?: Record<string, unknown>;
}

export interface ChangeExecution {
  id?: number;
  requestId: number;
  executionToken: string;
  environment: Environment;
  actualFiles: string[];
  actualSql?: string[];
  actualCommands?: string[];
  consistencyCheckResult?: ConsistencyResult;
  consistencyDetails?: ConsistencyCheck[];
  status: 'started' | 'executing' | 'completed' | 'failed' | 'blocked' | 'rolled_back';
  executorId: number;
  executorName: string;
  startedAt?: Date;
  completedAt?: Date;
  resultSummary?: string;
  errorMessage?: string;
  gitCommitBefore?: string;
  gitCommitAfter?: string;
  gitBranch?: string;
}

// ===== 变更管理服务 =====

export class ChangeManagementService {
  private static instance: ChangeManagementService;
  
  // 内存存储（实际应使用数据库）
  private changeRequests: Map<number, ChangeRequest> = new Map();
  private executionTokens: Map<string, ExecutionToken> = new Map();
  private executions: Map<number, ChangeExecution> = new Map();
  private requestCounter = 0;
  private executionCounter = 0;
  
  private constructor() {}
  
  static getInstance(): ChangeManagementService {
    if (!ChangeManagementService.instance) {
      ChangeManagementService.instance = new ChangeManagementService();
    }
    return ChangeManagementService.instance;
  }
  
  // ===== 变更申请管理 =====
  
  /**
   * 生成变更申请编号
   */
  generateRequestNo(): string {
    const year = new Date().getFullYear();
    const seq = String(++this.requestCounter).padStart(4, '0');
    return `CR-${year}-${seq}`;
  }
  
  /**
   * 创建变更申请
   */
  createChangeRequest(request: Omit<ChangeRequest, 'id' | 'requestNo' | 'status'>): ChangeRequest {
    const id = this.changeRequests.size + 1;
    const newRequest: ChangeRequest = {
      ...request,
      id,
      requestNo: this.generateRequestNo(),
      status: 'draft',
    };
    this.changeRequests.set(id, newRequest);
    return newRequest;
  }
  
  /**
   * 提交变更申请
   */
  submitChangeRequest(requestId: number): ChangeRequest | null {
    const request = this.changeRequests.get(requestId);
    if (!request || request.status !== 'draft') {
      return null;
    }
    
    // 验证必填字段
    if (!this.validateChangeRequest(request)) {
      throw new Error('变更申请信息不完整');
    }
    
    request.status = 'submitted';
    return request;
  }
  
  /**
   * 验证变更申请完整性
   */
  private validateChangeRequest(request: ChangeRequest): boolean {
    return !!(
      request.title &&
      request.description &&
      request.technicalPlan &&
      request.impactAnalysis &&
      request.rollbackPlan &&
      request.testPlan &&
      request.expectedFiles?.length > 0
    );
  }
  
  /**
   * 技术审核
   */
  reviewChangeRequest(
    requestId: number, 
    reviewerId: number, 
    reviewerName: string, 
    approved: boolean, 
    comment: string
  ): ChangeRequest | null {
    const request = this.changeRequests.get(requestId);
    if (!request || request.status !== 'submitted') {
      return null;
    }
    
    if (approved) {
      request.status = 'reviewing';
    } else {
      request.status = 'rejected';
    }
    
    // 记录审核信息（实际应存储到数据库）
    (request as any).reviewerId = reviewerId;
    (request as any).reviewerName = reviewerName;
    (request as any).reviewTime = new Date();
    (request as any).reviewComment = comment;
    
    return request;
  }
  
  /**
   * 管理员审批
   */
  approveChangeRequest(
    requestId: number,
    approverId: number,
    approverName: string,
    approved: boolean,
    comment: string
  ): { request: ChangeRequest; token?: ExecutionToken } | null {
    const request = this.changeRequests.get(requestId);
    if (!request || request.status !== 'reviewing') {
      return null;
    }
    
    if (approved) {
      request.status = 'approved';
      
      // 生成执行令牌
      const token = this.generateExecutionToken(request, approverId);
      (request as any).executionToken = token.tokenId;
      (request as any).tokenExpiresAt = token.validUntil;
      
      // 记录审批信息
      (request as any).approverId = approverId;
      (request as any).approverName = approverName;
      (request as any).approvalTime = new Date();
      (request as any).approvalComment = comment;
      
      return { request, token };
    } else {
      request.status = 'rejected';
      (request as any).approverId = approverId;
      (request as any).approverName = approverName;
      (request as any).approvalTime = new Date();
      (request as any).approvalComment = comment;
      
      return { request };
    }
  }
  
  // ===== 执行令牌管理 =====
  
  /**
   * 生成执行令牌
   */
  private generateExecutionToken(request: ChangeRequest, approverId: number): ExecutionToken {
    const tokenId = randomBytes(32).toString('hex');
    const now = new Date();
    const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时有效
    
    const token: ExecutionToken = {
      tokenId,
      changeRequestId: request.id!,
      applicantId: request.applicantId,
      approverId,
      scope: {
        allowedFiles: request.expectedFiles,
        allowedSql: request.expectedSql || [],
        allowedCommands: request.expectedCommands || [],
      },
      validFrom: now,
      validUntil,
      status: 'pending',
    };
    
    this.executionTokens.set(tokenId, token);
    return token;
  }
  
  /**
   * 验证执行令牌
   */
  validateExecutionToken(tokenId: string): { valid: boolean; reason?: string; token?: ExecutionToken } {
    const token = this.executionTokens.get(tokenId);
    
    if (!token) {
      return { valid: false, reason: '令牌不存在' };
    }
    
    if (token.status === 'used') {
      return { valid: false, reason: '令牌已使用' };
    }
    
    if (token.status === 'expired' || new Date() > token.validUntil) {
      token.status = 'expired';
      return { valid: false, reason: '令牌已过期' };
    }
    
    if (token.status === 'revoked') {
      return { valid: false, reason: '令牌已撤销' };
    }
    
    return { valid: true, token };
  }
  
  /**
   * 使用执行令牌
   */
  useExecutionToken(tokenId: string): boolean {
    const token = this.executionTokens.get(tokenId);
    if (!token || token.status !== 'pending') {
      return false;
    }
    
    token.status = 'used';
    token.usedAt = new Date();
    return true;
  }
  
  /**
   * 撤销执行令牌
   */
  revokeExecutionToken(tokenId: string): boolean {
    const token = this.executionTokens.get(tokenId);
    if (!token || token.status !== 'pending') {
      return false;
    }
    
    token.status = 'revoked';
    return true;
  }
  
  // ===== 变更执行管理 =====
  
  /**
   * 开始执行变更
   */
  startExecution(
    requestId: number,
    tokenId: string,
    environment: Environment,
    executorId: number,
    executorName: string
  ): ChangeExecution | null {
    // 验证令牌
    const tokenValidation = this.validateExecutionToken(tokenId);
    if (!tokenValidation.valid) {
      throw new Error(`执行令牌无效: ${tokenValidation.reason}`);
    }
    
    const request = this.changeRequests.get(requestId);
    if (!request || request.status !== 'approved') {
      throw new Error('变更申请状态不允许执行');
    }
    
    // 使用令牌
    this.useExecutionToken(tokenId);
    
    // 更新申请状态
    request.status = 'executing';
    
    // 创建执行记录
    const executionId = ++this.executionCounter;
    const execution: ChangeExecution = {
      id: executionId,
      requestId,
      executionToken: tokenId,
      environment,
      actualFiles: [],
      actualSql: [],
      actualCommands: [],
      status: 'started',
      executorId,
      executorName,
      startedAt: new Date(),
    };
    
    this.executions.set(executionId, execution);
    return execution;
  }
  
  /**
   * 记录文件变更
   */
  recordFileChange(executionId: number, filePath: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    
    if (!execution.actualFiles.includes(filePath)) {
      execution.actualFiles.push(filePath);
    }
  }
  
  /**
   * 记录SQL执行
   */
  recordSqlExecution(executionId: number, sql: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    
    if (!execution.actualSql) {
      execution.actualSql = [];
    }
    execution.actualSql.push(sql);
  }
  
  /**
   * 记录命令执行
   */
  recordCommandExecution(executionId: number, command: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    
    if (!execution.actualCommands) {
      execution.actualCommands = [];
    }
    execution.actualCommands.push(command);
  }
  
  // ===== 一致性检查 =====
  
  /**
   * 执行一致性检查
   */
  performConsistencyCheck(executionId: number): ConsistencyCheck[] {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('执行记录不存在');
    }
    
    const request = this.changeRequests.get(execution.requestId);
    if (!request) {
      throw new Error('变更申请不存在');
    }
    
    const checks: ConsistencyCheck[] = [];
    
    // 检查文件变更
    const fileChecks = this.checkFileConsistency(
      executionId,
      request.expectedFiles,
      execution.actualFiles
    );
    checks.push(...fileChecks);
    
    // 检查SQL执行
    if (request.expectedSql && request.expectedSql.length > 0) {
      const sqlChecks = this.checkSqlConsistency(
        executionId,
        request.expectedSql,
        execution.actualSql || []
      );
      checks.push(...sqlChecks);
    }
    
    // 检查命令执行
    if (request.expectedCommands && request.expectedCommands.length > 0) {
      const commandChecks = this.checkCommandConsistency(
        executionId,
        request.expectedCommands,
        execution.actualCommands || []
      );
      checks.push(...commandChecks);
    }
    
    // 计算总体结果
    const hasError = checks.some(c => c.severity === 'error' || c.severity === 'critical');
    const hasWarning = checks.some(c => c.severity === 'warning');
    
    execution.consistencyCheckResult = hasError ? 'failed' : (hasWarning ? 'warning' : 'passed');
    execution.consistencyDetails = checks;
    
    return checks;
  }
  
  /**
   * 检查文件一致性
   */
  private checkFileConsistency(
    executionId: number,
    expected: string[],
    actual: string[]
  ): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = [];
    
    // 检查预期文件是否都被修改
    for (const file of expected) {
      const found = actual.includes(file);
      checks.push({
        executionId,
        checkType: 'file',
        expectedValue: file,
        actualValue: found ? file : '',
        result: found ? 'match' : 'missing',
        severity: found ? 'info' : 'warning',
        details: { message: found ? '文件已修改' : '预期文件未被修改' },
      });
    }
    
    // 检查是否有未预期的文件被修改
    for (const file of actual) {
      if (!expected.includes(file)) {
        checks.push({
          executionId,
          checkType: 'file',
          expectedValue: '',
          actualValue: file,
          result: 'unexpected',
          severity: 'error',
          details: { message: '未在申请中声明的文件被修改' },
        });
      }
    }
    
    return checks;
  }
  
  /**
   * 检查SQL一致性
   */
  private checkSqlConsistency(
    executionId: number,
    expected: string[],
    actual: string[]
  ): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = [];
    
    // 简化的SQL比较（实际应使用SQL解析器）
    const normalizeSQL = (sql: string) => sql.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const normalizedExpected = expected.map(normalizeSQL);
    const normalizedActual = actual.map(normalizeSQL);
    
    for (const sql of normalizedExpected) {
      const found = normalizedActual.some(a => a.includes(sql) || sql.includes(a));
      checks.push({
        executionId,
        checkType: 'sql',
        expectedValue: sql,
        actualValue: found ? sql : '',
        result: found ? 'match' : 'missing',
        severity: found ? 'info' : 'warning',
      });
    }
    
    for (const sql of normalizedActual) {
      const found = normalizedExpected.some(e => e.includes(sql) || sql.includes(e));
      if (!found) {
        checks.push({
          executionId,
          checkType: 'sql',
          expectedValue: '',
          actualValue: sql,
          result: 'unexpected',
          severity: 'error',
          details: { message: '未在申请中声明的SQL被执行' },
        });
      }
    }
    
    return checks;
  }
  
  /**
   * 检查命令一致性
   */
  private checkCommandConsistency(
    executionId: number,
    expected: string[],
    actual: string[]
  ): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = [];
    
    for (const cmd of expected) {
      const found = actual.some(a => a.includes(cmd) || cmd.includes(a));
      checks.push({
        executionId,
        checkType: 'command',
        expectedValue: cmd,
        actualValue: found ? cmd : '',
        result: found ? 'match' : 'missing',
        severity: found ? 'info' : 'warning',
      });
    }
    
    for (const cmd of actual) {
      const found = expected.some(e => e.includes(cmd) || cmd.includes(e));
      if (!found) {
        checks.push({
          executionId,
          checkType: 'command',
          expectedValue: '',
          actualValue: cmd,
          result: 'unexpected',
          severity: 'error',
          details: { message: '未在申请中声明的命令被执行' },
        });
      }
    }
    
    return checks;
  }
  
  /**
   * 完成执行
   */
  completeExecution(executionId: number, success: boolean, summary?: string): ChangeExecution | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;
    
    // 执行一致性检查
    const checks = this.performConsistencyCheck(executionId);
    
    // 如果一致性检查失败，阻断执行
    if (execution.consistencyCheckResult === 'failed') {
      execution.status = 'blocked';
      execution.errorMessage = '一致性检查失败，执行被阻断';
      
      // 更新申请状态
      const request = this.changeRequests.get(execution.requestId);
      if (request) {
        request.status = 'testing';
      }
      
      return execution;
    }
    
    execution.status = success ? 'completed' : 'failed';
    execution.completedAt = new Date();
    execution.resultSummary = summary;
    
    // 更新申请状态
    const request = this.changeRequests.get(execution.requestId);
    if (request) {
      if (success && execution.consistencyCheckResult === 'passed') {
        request.status = 'verified';
      } else if (execution.consistencyCheckResult === 'warning') {
        request.status = 'testing'; // 需要人工确认
      } else {
        request.status = 'testing';
      }
    }
    
    return execution;
  }
  
  /**
   * 回滚执行
   */
  rollbackExecution(executionId: number, reason: string): ChangeExecution | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;
    
    execution.status = 'rolled_back';
    execution.errorMessage = `回滚原因: ${reason}`;
    execution.completedAt = new Date();
    
    // 更新申请状态
    const request = this.changeRequests.get(execution.requestId);
    if (request) {
      request.status = 'rolled_back';
    }
    
    return execution;
  }
  
  // ===== 部署到正式环境 =====
  
  /**
   * 部署到正式环境
   */
  deployToProduction(requestId: number, deployerId: number, deployerName: string): boolean {
    const request = this.changeRequests.get(requestId);
    if (!request || request.status !== 'verified') {
      throw new Error('变更申请未通过验证，无法部署到正式环境');
    }
    
    // 检查是否有测试环境的成功执行记录
    const testExecution = Array.from(this.executions.values()).find(
      e => e.requestId === requestId && 
           e.environment === 'test' && 
           e.status === 'completed' &&
           e.consistencyCheckResult === 'passed'
    );
    
    if (!testExecution) {
      throw new Error('未找到测试环境的成功执行记录');
    }
    
    request.status = 'deployed';
    return true;
  }
  
  // ===== 查询方法 =====
  
  getChangeRequest(id: number): ChangeRequest | undefined {
    return this.changeRequests.get(id);
  }
  
  getChangeRequestByNo(requestNo: string): ChangeRequest | undefined {
    return Array.from(this.changeRequests.values()).find(r => r.requestNo === requestNo);
  }
  
  listChangeRequests(filters?: {
    status?: ChangeStatus;
    applicantId?: number;
    changeType?: ChangeType;
  }): ChangeRequest[] {
    let requests = Array.from(this.changeRequests.values());
    
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters?.applicantId) {
      requests = requests.filter(r => r.applicantId === filters.applicantId);
    }
    if (filters?.changeType) {
      requests = requests.filter(r => r.changeType === filters.changeType);
    }
    
    return requests.sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  
  getExecution(id: number): ChangeExecution | undefined {
    return this.executions.get(id);
  }
  
  listExecutions(requestId: number): ChangeExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.requestId === requestId)
      .sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  
  getExecutionToken(tokenId: string): ExecutionToken | undefined {
    return this.executionTokens.get(tokenId);
  }
}

// 导出单例
export const changeManagementService = ChangeManagementService.getInstance();
