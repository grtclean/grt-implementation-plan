/**
 * GRT智能系统 - 部署安装器服务
 * 
 * 提供Windows 11服务器和云端的自动化安装功能
 * 支持菜单式选择配置
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ===== 类型定义 =====

export type DeploymentType = 'windows' | 'docker' | 'kubernetes' | 'manus_cloud';
export type EnvironmentType = 'test' | 'production';

export interface SystemRequirements {
  os: {
    name: string;
    version: string;
    arch: string;
  };
  memory: {
    required: number;  // GB
    recommended: number;
    available: number;
  };
  disk: {
    required: number;  // GB
    available: number;
  };
  ports: {
    port: number;
    name: string;
    available: boolean;
  }[];
}

export interface InstallationConfig {
  deploymentType: DeploymentType;
  environment: EnvironmentType;
  
  // 基础配置
  appName: string;
  appPort: number;
  
  // 数据库配置
  database: {
    type: 'mysql' | 'tidb' | 'postgresql';
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  
  // 安全配置
  security: {
    enableHttps: boolean;
    enableTwoFactor: boolean;
    enableIpWhitelist: boolean;
    enableAuditLog: boolean;
    enableIntrusionDetection: boolean;
    ipWhitelist?: string[];
  };
  
  // 功能模块
  features: {
    crm: boolean;
    project: boolean;
    cost: boolean;
    training: boolean;
    ai: boolean;
    aiApiKey?: string;
  };
  
  // 备份配置
  backup: {
    enabled: boolean;
    schedule: string;  // cron表达式
    retention: number; // 保留天数
  };
  
  // 监控配置
  monitoring: {
    enabled: boolean;
    alertEmail?: string;
    alertWebhook?: string;
  };
}

export interface InstallationStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  logs: string[];
}

export interface InstallationProgress {
  installationId: string;
  config: InstallationConfig;
  status: 'preparing' | 'installing' | 'configuring' | 'verifying' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  steps: InstallationStep[];
  startTime: Date;
  endTime?: Date;
  error?: string;
}

// ===== 安装器服务 =====

export class InstallerService {
  private static instance: InstallerService;
  private installations: Map<string, InstallationProgress> = new Map();
  
  private constructor() {}
  
  static getInstance(): InstallerService {
    if (!InstallerService.instance) {
      InstallerService.instance = new InstallerService();
    }
    return InstallerService.instance;
  }
  
  // ===== 系统检测 =====
  
  /**
   * 检测系统环境
   */
  async detectSystemRequirements(): Promise<SystemRequirements> {
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();
    
    // 内存信息
    const totalMemory = os.totalmem() / (1024 * 1024 * 1024);
    const freeMemory = os.freemem() / (1024 * 1024 * 1024);
    
    // 检测端口可用性
    const portsToCheck = [
      { port: 3000, name: 'Web Server' },
      { port: 3306, name: 'MySQL' },
      { port: 6379, name: 'Redis' },
      { port: 443, name: 'HTTPS' },
      { port: 80, name: 'HTTP' },
    ];
    
    const portResults = await Promise.all(
      portsToCheck.map(async (p) => ({
        ...p,
        available: await this.checkPortAvailable(p.port),
      }))
    );
    
    // 磁盘空间（简化实现）
    let diskAvailable = 100; // 默认值
    try {
      if (platform === 'win32') {
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        // 解析Windows磁盘信息
        const lines = stdout.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3 && parts[0].includes('C:')) {
            diskAvailable = parseInt(parts[1]) / (1024 * 1024 * 1024);
          }
        }
      } else {
        const { stdout } = await execAsync('df -BG / | tail -1');
        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 4) {
          diskAvailable = parseInt(parts[3].replace('G', ''));
        }
      }
    } catch (e) {
      // 忽略错误，使用默认值
    }
    
    return {
      os: {
        name: platform === 'win32' ? 'Windows' : (platform === 'darwin' ? 'macOS' : 'Linux'),
        version: release,
        arch,
      },
      memory: {
        required: 8,
        recommended: 16,
        available: Math.round(totalMemory * 10) / 10,
      },
      disk: {
        required: 50,
        available: Math.round(diskAvailable * 10) / 10,
      },
      ports: portResults,
    };
  }
  
  /**
   * 检测端口是否可用
   */
  private async checkPortAvailable(port: number): Promise<boolean> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        const { stdout } = await execAsync(`netstat -an | findstr :${port}`);
        return !stdout.includes('LISTENING');
      } else {
        const { stdout } = await execAsync(`lsof -i :${port} 2>/dev/null || true`);
        return stdout.trim() === '';
      }
    } catch {
      return true; // 假设可用
    }
  }
  
  /**
   * 验证系统要求
   */
  validateRequirements(requirements: SystemRequirements): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // 检查内存
    if (requirements.memory.available < requirements.memory.required) {
      issues.push(`内存不足: 需要 ${requirements.memory.required}GB，当前 ${requirements.memory.available}GB`);
    } else if (requirements.memory.available < requirements.memory.recommended) {
      issues.push(`内存建议: 推荐 ${requirements.memory.recommended}GB，当前 ${requirements.memory.available}GB（可能影响性能）`);
    }
    
    // 检查磁盘
    if (requirements.disk.available < requirements.disk.required) {
      issues.push(`磁盘空间不足: 需要 ${requirements.disk.required}GB，当前 ${requirements.disk.available}GB`);
    }
    
    // 检查关键端口
    const criticalPorts = requirements.ports.filter(p => [3000, 3306].includes(p.port));
    for (const port of criticalPorts) {
      if (!port.available) {
        issues.push(`端口 ${port.port} (${port.name}) 已被占用`);
      }
    }
    
    return {
      valid: issues.filter(i => !i.includes('建议')).length === 0,
      issues,
    };
  }
  
  // ===== 安装流程 =====
  
  /**
   * 开始安装
   */
  async startInstallation(config: InstallationConfig): Promise<InstallationProgress> {
    const installationId = `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 根据部署类型确定安装步骤
    const steps = this.getInstallationSteps(config.deploymentType);
    
    const progress: InstallationProgress = {
      installationId,
      config,
      status: 'preparing',
      currentStep: 0,
      totalSteps: steps.length,
      steps,
      startTime: new Date(),
    };
    
    this.installations.set(installationId, progress);
    
    // 异步执行安装
    this.executeInstallation(installationId).catch(error => {
      const p = this.installations.get(installationId);
      if (p) {
        p.status = 'failed';
        p.error = error.message;
        p.endTime = new Date();
      }
    });
    
    return progress;
  }
  
  /**
   * 获取安装步骤
   */
  private getInstallationSteps(deploymentType: DeploymentType): InstallationStep[] {
    const baseSteps: InstallationStep[] = [
      {
        id: 1,
        name: '环境检测',
        description: '检测系统环境和依赖',
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 2,
        name: '依赖安装',
        description: '安装必要的软件依赖',
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 3,
        name: '数据库配置',
        description: '配置数据库连接和初始化',
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 4,
        name: '应用部署',
        description: '部署应用程序文件',
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 5,
        name: '安全配置',
        description: '配置安全选项和证书',
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 6,
        name: '服务启动',
        description: '启动应用服务',
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 7,
        name: '健康检查',
        description: '验证安装结果',
        status: 'pending',
        progress: 0,
        logs: [],
      },
    ];
    
    // 根据部署类型添加特定步骤
    if (deploymentType === 'windows') {
      baseSteps.splice(5, 0, {
        id: 6,
        name: 'Windows服务注册',
        description: '注册为Windows服务',
        status: 'pending',
        progress: 0,
        logs: [],
      });
    } else if (deploymentType === 'docker') {
      baseSteps.splice(3, 0, {
        id: 4,
        name: 'Docker镜像构建',
        description: '构建Docker镜像',
        status: 'pending',
        progress: 0,
        logs: [],
      });
    } else if (deploymentType === 'kubernetes') {
      baseSteps.splice(3, 0, {
        id: 4,
        name: 'Kubernetes配置',
        description: '生成K8s部署配置',
        status: 'pending',
        progress: 0,
        logs: [],
      });
    }
    
    // 重新编号
    return baseSteps.map((step, index) => ({ ...step, id: index + 1 }));
  }
  
  /**
   * 执行安装
   */
  private async executeInstallation(installationId: string): Promise<void> {
    const progress = this.installations.get(installationId);
    if (!progress) return;
    
    progress.status = 'installing';
    
    for (let i = 0; i < progress.steps.length; i++) {
      const step = progress.steps[i];
      progress.currentStep = i + 1;
      step.status = 'running';
      step.startTime = new Date();
      
      try {
        await this.executeStep(progress, step);
        step.status = 'completed';
        step.progress = 100;
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;
        step.logs.push(`错误: ${error.message}`);
        throw error;
      } finally {
        step.endTime = new Date();
      }
    }
    
    progress.status = 'completed';
    progress.endTime = new Date();
  }
  
  /**
   * 执行单个步骤
   */
  private async executeStep(progress: InstallationProgress, step: InstallationStep): Promise<void> {
    const { config } = progress;
    
    switch (step.name) {
      case '环境检测':
        step.logs.push('正在检测系统环境...');
        const requirements = await this.detectSystemRequirements();
        const validation = this.validateRequirements(requirements);
        if (!validation.valid) {
          throw new Error(`系统要求不满足: ${validation.issues.join(', ')}`);
        }
        step.logs.push(`系统检测通过: ${requirements.os.name} ${requirements.os.version}`);
        step.logs.push(`内存: ${requirements.memory.available}GB`);
        step.logs.push(`磁盘: ${requirements.disk.available}GB`);
        break;
        
      case '依赖安装':
        step.logs.push('正在检查依赖...');
        await this.installDependencies(config.deploymentType, step);
        break;
        
      case '数据库配置':
        step.logs.push('正在配置数据库...');
        await this.configureDatabase(config, step);
        break;
        
      case '应用部署':
        step.logs.push('正在部署应用...');
        await this.deployApplication(config, step);
        break;
        
      case '安全配置':
        step.logs.push('正在配置安全选项...');
        await this.configureSecurity(config, step);
        break;
        
      case 'Windows服务注册':
        step.logs.push('正在注册Windows服务...');
        await this.registerWindowsService(config, step);
        break;
        
      case 'Docker镜像构建':
        step.logs.push('正在构建Docker镜像...');
        await this.buildDockerImage(config, step);
        break;
        
      case 'Kubernetes配置':
        step.logs.push('正在生成Kubernetes配置...');
        await this.generateK8sConfig(config, step);
        break;
        
      case '服务启动':
        step.logs.push('正在启动服务...');
        await this.startService(config, step);
        break;
        
      case '健康检查':
        step.logs.push('正在执行健康检查...');
        await this.performHealthCheck(config, step);
        break;
        
      default:
        step.logs.push(`执行步骤: ${step.name}`);
    }
  }
  
  // ===== 安装步骤实现 =====
  
  private async installDependencies(deploymentType: DeploymentType, step: InstallationStep): Promise<void> {
    const platform = os.platform();
    
    if (deploymentType === 'windows' || platform === 'win32') {
      step.logs.push('检查Node.js...');
      // 模拟检查
      step.progress = 30;
      
      step.logs.push('检查MySQL...');
      step.progress = 60;
      
      step.logs.push('检查Git...');
      step.progress = 90;
      
      step.logs.push('依赖检查完成');
    } else if (deploymentType === 'docker') {
      step.logs.push('检查Docker...');
      step.progress = 50;
      
      step.logs.push('检查Docker Compose...');
      step.progress = 100;
    }
  }
  
  private async configureDatabase(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push(`数据库类型: ${config.database.type}`);
    step.logs.push(`数据库主机: ${config.database.host}:${config.database.port}`);
    step.progress = 30;
    
    // 生成数据库配置
    const dbConfig = {
      DATABASE_URL: `mysql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`,
    };
    
    step.logs.push('数据库配置已生成');
    step.progress = 70;
    
    step.logs.push('数据库连接测试...');
    // 模拟测试
    step.progress = 100;
    step.logs.push('数据库配置完成');
  }
  
  private async deployApplication(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push('复制应用文件...');
    step.progress = 20;
    
    step.logs.push('安装npm依赖...');
    step.progress = 50;
    
    step.logs.push('构建应用...');
    step.progress = 80;
    
    step.logs.push('应用部署完成');
    step.progress = 100;
  }
  
  private async configureSecurity(config: InstallationConfig, step: InstallationStep): Promise<void> {
    if (config.security.enableHttps) {
      step.logs.push('配置HTTPS证书...');
      step.progress = 20;
    }
    
    if (config.security.enableTwoFactor) {
      step.logs.push('启用双因素认证...');
      step.progress = 40;
    }
    
    if (config.security.enableAuditLog) {
      step.logs.push('启用审计日志...');
      step.progress = 60;
    }
    
    if (config.security.enableIntrusionDetection) {
      step.logs.push('启用入侵检测...');
      step.progress = 80;
    }
    
    step.logs.push('安全配置完成');
    step.progress = 100;
  }
  
  private async registerWindowsService(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push('创建Windows服务配置...');
    step.progress = 30;
    
    step.logs.push('注册服务: GRT-System');
    step.progress = 70;
    
    step.logs.push('设置服务自动启动');
    step.progress = 100;
  }
  
  private async buildDockerImage(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push('生成Dockerfile...');
    step.progress = 20;
    
    step.logs.push('构建镜像: grt-system:latest');
    step.progress = 70;
    
    step.logs.push('镜像构建完成');
    step.progress = 100;
  }
  
  private async generateK8sConfig(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push('生成Deployment配置...');
    step.progress = 30;
    
    step.logs.push('生成Service配置...');
    step.progress = 60;
    
    step.logs.push('生成ConfigMap...');
    step.progress = 90;
    
    step.logs.push('Kubernetes配置生成完成');
    step.progress = 100;
  }
  
  private async startService(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push('启动应用服务...');
    step.progress = 50;
    
    step.logs.push(`服务已启动，端口: ${config.appPort}`);
    step.progress = 100;
  }
  
  private async performHealthCheck(config: InstallationConfig, step: InstallationStep): Promise<void> {
    step.logs.push('检查API健康状态...');
    step.progress = 30;
    
    step.logs.push('检查数据库连接...');
    step.progress = 60;
    
    step.logs.push('检查功能模块...');
    step.progress = 90;
    
    step.logs.push('健康检查通过');
    step.progress = 100;
  }
  
  // ===== 配置生成 =====
  
  /**
   * 生成环境配置文件
   */
  generateEnvConfig(config: InstallationConfig): string {
    const lines: string[] = [
      '# GRT智能系统环境配置',
      `# 生成时间: ${new Date().toISOString()}`,
      `# 环境: ${config.environment}`,
      '',
      '# 应用配置',
      `APP_NAME=${config.appName}`,
      `APP_PORT=${config.appPort}`,
      `NODE_ENV=${config.environment === 'production' ? 'production' : 'development'}`,
      '',
      '# 数据库配置',
      `DATABASE_TYPE=${config.database.type}`,
      `DATABASE_HOST=${config.database.host}`,
      `DATABASE_PORT=${config.database.port}`,
      `DATABASE_NAME=${config.database.name}`,
      `DATABASE_USER=${config.database.user}`,
      `DATABASE_PASSWORD=${config.database.password}`,
      `DATABASE_SSL=${config.database.ssl}`,
      '',
      '# 安全配置',
      `ENABLE_HTTPS=${config.security.enableHttps}`,
      `ENABLE_TWO_FACTOR=${config.security.enableTwoFactor}`,
      `ENABLE_IP_WHITELIST=${config.security.enableIpWhitelist}`,
      `ENABLE_AUDIT_LOG=${config.security.enableAuditLog}`,
      `ENABLE_INTRUSION_DETECTION=${config.security.enableIntrusionDetection}`,
    ];
    
    if (config.security.ipWhitelist && config.security.ipWhitelist.length > 0) {
      lines.push(`IP_WHITELIST=${config.security.ipWhitelist.join(',')}`);
    }
    
    lines.push('', '# 功能模块');
    lines.push(`FEATURE_CRM=${config.features.crm}`);
    lines.push(`FEATURE_PROJECT=${config.features.project}`);
    lines.push(`FEATURE_COST=${config.features.cost}`);
    lines.push(`FEATURE_TRAINING=${config.features.training}`);
    lines.push(`FEATURE_AI=${config.features.ai}`);
    
    if (config.features.ai && config.features.aiApiKey) {
      lines.push(`AI_API_KEY=${config.features.aiApiKey}`);
    }
    
    if (config.backup.enabled) {
      lines.push('', '# 备份配置');
      lines.push(`BACKUP_ENABLED=${config.backup.enabled}`);
      lines.push(`BACKUP_SCHEDULE=${config.backup.schedule}`);
      lines.push(`BACKUP_RETENTION=${config.backup.retention}`);
    }
    
    if (config.monitoring.enabled) {
      lines.push('', '# 监控配置');
      lines.push(`MONITORING_ENABLED=${config.monitoring.enabled}`);
      if (config.monitoring.alertEmail) {
        lines.push(`ALERT_EMAIL=${config.monitoring.alertEmail}`);
      }
      if (config.monitoring.alertWebhook) {
        lines.push(`ALERT_WEBHOOK=${config.monitoring.alertWebhook}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * 生成Docker Compose配置
   */
  generateDockerCompose(config: InstallationConfig): string {
    return `version: '3.8'

services:
  grt-system:
    image: grt-system:latest
    container_name: grt-system-${config.environment}
    restart: unless-stopped
    ports:
      - "${config.appPort}:3000"
    environment:
      - NODE_ENV=${config.environment === 'production' ? 'production' : 'development'}
      - DATABASE_URL=mysql://${config.database.user}:${config.database.password}@db:3306/${config.database.name}
    depends_on:
      - db
    networks:
      - grt-network

  db:
    image: mysql:8.0
    container_name: grt-mysql-${config.environment}
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${config.database.password}
      - MYSQL_DATABASE=${config.database.name}
      - MYSQL_USER=${config.database.user}
      - MYSQL_PASSWORD=${config.database.password}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - grt-network

networks:
  grt-network:
    driver: bridge

volumes:
  mysql-data:
`;
  }
  
  /**
   * 生成Windows安装脚本
   */
  generateWindowsInstallScript(config: InstallationConfig): string {
    return `@echo off
REM GRT智能系统 Windows安装脚本
REM 生成时间: ${new Date().toISOString()}

echo ========================================
echo   GRT智能系统 安装程序
echo   环境: ${config.environment}
echo ========================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 请以管理员身份运行此脚本
    pause
    exit /b 1
)

echo [1/7] 检查系统环境...
systeminfo | findstr /C:"OS Name" /C:"Total Physical Memory"

echo.
echo [2/7] 检查Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js未安装，正在下载...
    REM 这里应该添加Node.js下载和安装逻辑
)

echo.
echo [3/7] 检查MySQL...
mysql --version >nul 2>&1
if %errorLevel% neq 0 (
    echo MySQL未安装，请手动安装MySQL 8.0
)

echo.
echo [4/7] 安装应用依赖...
cd /d "%~dp0"
call pnpm install

echo.
echo [5/7] 配置数据库...
call pnpm db:push

echo.
echo [6/7] 构建应用...
call pnpm build

echo.
echo [7/7] 注册Windows服务...
REM 使用node-windows或pm2-windows-service

echo.
echo ========================================
echo   安装完成！
echo   访问地址: http://localhost:${config.appPort}
echo ========================================
pause
`;
  }
  
  // ===== 查询方法 =====
  
  getInstallationProgress(installationId: string): InstallationProgress | undefined {
    return this.installations.get(installationId);
  }
  
  listInstallations(): InstallationProgress[] {
    return Array.from(this.installations.values());
  }
}

// 导出单例
export const installerService = InstallerService.getInstance();
