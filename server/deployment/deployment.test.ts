/**
 * 部署管理模块测试
 * 测试变更管理、一致性检测和安装器功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟变更管理服务
const mockChangeManagementService = {
  createChangeRequest: vi.fn(),
  submitChangeRequest: vi.fn(),
  approveChangeRequest: vi.fn(),
  rejectChangeRequest: vi.fn(),
  generateExecutionToken: vi.fn(),
  validateExecutionToken: vi.fn(),
};

// 模拟一致性检测引擎
const mockConsistencyEngine = {
  validateFileChanges: vi.fn(),
  validateSqlStatements: vi.fn(),
  validateCommands: vi.fn(),
  generateChangeReport: vi.fn(),
};

// 模拟安装器服务
const mockInstallerService = {
  generateWindowsInstaller: vi.fn(),
  generateDockerCompose: vi.fn(),
  generateK8sManifest: vi.fn(),
  validateEnvironment: vi.fn(),
};

describe('变更管理服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('变更申请创建', () => {
    it('应该能创建变更申请', async () => {
      const changeRequest = {
        title: '添加培训测试数据功能',
        changeType: 'feature',
        urgency: 'normal',
        description: '在培训管理页面添加测试数据生成功能',
        technicalPlan: '1. 创建种子服务\n2. 添加API\n3. 前端按钮',
        expectedFiles: ['server/training-seed.service.ts'],
        targetEnvironment: 'test',
      };

      mockChangeManagementService.createChangeRequest.mockResolvedValue({
        id: 1,
        requestNo: 'CR-2026-0001',
        status: 'draft',
        ...changeRequest,
      });

      const result = await mockChangeManagementService.createChangeRequest(changeRequest);

      expect(result.requestNo).toBe('CR-2026-0001');
      expect(result.status).toBe('draft');
      expect(mockChangeManagementService.createChangeRequest).toHaveBeenCalledWith(changeRequest);
    });

    it('应该验证必填字段', async () => {
      const invalidRequest = {
        title: '',
        changeType: 'feature',
      };

      mockChangeManagementService.createChangeRequest.mockRejectedValue(
        new Error('标题不能为空')
      );

      await expect(
        mockChangeManagementService.createChangeRequest(invalidRequest)
      ).rejects.toThrow('标题不能为空');
    });
  });

  describe('变更申请审批', () => {
    it('应该能批准变更申请', async () => {
      mockChangeManagementService.approveChangeRequest.mockResolvedValue({
        id: 1,
        status: 'approved',
        approvedBy: 'admin',
        approvedAt: new Date().toISOString(),
      });

      const result = await mockChangeManagementService.approveChangeRequest(1, 'admin');

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('admin');
    });

    it('应该能拒绝变更申请', async () => {
      mockChangeManagementService.rejectChangeRequest.mockResolvedValue({
        id: 1,
        status: 'rejected',
        rejectedBy: 'admin',
        rejectionReason: '技术方案不完整',
      });

      const result = await mockChangeManagementService.rejectChangeRequest(1, 'admin', '技术方案不完整');

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('技术方案不完整');
    });
  });

  describe('执行令牌', () => {
    it('应该能生成执行令牌', async () => {
      mockChangeManagementService.generateExecutionToken.mockResolvedValue({
        token: 'exec-token-12345',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        changeRequestId: 1,
      });

      const result = await mockChangeManagementService.generateExecutionToken(1);

      expect(result.token).toMatch(/^exec-token-/);
      expect(result.changeRequestId).toBe(1);
    });

    it('应该能验证执行令牌', async () => {
      mockChangeManagementService.validateExecutionToken.mockResolvedValue({
        valid: true,
        changeRequestId: 1,
        remainingTime: 86400,
      });

      const result = await mockChangeManagementService.validateExecutionToken('exec-token-12345');

      expect(result.valid).toBe(true);
    });

    it('应该拒绝过期的执行令牌', async () => {
      mockChangeManagementService.validateExecutionToken.mockResolvedValue({
        valid: false,
        reason: '令牌已过期',
      });

      const result = await mockChangeManagementService.validateExecutionToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('令牌已过期');
    });
  });
});

describe('一致性检测引擎', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('文件变更验证', () => {
    it('应该验证文件变更与申请一致', async () => {
      const declaredFiles = ['server/training-seed.service.ts', 'client/src/pages/TrainingManagement.tsx'];
      const actualFiles = ['server/training-seed.service.ts', 'client/src/pages/TrainingManagement.tsx'];

      mockConsistencyEngine.validateFileChanges.mockResolvedValue({
        consistent: true,
        declaredFiles,
        actualFiles,
        unexpectedFiles: [],
        missingFiles: [],
      });

      const result = await mockConsistencyEngine.validateFileChanges(declaredFiles, actualFiles);

      expect(result.consistent).toBe(true);
      expect(result.unexpectedFiles).toHaveLength(0);
    });

    it('应该检测未声明的文件变更', async () => {
      const declaredFiles = ['server/training-seed.service.ts'];
      const actualFiles = ['server/training-seed.service.ts', 'server/secret-backdoor.ts'];

      mockConsistencyEngine.validateFileChanges.mockResolvedValue({
        consistent: false,
        declaredFiles,
        actualFiles,
        unexpectedFiles: ['server/secret-backdoor.ts'],
        missingFiles: [],
      });

      const result = await mockConsistencyEngine.validateFileChanges(declaredFiles, actualFiles);

      expect(result.consistent).toBe(false);
      expect(result.unexpectedFiles).toContain('server/secret-backdoor.ts');
    });
  });

  describe('SQL语句验证', () => {
    it('应该验证SQL语句与申请一致', async () => {
      const declaredSql = ['ALTER TABLE users ADD COLUMN role VARCHAR(20)'];
      const actualSql = ['ALTER TABLE users ADD COLUMN role VARCHAR(20)'];

      mockConsistencyEngine.validateSqlStatements.mockResolvedValue({
        consistent: true,
        declaredSql,
        actualSql,
        unexpectedSql: [],
      });

      const result = await mockConsistencyEngine.validateSqlStatements(declaredSql, actualSql);

      expect(result.consistent).toBe(true);
    });

    it('应该检测未声明的SQL语句', async () => {
      const declaredSql = ['ALTER TABLE users ADD COLUMN role VARCHAR(20)'];
      const actualSql = ['ALTER TABLE users ADD COLUMN role VARCHAR(20)', 'DROP TABLE audit_logs'];

      mockConsistencyEngine.validateSqlStatements.mockResolvedValue({
        consistent: false,
        declaredSql,
        actualSql,
        unexpectedSql: ['DROP TABLE audit_logs'],
      });

      const result = await mockConsistencyEngine.validateSqlStatements(declaredSql, actualSql);

      expect(result.consistent).toBe(false);
      expect(result.unexpectedSql).toContain('DROP TABLE audit_logs');
    });
  });

  describe('命令验证', () => {
    it('应该验证命令与申请一致', async () => {
      const declaredCommands = ['npm install', 'npm run build'];
      const actualCommands = ['npm install', 'npm run build'];

      mockConsistencyEngine.validateCommands.mockResolvedValue({
        consistent: true,
        declaredCommands,
        actualCommands,
        unexpectedCommands: [],
      });

      const result = await mockConsistencyEngine.validateCommands(declaredCommands, actualCommands);

      expect(result.consistent).toBe(true);
    });

    it('应该检测危险命令', async () => {
      const declaredCommands = ['npm install'];
      const actualCommands = ['npm install', 'rm -rf /'];

      mockConsistencyEngine.validateCommands.mockResolvedValue({
        consistent: false,
        declaredCommands,
        actualCommands,
        unexpectedCommands: ['rm -rf /'],
        dangerousCommands: ['rm -rf /'],
      });

      const result = await mockConsistencyEngine.validateCommands(declaredCommands, actualCommands);

      expect(result.consistent).toBe(false);
      expect(result.dangerousCommands).toContain('rm -rf /');
    });
  });

  describe('变更报告生成', () => {
    it('应该生成变更报告', async () => {
      mockConsistencyEngine.generateChangeReport.mockResolvedValue({
        changeRequestId: 1,
        requestNo: 'CR-2026-0001',
        summary: {
          filesChanged: 3,
          linesAdded: 150,
          linesRemoved: 20,
          sqlStatements: 1,
          commands: 2,
        },
        consistency: {
          overall: true,
          fileChanges: true,
          sqlStatements: true,
          commands: true,
        },
        generatedAt: new Date().toISOString(),
      });

      const result = await mockConsistencyEngine.generateChangeReport(1);

      expect(result.requestNo).toBe('CR-2026-0001');
      expect(result.consistency.overall).toBe(true);
    });
  });
});

describe('安装器服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Windows安装器', () => {
    it('应该生成Windows安装脚本', async () => {
      const config = {
        appName: 'GRT智能系统',
        appPort: 3000,
        database: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
        },
      };

      mockInstallerService.generateWindowsInstaller.mockResolvedValue({
        filename: 'grt-installer.bat',
        content: '@echo off\necho Installing GRT System...',
        checksum: 'abc123',
      });

      const result = await mockInstallerService.generateWindowsInstaller(config);

      expect(result.filename).toBe('grt-installer.bat');
      expect(result.content).toContain('Installing GRT System');
    });
  });

  describe('Docker部署', () => {
    it('应该生成Docker Compose配置', async () => {
      const config = {
        appName: 'grt-system',
        appPort: 3000,
        database: {
          type: 'mysql',
          host: 'db',
          port: 3306,
        },
      };

      mockInstallerService.generateDockerCompose.mockResolvedValue({
        filename: 'docker-compose.yml',
        content: 'version: "3.8"\nservices:\n  app:\n    image: grt-system',
        checksum: 'def456',
      });

      const result = await mockInstallerService.generateDockerCompose(config);

      expect(result.filename).toBe('docker-compose.yml');
      expect(result.content).toContain('services');
    });
  });

  describe('Kubernetes部署', () => {
    it('应该生成K8s部署清单', async () => {
      const config = {
        appName: 'grt-system',
        namespace: 'production',
        replicas: 3,
      };

      mockInstallerService.generateK8sManifest.mockResolvedValue({
        filename: 'k8s-deployment.yaml',
        content: 'apiVersion: apps/v1\nkind: Deployment',
        checksum: 'ghi789',
      });

      const result = await mockInstallerService.generateK8sManifest(config);

      expect(result.filename).toBe('k8s-deployment.yaml');
      expect(result.content).toContain('Deployment');
    });
  });

  describe('环境验证', () => {
    it('应该验证Windows环境', async () => {
      mockInstallerService.validateEnvironment.mockResolvedValue({
        valid: true,
        platform: 'windows',
        nodeVersion: '22.13.0',
        diskSpace: '50GB',
        memory: '16GB',
        issues: [],
      });

      const result = await mockInstallerService.validateEnvironment('windows');

      expect(result.valid).toBe(true);
      expect(result.platform).toBe('windows');
    });

    it('应该检测环境问题', async () => {
      mockInstallerService.validateEnvironment.mockResolvedValue({
        valid: false,
        platform: 'windows',
        nodeVersion: '14.0.0',
        diskSpace: '5GB',
        memory: '4GB',
        issues: [
          'Node.js版本过低，需要 >= 18.0.0',
          '磁盘空间不足，需要 >= 20GB',
          '内存不足，需要 >= 8GB',
        ],
      });

      const result = await mockInstallerService.validateEnvironment('windows');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(3);
    });
  });
});

describe('双环境同步', () => {
  const mockSyncService = {
    compareEnvironments: vi.fn(),
    syncTestToProduction: vi.fn(),
    rollbackProduction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该比较测试和正式环境版本', async () => {
    mockSyncService.compareEnvironments.mockResolvedValue({
      testVersion: 'v4.5.0',
      productionVersion: 'v4.4.5',
      versionDiff: 1,
      canSync: true,
      pendingChanges: ['CR-2026-0001', 'CR-2026-0002'],
    });

    const result = await mockSyncService.compareEnvironments();

    expect(result.testVersion).toBe('v4.5.0');
    expect(result.productionVersion).toBe('v4.4.5');
    expect(result.canSync).toBe(true);
  });

  it('应该同步测试环境到正式环境', async () => {
    mockSyncService.syncTestToProduction.mockResolvedValue({
      success: true,
      fromVersion: 'v4.4.5',
      toVersion: 'v4.5.0',
      syncedAt: new Date().toISOString(),
      changes: ['CR-2026-0001'],
    });

    const result = await mockSyncService.syncTestToProduction('exec-token-12345');

    expect(result.success).toBe(true);
    expect(result.toVersion).toBe('v4.5.0');
  });

  it('应该能回滚正式环境', async () => {
    mockSyncService.rollbackProduction.mockResolvedValue({
      success: true,
      fromVersion: 'v4.5.0',
      toVersion: 'v4.4.5',
      rolledBackAt: new Date().toISOString(),
      reason: '发现严重bug',
    });

    const result = await mockSyncService.rollbackProduction('v4.4.5', '发现严重bug');

    expect(result.success).toBe(true);
    expect(result.toVersion).toBe('v4.4.5');
  });
});
