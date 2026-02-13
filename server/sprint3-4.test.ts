/**
 * Sprint 3 & Sprint 4 单元测试
 * - Sprint 3: 多用户Profile与RBAC架构
 * - Sprint 4: 生产环境准备与Docker化
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Sprint 3: 多用户Profile与RBAC架构', () => {
  describe('Task 3.1: UserProfileContext', () => {
    it('UserProfileContext文件应该存在', () => {
      const contextPath = path.join(__dirname, '../client/src/contexts/UserProfileContext.tsx');
      expect(fs.existsSync(contextPath)).toBe(true);
    });

    it('UserProfileContext应该导出必要的类型和函数', async () => {
      const contextPath = path.join(__dirname, '../client/src/contexts/UserProfileContext.tsx');
      const content = fs.readFileSync(contextPath, 'utf-8');
      
      // 检查角色类型定义
      expect(content).toContain('UserRole');
      expect(content).toContain('admin');
      expect(content).toContain('manager');
      expect(content).toContain('staff');
      
      // 检查Context和Provider
      expect(content).toContain('UserProfileContext');
      expect(content).toContain('UserProfileProvider');
      expect(content).toContain('useUserProfile');
      
      // 检查switchRole函数
      expect(content).toContain('switchRole');
    });
  });

  describe('Task 3.2: Profile Switcher UI', () => {
    it('ProfileSwitcher组件文件应该存在', () => {
      const switcherPath = path.join(__dirname, '../client/src/components/ProfileSwitcher.tsx');
      expect(fs.existsSync(switcherPath)).toBe(true);
    });

    it('ProfileSwitcher应该包含角色切换选项', async () => {
      const switcherPath = path.join(__dirname, '../client/src/components/ProfileSwitcher.tsx');
      const content = fs.readFileSync(switcherPath, 'utf-8');
      
      // 检查角色选项
      expect(content).toMatch(/管理员|Administrator|admin/i);
      expect(content).toMatch(/经理|Manager|manager/i);
      expect(content).toMatch(/员工|Staff|staff/i);
      
      // 检查下拉菜单组件
      expect(content).toMatch(/DropdownMenu|Select|Menu/i);
    });
  });

  describe('Task 3.3: RBAC条件渲染', () => {
    it('AdminDashboard页面应该存在', () => {
      const adminPath = path.join(__dirname, '../client/src/pages/AdminDashboard.tsx');
      expect(fs.existsSync(adminPath)).toBe(true);
    });

    it('menuConfig应该包含权限字段', async () => {
      const menuConfigPath = path.join(__dirname, '../client/src/config/menuConfig.ts');
      const content = fs.readFileSync(menuConfigPath, 'utf-8');
      
      // 检查权限字段定义
      expect(content).toContain('allowedRoles');
    });

    it('Layout应该实现RBAC过滤逻辑', async () => {
      const layoutPath = path.join(__dirname, '../client/src/components/Layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      
      // 检查权限过滤
      expect(content).toMatch(/filteredMenuConfig|filter.*requiredRole|hasPermission/i);
    });
  });
});

describe('Sprint 4: 生产环境准备与Docker化', () => {
  describe('Task 4.1: API服务层', () => {
    it('meetingService文件应该存在', () => {
      const servicePath = path.join(__dirname, '../client/src/api/meetingService.ts');
      expect(fs.existsSync(servicePath)).toBe(true);
    });

    it('meetingService应该包含API调用函数', async () => {
      const servicePath = path.join(__dirname, '../client/src/api/meetingService.ts');
      const content = fs.readFileSync(servicePath, 'utf-8');
      
      // 检查API基础URL配置
      expect(content).toMatch(/API_URL|VITE_API_URL|baseURL/i);
      
      // 检查CRUD函数
      expect(content).toMatch(/create|get|update|delete|save|fetch/i);
    });
  });

  describe('Task 4.2: Docker配置', () => {
    it('前端Dockerfile应该存在', () => {
      const dockerfilePath = path.join(__dirname, '../docker/Dockerfile');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('后端Dockerfile应该存在', () => {
      const dockerfilePath = path.join(__dirname, '../docker/Dockerfile.backend');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('docker-compose.yml应该存在', () => {
      const composePath = path.join(__dirname, '../docker-compose.yml');
      expect(fs.existsSync(composePath)).toBe(true);
    });

    it('nginx配置文件应该存在', () => {
      const nginxPath = path.join(__dirname, '../docker/nginx.conf');
      expect(fs.existsSync(nginxPath)).toBe(true);
    });

    it('docker-compose.yml应该包含必要的服务', async () => {
      const composePath = path.join(__dirname, '../docker-compose.yml');
      const content = fs.readFileSync(composePath, 'utf-8');
      
      // 检查服务定义
      expect(content).toMatch(/services:/i);
      expect(content).toMatch(/mysql|postgres|db/i);
      expect(content).toMatch(/redis/i);
    });

    it('Dockerfile应该使用Node 18 Alpine', async () => {
      const dockerfilePath = path.join(__dirname, '../docker/Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      
      expect(content).toMatch(/node:18.*alpine/i);
    });
  });

  describe('Task 4.3: 环境变量文档', () => {
    it('ENV_VARIABLES.md文档应该存在', () => {
      const envDocPath = path.join(__dirname, '../docker/ENV_VARIABLES.md');
      expect(fs.existsSync(envDocPath)).toBe(true);
    });

    it('环境变量文档应该包含必要的配置说明', async () => {
      const envDocPath = path.join(__dirname, '../docker/ENV_VARIABLES.md');
      const content = fs.readFileSync(envDocPath, 'utf-8');
      
      // 检查必要的环境变量说明
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('JWT_SECRET');
      expect(content).toMatch(/VITE_APP_ID|APP_ID/i);
    });

    it('init-db.sql应该存在', () => {
      const initDbPath = path.join(__dirname, '../docker/init-db.sql');
      expect(fs.existsSync(initDbPath)).toBe(true);
    });
  });
});

describe('文件完整性检查', () => {
  it('所有Sprint 3新增文件应该存在', () => {
    const files = [
      '../client/src/contexts/UserProfileContext.tsx',
      '../client/src/components/ProfileSwitcher.tsx',
      '../client/src/pages/AdminDashboard.tsx',
    ];
    
    files.forEach(file => {
      const filePath = path.join(__dirname, file);
      expect(fs.existsSync(filePath), `文件应该存在: ${file}`).toBe(true);
    });
  });

  it('所有Sprint 4新增文件应该存在', () => {
    const files = [
      '../client/src/api/meetingService.ts',
      '../docker/Dockerfile',
      '../docker/Dockerfile.backend',
      '../docker/nginx.conf',
      '../docker/default.conf',
      '../docker/ENV_VARIABLES.md',
      '../docker/init-db.sql',
    ];
    
    files.forEach(file => {
      const filePath = path.join(__dirname, file);
      expect(fs.existsSync(filePath), `文件应该存在: ${file}`).toBe(true);
    });
  });
});
