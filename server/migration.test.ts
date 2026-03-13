import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock database functions
const mockMigrationTasks = [
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
];

const mockDbChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(mockMigrationTasks),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 1, success: true, ...mockMigrationTasks[0] }]),
};

vi.mock("./permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('./db', () => ({
  requireDb: vi.fn().mockResolvedValue({
    select: vi.fn(() => mockDbChain),
    insert: vi.fn(() => mockDbChain),
    update: vi.fn(() => mockDbChain),
    delete: vi.fn(() => mockDbChain),
  }),
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

// Mock external sync service
vi.mock('./external-sync', () => ({
  getExternalSyncService: vi.fn().mockReturnValue({
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
  getExternalSyncUserService: vi.fn().mockReturnValue({
    syncMembers: vi.fn().mockResolvedValue({ synced: 0 }),
    syncDepartments: vi.fn().mockResolvedValue({ synced: 0 }),
    syncRoles: vi.fn().mockResolvedValue({ synced: 0 }),
  }),
  mockExternalSyncData: {
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

// Mock external-sync-scheduler service
vi.mock('./services/external-sync-scheduler.service', () => ({
  getExternalSyncScheduler: vi.fn().mockReturnValue({
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
    it('should create a new migration task', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.migration.init({
        moduleName: '测试模块',
        sourceTable: 'source_table',
        targetTable: 'target_table',
        totalRecords: 100,
      });

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });
});

describe('ExternalSync API', () => {
  describe('externalSync.getStatus', () => {
    it('should return API status for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.externalSync.getStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('stats');
      expect(status.stats).toHaveProperty('totalApps');
      expect(status.stats).toHaveProperty('totalForms');
      expect(status.stats).toHaveProperty('totalRecords');
    });
  });

  describe('externalSync.getApps', () => {
    it('should return apps result for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.externalSync.getApps();

      expect(result).toBeDefined();
      expect(Array.isArray(result.apps)).toBe(true);
      expect(result.apps.length).toBeGreaterThan(0);
      expect(result.apps[0]).toHaveProperty('_id');
      expect(result.apps[0]).toHaveProperty('name');
    });
  });

  describe('externalSync.getSyncStats', () => {
    it('should return sync stats for authenticated user', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.externalSync.getSyncStats();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('externalSync.fullSync', () => {
    it('should perform sync and return stats', async () => {
      const ctx = createAuthContext('admin');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.externalSync.fullSync();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
