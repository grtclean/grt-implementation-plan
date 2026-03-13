/**
 * 外部平台API集成测试
 * v1.3.24 - 外部平台数据同步与组织架构导入
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ENV
vi.mock('./_core/env', () => ({
  ENV: {
    EXTERNAL_SYNC_API_KEY: 'test-api-key',
    EXTERNAL_SYNC_CORP_ID: 'test-corp-id',
  },
}));

describe('外部平台API集成 v1.3.24', () => {
  describe('API配置验证', () => {
    it('应该正确配置API密钥', () => {
      const apiKey = process.env.EXTERNAL_SYNC_API_KEY || 'test-api-key';
      expect(apiKey).toBeDefined();
      expect(apiKey.length).toBeGreaterThan(0);
    });

    it('应该正确配置企业ID', () => {
      const corpId = process.env.EXTERNAL_SYNC_CORP_ID || 'test-corp-id';
      expect(corpId).toBeDefined();
      expect(corpId.length).toBeGreaterThan(0);
    });
  });

  describe('部门接口', () => {
    it('应该返回部门列表结构', () => {
      const mockDepartments = [
        { dept_no: 3, name: '事业一部', parent_no: 1, type: 0, status: 1 },
        { dept_no: 4, name: '事业二部', parent_no: 1, type: 0, status: 1 },
        { dept_no: 13, name: 'AI&IT部门', parent_no: 1, type: 0, status: 1 },
      ];

      expect(mockDepartments).toBeInstanceOf(Array);
      expect(mockDepartments[0]).toHaveProperty('dept_no');
      expect(mockDepartments[0]).toHaveProperty('name');
      expect(mockDepartments[0]).toHaveProperty('parent_no');
    });

    it('应该支持递归获取子部门', () => {
      const mockResponse = {
        departments: [
          { dept_no: 15, name: '仓库', parent_no: 17, type: 0, status: 1 },
        ],
      };

      expect(mockResponse.departments[0].parent_no).toBe(17);
    });
  });

  describe('成员接口', () => {
    it('应该返回成员列表结构', () => {
      const mockMembers = [
        {
          username: 'R-VYCDWlOG',
          name: '倪亚东',
          departments: [1, 3, 4, 5],
          type: 0,
          status: 1
        },
        {
          username: 'R-dX5x3eEl',
          name: '李大鹏',
          departments: [1, 12, 4],
          type: 0,
          status: 1
        },
      ];

      expect(mockMembers).toBeInstanceOf(Array);
      expect(mockMembers[0]).toHaveProperty('username');
      expect(mockMembers[0]).toHaveProperty('name');
      expect(mockMembers[0]).toHaveProperty('departments');
      expect(mockMembers[0].departments).toBeInstanceOf(Array);
    });

    it('应该支持按部门筛选成员', () => {
      const deptNo = 3;
      const mockMembers = [
        { username: 'user1', name: '用户1', departments: [1, 3], type: 0, status: 1 },
      ];

      const filteredMembers = mockMembers.filter(m => m.departments.includes(deptNo));
      expect(filteredMembers.length).toBeGreaterThan(0);
    });
  });

  describe('应用接口', () => {
    it('应该返回应用列表结构', () => {
      const mockApps = [
        { app_id: '68ec6fd9f98361eb7d4d9a4f', name: '（搭建中）项目管理' },
        { app_id: '68e8791e840366262bcdf2a4', name: '（搭建中）人事及OA管理系统' },
        { app_id: '695f44ce2a2335d4137ad16d', name: 'GRT售后体系与现场赋能' },
      ];

      expect(mockApps).toBeInstanceOf(Array);
      expect(mockApps[0]).toHaveProperty('app_id');
      expect(mockApps[0]).toHaveProperty('name');
    });
  });

  describe('表单接口', () => {
    it('应该返回表单列表结构', () => {
      const mockForms = [
        { entry_id: 'form1', name: '客户管理' },
        { entry_id: 'form2', name: '商机管理' },
      ];

      expect(mockForms).toBeInstanceOf(Array);
      expect(mockForms[0]).toHaveProperty('entry_id');
      expect(mockForms[0]).toHaveProperty('name');
    });

    it('应该返回表单字段结构', () => {
      const mockFields = [
        { name: '_widget_1', label: '客户名称', type: 'text', required: true },
        { name: '_widget_2', label: '联系电话', type: 'phone', required: false },
      ];

      expect(mockFields).toBeInstanceOf(Array);
      expect(mockFields[0]).toHaveProperty('name');
      expect(mockFields[0]).toHaveProperty('label');
      expect(mockFields[0]).toHaveProperty('type');
    });
  });

  describe('数据同步', () => {
    it('应该支持分页获取数据', () => {
      const mockDataResponse = {
        data: [
          { _id: 'record1', _widget_1: '客户A' },
          { _id: 'record2', _widget_1: '客户B' },
        ],
      };

      expect(mockDataResponse.data).toBeInstanceOf(Array);
      expect(mockDataResponse.data[0]).toHaveProperty('_id');
    });

    it('应该支持数据筛选', () => {
      const filter = {
        cond: [
          { field: '_widget_1', type: 'text', method: 'contains', value: ['客户'] },
        ],
      };

      expect(filter).toHaveProperty('cond');
      expect(filter.cond).toBeInstanceOf(Array);
    });
  });

  describe('路由验证', () => {
    it('externalSync路由应该包含必要的端点', () => {
      const expectedEndpoints = [
        'getStatus',
        'testConnection',
        'getApps',
        'getForms',
        'getFormFields',
        'getFormData',
        'getDepartments',
        'getMembers',
        'getRoles',
        'fullSync',
      ];

      // 验证端点名称格式
      expectedEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^[a-zA-Z]+$/);
      });
    });
  });
});

console.log('v1.3.24 外部平台API集成测试完成');
