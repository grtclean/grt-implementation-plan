/**
 * GRT 5.0 生产看板路由
 * 实现工单管理、设备状态、生产进度等功能
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// ===== 类型定义 =====

// 工单状态
type WorkOrderStatus = 'draft' | 'planned' | 'in_progress' | 'quality_check' | 'completed' | 'on_hold' | 'cancelled';

// 工单优先级
type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

// 设备状态
type EquipmentStatus = 'idle' | 'running' | 'maintenance' | 'fault' | 'offline';

// ===== Schema定义 =====

const WorkOrderSchema = z.object({
  orderCode: z.string().optional(),
  projectId: z.number().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
  productId: z.number().optional(),
  productCode: z.string().optional(),
  productName: z.string(),
  productModel: z.string().optional(),
  quantity: z.number().min(1),
  unit: z.string().default('台'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  assignedTeam: z.string().optional(),
  assignedLeaderId: z.number().optional(),
  assignedLeaderName: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
});

const QCRecordSchema = z.object({
  workOrderId: z.number(),
  checkType: z.enum(['incoming', 'process', 'final', 'patrol']),
  checkPoint: z.string(),
  totalItems: z.number(),
  passItems: z.number(),
  failItems: z.number(),
  result: z.enum(['pass', 'fail', 'conditional']),
  inspector: z.string(),
  inspectorId: z.number().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
  })).optional(),
});

// ===== 模拟数据存储 =====

// 工单数据
let workOrders: any[] = [
  {
    id: 1,
    orderCode: 'WO-2026-001',
    projectId: 1,
    projectCode: 'PRJ-2026-001',
    projectName: '工业清洗系统 IC-2000',
    productId: 1,
    productCode: 'IC-2000-X',
    productName: '工业清洗系统 IC-2000',
    productModel: 'IC-2000-X',
    quantity: 2,
    unit: '台',
    priority: 'high',
    status: 'in_progress',
    progress: 75,
    plannedStartDate: '2026-01-15',
    plannedEndDate: '2026-01-30',
    actualStartDate: '2026-01-15',
    estimatedHours: 160,
    actualHours: 120,
    assignedTeam: 'A组',
    assignedLeaderId: 1,
    assignedLeaderName: '张工',
    customerId: 1,
    customerName: '某汽车零部件公司',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-28T16:00:00Z',
  },
  {
    id: 2,
    orderCode: 'WO-2026-002',
    projectId: 2,
    projectCode: 'PRJ-2026-002',
    projectName: '喷淋清洗设备 SC-500',
    productId: 2,
    productCode: 'SC-500-A',
    productName: '喷淋清洗设备 SC-500',
    productModel: 'SC-500-A',
    quantity: 5,
    unit: '台',
    priority: 'normal',
    status: 'planned',
    progress: 0,
    plannedStartDate: '2026-02-01',
    plannedEndDate: '2026-02-20',
    estimatedHours: 200,
    actualHours: 0,
    assignedTeam: 'B组',
    assignedLeaderId: 2,
    assignedLeaderName: '李工',
    customerId: 2,
    customerName: '某电子制造公司',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 3,
    orderCode: 'WO-2026-003',
    projectId: 1,
    projectCode: 'PRJ-2026-001',
    projectName: '工业清洗系统 IC-2000',
    productId: 1,
    productCode: 'IC-2000-X',
    productName: '工业清洗系统 IC-2000',
    productModel: 'IC-2000-X',
    quantity: 2,
    unit: '台',
    priority: 'normal',
    status: 'quality_check',
    progress: 95,
    plannedStartDate: '2026-01-15',
    plannedEndDate: '2026-01-30',
    actualStartDate: '2026-01-16',
    estimatedHours: 160,
    actualHours: 155,
    assignedTeam: 'A组',
    assignedLeaderId: 1,
    assignedLeaderName: '张工',
    customerId: 1,
    customerName: '某汽车零部件公司',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-29T14:00:00Z',
  },
  {
    id: 4,
    orderCode: 'WO-2026-004',
    projectId: 3,
    projectCode: 'PRJ-2026-003',
    projectName: '超声波清洗机 UC-300',
    productId: 3,
    productCode: 'UC-300-B',
    productName: '超声波清洗机 UC-300',
    productModel: 'UC-300-B',
    quantity: 8,
    unit: '台',
    priority: 'urgent',
    status: 'in_progress',
    progress: 45,
    plannedStartDate: '2026-01-20',
    plannedEndDate: '2026-02-10',
    actualStartDate: '2026-01-20',
    estimatedHours: 320,
    actualHours: 140,
    assignedTeam: 'C组',
    assignedLeaderId: 3,
    assignedLeaderName: '王工',
    customerId: 3,
    customerName: '某医疗器械公司',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-30T11:00:00Z',
  },
  {
    id: 5,
    orderCode: 'WO-2026-005',
    projectId: 4,
    projectCode: 'PRJ-2026-004',
    projectName: '真空干燥系统 VD-100',
    productId: 4,
    productCode: 'VD-100-C',
    productName: '真空干燥系统 VD-100',
    productModel: 'VD-100-C',
    quantity: 3,
    unit: '台',
    priority: 'high',
    status: 'completed',
    progress: 100,
    plannedStartDate: '2026-01-05',
    plannedEndDate: '2026-01-25',
    actualStartDate: '2026-01-05',
    actualEndDate: '2026-01-24',
    estimatedHours: 240,
    actualHours: 235,
    assignedTeam: 'A组',
    assignedLeaderId: 1,
    assignedLeaderName: '张工',
    customerId: 4,
    customerName: '某半导体公司',
    createdAt: '2026-01-02T08:00:00Z',
    updatedAt: '2026-01-24T17:00:00Z',
  },
];

// QC记录数据
let qcRecords: any[] = [
  {
    id: 1,
    workOrderId: 1,
    workOrderCode: 'WO-2026-001',
    checkType: 'process',
    checkPoint: '焊接工序',
    totalItems: 50,
    passItems: 48,
    failItems: 2,
    result: 'pass',
    inspector: '质检员A',
    inspectorId: 101,
    checkedAt: '2026-01-25T14:00:00Z',
    createdAt: '2026-01-25T14:00:00Z',
  },
  {
    id: 2,
    workOrderId: 3,
    workOrderCode: 'WO-2026-003',
    checkType: 'final',
    checkPoint: '整机测试',
    totalItems: 100,
    passItems: 98,
    failItems: 2,
    result: 'pass',
    inspector: '质检员B',
    inspectorId: 102,
    checkedAt: '2026-01-29T10:00:00Z',
    createdAt: '2026-01-29T10:00:00Z',
  },
  {
    id: 3,
    workOrderId: 4,
    workOrderCode: 'WO-2026-004',
    checkType: 'incoming',
    checkPoint: '原材料检验',
    totalItems: 200,
    passItems: 195,
    failItems: 5,
    result: 'conditional',
    inspector: '质检员A',
    inspectorId: 101,
    notes: '5件外观轻微划痕，不影响使用',
    checkedAt: '2026-01-21T09:00:00Z',
    createdAt: '2026-01-21T09:00:00Z',
  },
];

// 设备数据
let equipments: any[] = [
  { id: 1, code: 'EQ-001', name: '数控加工中心', type: 'CNC', status: 'running', location: '车间A', currentWorkOrderId: 1, utilization: 85 },
  { id: 2, code: 'EQ-002', name: '焊接机器人', type: 'ROBOT', status: 'running', location: '车间A', currentWorkOrderId: 1, utilization: 78 },
  { id: 3, code: 'EQ-003', name: '激光切割机', type: 'LASER', status: 'idle', location: '车间B', currentWorkOrderId: null, utilization: 45 },
  { id: 4, code: 'EQ-004', name: '喷涂设备', type: 'SPRAY', status: 'maintenance', location: '车间C', currentWorkOrderId: null, utilization: 0 },
  { id: 5, code: 'EQ-005', name: '装配线', type: 'ASSEMBLY', status: 'running', location: '车间D', currentWorkOrderId: 4, utilization: 92 },
];

// ID计数器
let workOrderIdCounter = 6;
let qcRecordIdCounter = 4;

// 生成唯一编码
function generateCode(prefix: string): string {
  const year = new Date().getFullYear();
  const seq = String(workOrderIdCounter).padStart(3, '0');
  return `${prefix}-${year}-${seq}`;
}

export const productionRouter = router({
  // ===== 工单管理 =====
  
  /**
   * 获取工单列表
   */
  list: publicProcedure
    .input(z.object({
      status: z.enum(['draft', 'planned', 'in_progress', 'quality_check', 'completed', 'on_hold', 'cancelled']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      projectId: z.number().optional(),
      assignedTeam: z.string().optional(),
      customerId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(({ input }) => {
      let result = [...workOrders];
      
      if (input?.status) {
        result = result.filter(wo => wo.status === input.status);
      }
      if (input?.priority) {
        result = result.filter(wo => wo.priority === input.priority);
      }
      if (input?.projectId) {
        result = result.filter(wo => wo.projectId === input.projectId);
      }
      if (input?.assignedTeam) {
        result = result.filter(wo => wo.assignedTeam === input.assignedTeam);
      }
      if (input?.customerId) {
        result = result.filter(wo => wo.customerId === input.customerId);
      }
      
      // 按更新时间倒序
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      const total = result.length;
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const items = result.slice(start, start + pageSize);
      
      return { items, total, page, pageSize };
    }),
  
  /**
   * 获取单个工单
   */
  getById: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      orderCode: z.string().optional(),
    }))
    .query(({ input }) => {
      const wo = workOrders.find(
        w => w.id === input.id || w.orderCode === input.orderCode
      );
      if (!wo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      }
      return wo;
    }),
  
  /**
   * 创建工单
   */
  create: protectedProcedure
    .input(WorkOrderSchema)
    .mutation(({ input, ctx }) => {
      const orderCode = input.orderCode || generateCode('WO');
      
      const newWorkOrder = {
        id: workOrderIdCounter++,
        orderCode,
        ...input,
        status: 'draft',
        progress: 0,
        actualHours: 0,
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      workOrders.push(newWorkOrder);
      return newWorkOrder;
    }),
  
  /**
   * 更新工单
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
    }).merge(WorkOrderSchema.partial()))
    .mutation(({ input }) => {
      const index = workOrders.findIndex(wo => wo.id === input.id);
      if (index === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      }
      
      workOrders[index] = {
        ...workOrders[index],
        ...input,
        updatedAt: new Date().toISOString(),
      };
      
      return workOrders[index];
    }),
  
  /**
   * 更新工单状态
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'planned', 'in_progress', 'quality_check', 'completed', 'on_hold', 'cancelled']),
      notes: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const wo = workOrders.find(w => w.id === input.id);
      if (!wo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      }
      
      wo.status = input.status;
      wo.updatedAt = new Date().toISOString();
      
      // 记录状态变更
      if (input.status === 'in_progress' && !wo.actualStartDate) {
        wo.actualStartDate = new Date().toISOString().split('T')[0];
      }
      if (input.status === 'completed') {
        wo.actualEndDate = new Date().toISOString().split('T')[0];
        wo.progress = 100;
      }
      
      return wo;
    }),
  
  /**
   * 更新工单进度
   */
  updateProgress: protectedProcedure
    .input(z.object({
      id: z.number(),
      progress: z.number().min(0).max(100),
      actualHours: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const wo = workOrders.find(w => w.id === input.id);
      if (!wo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      }
      
      wo.progress = input.progress;
      if (input.actualHours !== undefined) {
        wo.actualHours = input.actualHours;
      }
      wo.updatedAt = new Date().toISOString();
      
      // 自动更新状态
      if (input.progress === 100 && wo.status !== 'completed') {
        wo.status = 'quality_check';
      } else if (input.progress > 0 && wo.status === 'planned') {
        wo.status = 'in_progress';
        wo.actualStartDate = wo.actualStartDate || new Date().toISOString().split('T')[0];
      }
      
      return wo;
    }),
  
  /**
   * 删除工单
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      const index = workOrders.findIndex(wo => wo.id === input.id);
      if (index === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      }
      
      const wo = workOrders[index];
      if (!['draft', 'cancelled'].includes(wo.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '只能删除草稿或已取消的工单' });
      }
      
      workOrders.splice(index, 1);
      return { success: true };
    }),
  
  // ===== QC质检 =====
  
  /**
   * 获取QC记录列表
   */
  getQCRecords: publicProcedure
    .input(z.object({
      workOrderId: z.number().optional(),
      checkType: z.enum(['incoming', 'process', 'final', 'patrol']).optional(),
      result: z.enum(['pass', 'fail', 'conditional']).optional(),
    }).optional())
    .query(({ input }) => {
      let result = [...qcRecords];
      
      if (input?.workOrderId) {
        result = result.filter(r => r.workOrderId === input.workOrderId);
      }
      if (input?.checkType) {
        result = result.filter(r => r.checkType === input.checkType);
      }
      if (input?.result) {
        result = result.filter(r => r.result === input.result);
      }
      
      return result;
    }),
  
  /**
   * 创建QC记录
   */
  createQCRecord: protectedProcedure
    .input(QCRecordSchema)
    .mutation(({ input, ctx }) => {
      const wo = workOrders.find(w => w.id === input.workOrderId);
      if (!wo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      }
      
      const newRecord = {
        id: qcRecordIdCounter++,
        ...input,
        workOrderCode: wo.orderCode,
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      
      qcRecords.push(newRecord);
      return newRecord;
    }),
  
  /**
   * 获取QC统计
   */
  getQCStats: publicProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      let records = [...qcRecords];
      
      const totalRecords = records.length;
      const passCount = records.filter(r => r.result === 'pass').length;
      const failCount = records.filter(r => r.result === 'fail').length;
      const conditionalCount = records.filter(r => r.result === 'conditional').length;
      
      const totalItems = records.reduce((sum, r) => sum + r.totalItems, 0);
      const totalPass = records.reduce((sum, r) => sum + r.passItems, 0);
      const totalFail = records.reduce((sum, r) => sum + r.failItems, 0);
      
      return {
        stats: {
          totalRecords,
          passCount,
          failCount,
          conditionalCount,
          passRate: totalRecords > 0 ? ((passCount / totalRecords) * 100).toFixed(1) + '%' : '0%',
          totalItems,
          totalPass,
          totalFail,
          itemPassRate: totalItems > 0 ? ((totalPass / totalItems) * 100).toFixed(1) + '%' : '0%',
        }
      };
    }),
  
  // ===== 设备管理 =====
  
  /**
   * 获取设备列表
   */
  getEquipments: publicProcedure
    .input(z.object({
      status: z.enum(['idle', 'running', 'maintenance', 'fault', 'offline']).optional(),
      type: z.string().optional(),
      location: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      let result = [...equipments];
      
      if (input?.status) {
        result = result.filter(e => e.status === input.status);
      }
      if (input?.type) {
        result = result.filter(e => e.type === input.type);
      }
      if (input?.location) {
        result = result.filter(e => e.location === input.location);
      }
      
      return result;
    }),
  
  /**
   * 更新设备状态
   */
  updateEquipmentStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['idle', 'running', 'maintenance', 'fault', 'offline']),
      currentWorkOrderId: z.number().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const eq = equipments.find(e => e.id === input.id);
      if (!eq) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '设备不存在' });
      }
      
      eq.status = input.status;
      if (input.currentWorkOrderId !== undefined) {
        eq.currentWorkOrderId = input.currentWorkOrderId;
      }
      
      return eq;
    }),
  
  // ===== 生产统计 =====
  
  /**
   * 获取生产看板统计
   */
  getDashboardStats: publicProcedure.query(() => {
    const totalOrders = workOrders.length;
    const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress').length;
    const completedOrders = workOrders.filter(wo => wo.status === 'completed').length;
    const qualityCheckOrders = workOrders.filter(wo => wo.status === 'quality_check').length;
    const plannedOrders = workOrders.filter(wo => wo.status === 'planned').length;
    
    const totalQuantity = workOrders.reduce((sum, wo) => sum + wo.quantity, 0);
    const completedQuantity = workOrders
      .filter(wo => wo.status === 'completed')
      .reduce((sum, wo) => sum + wo.quantity, 0);
    
    const avgProgress = workOrders.length > 0
      ? Math.round(workOrders.reduce((sum, wo) => sum + wo.progress, 0) / workOrders.length)
      : 0;
    
    const runningEquipments = equipments.filter(e => e.status === 'running').length;
    const totalEquipments = equipments.length;
    const avgUtilization = equipments.length > 0
      ? Math.round(equipments.reduce((sum, e) => sum + e.utilization, 0) / equipments.length)
      : 0;
    
    // 按状态分组
    const ordersByStatus = {
      draft: workOrders.filter(wo => wo.status === 'draft').length,
      planned: plannedOrders,
      in_progress: inProgressOrders,
      quality_check: qualityCheckOrders,
      completed: completedOrders,
      on_hold: workOrders.filter(wo => wo.status === 'on_hold').length,
      cancelled: workOrders.filter(wo => wo.status === 'cancelled').length,
    };
    
    // 按优先级分组
    const ordersByPriority = {
      urgent: workOrders.filter(wo => wo.priority === 'urgent').length,
      high: workOrders.filter(wo => wo.priority === 'high').length,
      normal: workOrders.filter(wo => wo.priority === 'normal').length,
      low: workOrders.filter(wo => wo.priority === 'low').length,
    };
    
    // 按团队分组
    const ordersByTeam: Record<string, number> = {};
    workOrders.forEach(wo => {
      const team = wo.assignedTeam || '未分配';
      ordersByTeam[team] = (ordersByTeam[team] || 0) + 1;
    });
    
    return {
      summary: {
        totalOrders,
        inProgressOrders,
        completedOrders,
        qualityCheckOrders,
        plannedOrders,
        totalQuantity,
        completedQuantity,
        avgProgress,
      },
      equipment: {
        total: totalEquipments,
        running: runningEquipments,
        idle: equipments.filter(e => e.status === 'idle').length,
        maintenance: equipments.filter(e => e.status === 'maintenance').length,
        fault: equipments.filter(e => e.status === 'fault').length,
        avgUtilization,
      },
      ordersByStatus,
      ordersByPriority,
      ordersByTeam,
      recentOrders: workOrders.slice(0, 5),
    };
  }),
  
  /**
   * 获取生产进度趋势
   */
  getProgressTrend: publicProcedure
    .input(z.object({
      days: z.number().default(7),
    }).optional())
    .query(({ input }) => {
      // 模拟趋势数据
      const days = input?.days || 7;
      const trend = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        trend.push({
          date: dateStr,
          completed: Math.floor(Math.random() * 3) + 1,
          inProgress: Math.floor(Math.random() * 5) + 2,
          planned: Math.floor(Math.random() * 4) + 1,
        });
      }
      
      return trend;
    }),
  
  /**
   * 获取团队产能
   */
  getTeamCapacity: publicProcedure.query(() => {
    const teams = ['A组', 'B组', 'C组'];
    
    return teams.map(team => {
      const teamOrders = workOrders.filter(wo => wo.assignedTeam === team);
      const totalHours = teamOrders.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);
      const actualHours = teamOrders.reduce((sum, wo) => sum + (wo.actualHours || 0), 0);
      const completedOrders = teamOrders.filter(wo => wo.status === 'completed').length;
      
      return {
        team,
        totalOrders: teamOrders.length,
        completedOrders,
        inProgressOrders: teamOrders.filter(wo => wo.status === 'in_progress').length,
        totalHours,
        actualHours,
        efficiency: totalHours > 0 ? Math.round((actualHours / totalHours) * 100) : 0,
      };
    });
  }),
});
