/**
 * 部署包生成服务单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  generateDeploymentPackageFiles,
  generateDeploymentPackageZipContent,
} from './deployment-package.service';

describe('deployment-package.service', () => {
  describe('generateDeploymentPackageFiles', () => {
    it('应该生成所有必需的部署文件', () => {
      const files = generateDeploymentPackageFiles();
      
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBe(5);
      
      const filenames = files.map(f => f.filename);
      expect(filenames).toContain('README.md');
      expect(filenames).toContain('docker-compose.yml');
      expect(filenames).toContain('Dockerfile');
      expect(filenames).toContain('config.env.template');
      expect(filenames).toContain('deploy.sh');
    });

    it('README.md应该包含部署说明', () => {
      const files = generateDeploymentPackageFiles();
      const readme = files.find(f => f.filename === 'README.md');
      
      expect(readme).toBeDefined();
      expect(readme?.content).toContain('GRT智慧系统部署包');
      expect(readme?.content).toContain('快速部署');
      expect(readme?.content).toContain('Docker');
    });

    it('docker-compose.yml应该包含服务定义', () => {
      const files = generateDeploymentPackageFiles();
      const compose = files.find(f => f.filename === 'docker-compose.yml');
      
      expect(compose).toBeDefined();
      expect(compose?.content).toContain('services:');
      expect(compose?.content).toContain('app:');
      expect(compose?.content).toContain('db:');
      expect(compose?.content).toContain('redis:');
    });

    it('Dockerfile应该包含构建指令', () => {
      const files = generateDeploymentPackageFiles();
      const dockerfile = files.find(f => f.filename === 'Dockerfile');
      
      expect(dockerfile).toBeDefined();
      expect(dockerfile?.content).toContain('FROM node:');
      expect(dockerfile?.content).toContain('WORKDIR /app');
      expect(dockerfile?.content).toContain('pnpm install');
      expect(dockerfile?.content).toContain('EXPOSE 3000');
    });

    it('config.env.template应该包含环境变量模板', () => {
      const files = generateDeploymentPackageFiles();
      const envTemplate = files.find(f => f.filename === 'config.env.template');
      
      expect(envTemplate).toBeDefined();
      expect(envTemplate?.content).toContain('DATABASE_URL');
      expect(envTemplate?.content).toContain('JWT_SECRET');
      expect(envTemplate?.content).toContain('NODE_ENV');
    });

    it('deploy.sh应该包含部署脚本', () => {
      const files = generateDeploymentPackageFiles();
      const deployScript = files.find(f => f.filename === 'deploy.sh');
      
      expect(deployScript).toBeDefined();
      expect(deployScript?.content).toContain('#!/bin/bash');
      expect(deployScript?.content).toContain('docker-compose');
      expect(deployScript?.content).toContain('部署完成');
    });
  });

  describe('generateDeploymentPackageZipContent', () => {
    it('应该返回有效的JSON字符串', () => {
      const content = generateDeploymentPackageZipContent();
      
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('应该包含包名和版本信息', () => {
      const content = generateDeploymentPackageZipContent();
      const packageData = JSON.parse(content);
      
      expect(packageData.name).toBe('grt-deployment-package');
      expect(packageData.version).toBe('4.8.23');
      expect(packageData.generatedAt).toBeDefined();
    });

    it('应该包含所有文件', () => {
      const content = generateDeploymentPackageZipContent();
      const packageData = JSON.parse(content);
      
      expect(packageData.files).toBeInstanceOf(Array);
      expect(packageData.files.length).toBe(5);
      
      packageData.files.forEach((file: any) => {
        expect(file.filename).toBeDefined();
        expect(file.content).toBeDefined();
      });
    });
  });
});
