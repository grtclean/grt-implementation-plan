import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock database functions
vi.mock('./db', () => ({
  createFeedback: vi.fn(),
  getAllFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
  trackEvent: vi.fn(),
  getAnalyticsEvents: vi.fn(),
  createMigrationTask: vi.fn().mockResolvedValue({ id: 1 }),
  getAllMigrationTasks: vi.fn().mockResolvedValue([
    {
      id: 1,
      moduleId: 'crm_customers',
      moduleName: '客户管理',
      sourceTable: 'M0-1_客户管理',
      targetTable: 'customers',
      totalRecords: 350,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: 'pending',
      priority: 'high',
      assigneeId: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getMigrationTaskById: vi.fn().mockResolvedValue({
    id: 1,
    moduleId: 'crm_customers',
    moduleName: '客户管理',
    sourceTable: 'M0-1_客户管理',
    targetTable: 'customers',
    totalRecords: 350,
    migratedRecords: 0,
    validatedRecords: 0,
    errorRecords: 0,
    status: 'pending',
    priority: 'high',
    assigneeId: null,
    notes: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateMigrationTask: vi.fn().mockResolvedValue({ success: true }),
  deleteMigrationTask: vi.fn().mockResolvedValue({ success: true }),
  initDefaultMigrationTasks: vi.fn().mockResolvedValue({ success: true, message: 'Tasks initialized' }),
}));

// Mock jiandaoyun service
vi.mock('./jiandaoyun', () => ({
  getJiandaoyunSyncService: vi.fn().mockReturnValue({
    isConfigured: () => true,
    getCorpId: () => 'test-corp',
    getStats: () => ({
      totalApps: 47,
      totalForms: 120,
      totalRecords: 15680,
      lastSyncTime: null,
    }),
    syncApps: vi.fn().mockResolvedValue([
      { _id: 'app1', name: '项目管理', createTime: '2024-01-01', updateTime: '2026-01-15' },
    ]),
    fullSync: vi.fn().mockResolvedValue({
      apps: [{ _id: 'app1', name: '项目管理' }],
      totalRecords: 15680,
      formCounts: { '项目管理/M0-1_客户管理': 350 },
    }),
  }),
  getJiandaoyunUserSyncService: vi.fn().mockReturnValue({
    syncMembers: vi.fn().mockResolvedValue({ synced: 0 }),
    syncDepartments: vi.fn().mockResolvedValue({ synced: 0 }),
    syncRoles: vi.fn().mockResolvedValue({ synced: 0 }),
  }),
  mockJiandaoyunData: {
    apps: [
      { _id: 'app1', name: '项目管理', createTime: '2024-01-01', updateTime: '2026-01-15' },
    ],
    stats: {
      totalApps: 47,
      totalForms: 120,
      totalRecords: 15680,
      lastSyncTime: new Date('2026-01-16T00:00:00Z'),
    },
    formCounts: {
      '项目管理/M0-1_客户管理': 350,
    },
  },
}));

// Mock jiandaoyun-scheduler service
vi.mock('./services/jiandaoyun-scheduler.service', () => ({
  getJiandaoyunScheduler: vi.fn().mockReturnValue({
    getStats: vi.fn().mockResolvedValue({ totalTasks: 0, completedTasks: 0 }),
  }),
}));

// Mock permission-mapping service
vi.mock('./services/permission-mapping.service', () => ({
  getPermissionMappingService: vi.fn().mockReturnValue({}),
  GRT_ROLES: [],
  GRT_PERMISSIONS: [],
}));

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(role: 'user' | 'admin' = 'user'): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    loginMethod: 'manus',
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext['res'],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext['res'],
  };
}

describe('Migration Tasks API', () => {
  describe('migration.list', () => {
    it('should return list of migration tasks for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const tasks = await caller.migration.list();
      
      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty('moduleId');
      expect(tasks[0]).toHaveProperty('moduleName');
      expect(tasks[0]).toHaveProperty('status');
    });
  });

  describe('migration.getById', () => {
    it('should return a single migration task by id', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const task = await caller.migration.getById({ id: 1 });
      
      expect(task).toBeDefined();
      expect(task?.id).toBe(1);
      expect(task?.moduleId).toBe('crm_customers');
      expect(task?.moduleName).toBe('客户管理');
    });
  });

  describe('migration.create', () => {
    it('should create a new migration task', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.migration.create({
        moduleId: 'test_module',
        moduleName: '测试模块',
        sourceTable: 'source_table',
        targetTable: 'target_table',
        totalRecords: 100,
        priority: 'medium',
      });

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('migration.update', () => {
    it('should update migration task status', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.migration.update({
        id: 1,
        status: 'in_progress',
      });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it('should update migration task notes', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.migration.update({
        id: 1,
        notes: 'Test notes',
      });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('migration.init', () => {
    it('should initialize default migration tasks', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.migration.init();
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('migration.delete', () => {
    it('should delete migration task for admin user', async () => {
      const ctx = createAuthContext('admin');
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.migration.delete({ id: 1 });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });
});

describe('Jiandaoyun API', () => {
  describe('jiandaoyun.getStatus', () => {
    it('should return API status for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.jiandaoyun.getStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('stats');
      expect(status.stats).toHaveProperty('totalApps');
      expect(status.stats).toHaveProperty('totalForms');
      expect(status.stats).toHaveProperty('totalRecords');
    });
  });

  describe('jiandaoyun.getApps', () => {
    it('should return apps result for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.jiandaoyun.getApps();

      expect(result).toBeDefined();
      expect(Array.isArray(result.apps)).toBe(true);
      expect(result.apps.length).toBeGreaterThan(0);
      expect(result.apps[0]).toHaveProperty('_id');
      expect(result.apps[0]).toHaveProperty('name');
    });
  });

  describe('jiandaoyun.getSyncStats', () => {
    it('should return sync stats for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.jiandaoyun.getSyncStats();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('jiandaoyun.fullSync', () => {
    it('should perform sync and return stats', async () => {
      const ctx = createAuthContext('admin');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.jiandaoyun.fullSync();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
