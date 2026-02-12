/**
 * BU事业部映射路由
 * 提供BU与简道云部门映射的管理功能
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { 
  buMappingService, 
  DEFAULT_BUS, 
  BU_KEYWORDS,
  type BUCode,
  type RoleType 
} from "../services/bu-mapping.service";
import { getJiandaoyunSyncService } from "../jiandaoyun";

// BU代码验证
const buCodeSchema = z.enum(['BU1', 'BU2', 'BU3', 'BU4', 'BU5']);

// 角色类型验证
const roleTypeSchema = z.enum(['Sales', 'Mech', 'Elec', 'Procurement', 'Assembly', 'Debug', 'Delivery', 'CS']);

export const buMappingRouter = router({
  /**
   * 获取所有BU信息
   */
  getAllBUs: protectedProcedure.query(async () => {
    return {
      bus: DEFAULT_BUS,
      keywords: BU_KEYWORDS,
    };
  }),

  /**
   * 获取BU统计信息
   */
  getBUStats: protectedProcedure.query(async () => {
    const stats = await buMappingService.getBUStats();
    return { stats };
  }),

  /**
   * 获取所有BU部门映射
   */
  getAllMappings: protectedProcedure.query(async () => {
    const mappings = await buMappingService.getAllMappings();
    return { mappings };
  }),

  /**
   * 获取指定BU的部门映射
   */
  getMappingsByBU: protectedProcedure
    .input(z.object({ buCode: buCodeSchema }))
    .query(async ({ input }) => {
      const mappings = await buMappingService.getMappingsByBU(input.buCode as BUCode);
      return { mappings };
    }),

  /**
   * 创建BU部门映射
   */
  createMapping: adminProcedure
    .input(z.object({
      buCode: buCodeSchema,
      jdyDeptNo: z.number(),
      jdyDeptName: z.string().optional(),
      roleType: roleTypeSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await buMappingService.createMapping({
        buCode: input.buCode as BUCode,
        jdyDeptNo: input.jdyDeptNo,
        jdyDeptName: input.jdyDeptName,
        roleType: input.roleType as RoleType | undefined,
      });
      return { success: true, id };
    }),

  /**
   * 批量创建BU部门映射
   */
  batchCreateMappings: adminProcedure
    .input(z.object({
      mappings: z.array(z.object({
        buCode: buCodeSchema,
        jdyDeptNo: z.number(),
        jdyDeptName: z.string().optional(),
        roleType: roleTypeSchema.optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const result = await buMappingService.batchCreateMappings(
        input.mappings.map(m => ({
          buCode: m.buCode as BUCode,
          jdyDeptNo: m.jdyDeptNo,
          jdyDeptName: m.jdyDeptName,
          roleType: m.roleType as RoleType | undefined,
        }))
      );
      return { success: true, ...result };
    }),

  /**
   * 更新BU部门映射
   */
  updateMapping: adminProcedure
    .input(z.object({
      id: z.number(),
      buCode: buCodeSchema.optional(),
      jdyDeptNo: z.number().optional(),
      jdyDeptName: z.string().optional(),
      roleType: roleTypeSchema.optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const success = await buMappingService.updateMapping(id, {
        buCode: data.buCode as BUCode | undefined,
        jdyDeptNo: data.jdyDeptNo,
        jdyDeptName: data.jdyDeptName,
        roleType: data.roleType as RoleType | undefined,
        isActive: data.isActive,
      });
      return { success };
    }),

  /**
   * 删除BU部门映射
   */
  deleteMapping: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await buMappingService.deleteMapping(input.id);
      return { success };
    }),

  /**
   * 自动匹配简道云部门到BU
   * 根据部门名称关键词自动识别并创建映射
   */
  autoMatchDepartments: adminProcedure.mutation(async () => {
    const jdyService = getJiandaoyunSyncService();
    
    if (!jdyService.isConfigured()) {
      return { success: false, error: "简道云API未配置" };
    }
    
    try {
      // 获取所有简道云部门
      const departments = await jdyService.getDepartments();
      
      const matchedMappings: Array<{
        buCode: BUCode;
        jdyDeptNo: number;
        jdyDeptName: string;
      }> = [];
      
      const unmatchedDepts: Array<{
        deptNo: number;
        deptName: string;
      }> = [];
      
      // 遍历部门进行匹配
      for (const dept of departments) {
        const matchedBU = buMappingService.matchBUByDeptName(dept.name);
        
        if (matchedBU) {
          matchedMappings.push({
            buCode: matchedBU,
            jdyDeptNo: dept.dept_no,
            jdyDeptName: dept.name,
          });
        } else {
          unmatchedDepts.push({
            deptNo: dept.dept_no,
            deptName: dept.name,
          });
        }
      }
      
      // 批量创建匹配的映射
      let created = 0;
      let updated = 0;
      
      if (matchedMappings.length > 0) {
        const result = await buMappingService.batchCreateMappings(matchedMappings);
        created = result.created;
        updated = result.updated;
      }
      
      return {
        success: true,
        totalDepartments: departments.length,
        matched: matchedMappings.length,
        unmatched: unmatchedDepts.length,
        created,
        updated,
        unmatchedDepts,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 获取BU人员名单（基于映射配置）
   */
  getBUMembers: protectedProcedure
    .input(z.object({ buCode: buCodeSchema.optional() }))
    .query(async ({ input }) => {
      const jdyService = getJiandaoyunSyncService();
      
      if (!jdyService.isConfigured()) {
        return { buMembers: [], error: "简道云API未配置" };
      }
      
      try {
        // 获取映射配置
        const mappings = input.buCode 
          ? await buMappingService.getMappingsByBU(input.buCode as BUCode)
          : await buMappingService.getAllMappings();
        
        // 获取所有成员
        const allMembers = await jdyService.getMembers();
        
        // 按BU分组
        const buMembersMap = new Map<string, {
          buCode: string;
          buName: string;
          roles: Map<string, Array<{
            username: string;
            name: string;
            status: number;
            email?: string;
            phone?: string;
            deptName?: string;
          }>>;
        }>();
        
        // 初始化BU结构
        for (const bu of DEFAULT_BUS) {
          if (!input.buCode || input.buCode === bu.code) {
            buMembersMap.set(bu.code, {
              buCode: bu.code,
              buName: bu.name,
              roles: new Map(),
            });
          }
        }
        
        // 根据映射配置分配成员
        for (const mapping of mappings) {
          const buData = buMembersMap.get(mapping.buCode);
          if (!buData) continue;
          
          // 找到该部门的成员
          const deptMembers = allMembers.filter(m =>
            m.departments?.includes(mapping.jdyDeptNo)
          );
          
          const roleKey = mapping.roleType || 'Other';
          
          if (!buData.roles.has(roleKey)) {
            buData.roles.set(roleKey, []);
          }
          
          const roleMembers = buData.roles.get(roleKey)!;
          
          for (const member of deptMembers) {
            // 避免重复添加
            if (!roleMembers.some(m => m.username === member.username)) {
              roleMembers.push({
                username: member.username,
                name: member.name,
                status: member.status,
                email: (member as any).email,
                phone: (member as any).phone,
                deptName: mapping.jdyDeptName || undefined,
              });
            }
          }
        }
        
        // 转换为数组格式
        const buMembers = Array.from(buMembersMap.values()).map(bu => ({
          buCode: bu.buCode,
          buName: bu.buName,
          roles: Array.from(bu.roles.entries()).map(([roleType, members]) => ({
            roleType,
            roleName: getRoleName(roleType),
            members,
            memberCount: members.length,
          })),
          totalMembers: Array.from(bu.roles.values()).reduce((sum, m) => sum + m.length, 0),
        }));
        
        return { buMembers, error: null };
      } catch (error: any) {
        return { buMembers: [], error: error.message };
      }
    }),

  // ==================== BU负责人管理 ====================

  /**
   * 获取所有BU负责人
   */
  getAllLeaders: protectedProcedure.query(async () => {
    const { getAllLeaders } = await import('../services/bu-mapping.service');
    const leaders = await getAllLeaders();
    return { leaders };
  }),

  /**
   * 获取指定BU的负责人
   */
  getLeadersByBU: protectedProcedure
    .input(z.object({ buCode: buCodeSchema }))
    .query(async ({ input }) => {
      const { getLeadersByBU } = await import('../services/bu-mapping.service');
      const leaders = await getLeadersByBU(input.buCode as BUCode);
      return { leaders };
    }),

  /**
   * 设置BU负责人
   */
  setLeader: adminProcedure
    .input(z.object({
      buCode: buCodeSchema,
      roleType: roleTypeSchema,
      leaderName: z.string().min(1),
      leaderUserId: z.string().optional(),
      leaderEmail: z.string().email().optional(),
      leaderPhone: z.string().optional(),
      isPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { setLeader } = await import('../services/bu-mapping.service');
      const id = await setLeader({
        buCode: input.buCode as BUCode,
        roleType: input.roleType as RoleType,
        leaderName: input.leaderName,
        leaderUserId: input.leaderUserId,
        leaderEmail: input.leaderEmail,
        leaderPhone: input.leaderPhone,
        isPrimary: input.isPrimary,
      });
      return { success: true, id };
    }),

  /**
   * 删除BU负责人
   */
  deleteLeader: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { deleteLeader } = await import('../services/bu-mapping.service');
      const success = await deleteLeader(input.id);
      return { success };
    }),

  // ==================== BU绩效统计 ====================

  /**
   * 获取BU绩效统计
   */
  getPerformanceStats: protectedProcedure
    .input(z.object({
      buCode: buCodeSchema.optional(),
      periodType: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { getPerformanceStats } = await import('../services/bu-mapping.service');
      const stats = await getPerformanceStats(input || {});
      return { stats };
    }),

  /**
   * 更新BU绩效统计
   */
  updatePerformanceStats: adminProcedure
    .input(z.object({
      buCode: buCodeSchema,
      statPeriod: z.string(),
      periodType: z.enum(['monthly', 'quarterly', 'yearly']),
      projectCount: z.number().optional(),
      activeProjectCount: z.number().optional(),
      completedProjectCount: z.number().optional(),
      totalRevenue: z.number().optional(),
      totalCost: z.number().optional(),
      grossProfit: z.number().optional(),
      grossMargin: z.number().optional(),
      teamSize: z.number().optional(),
      utilizationRate: z.number().optional(),
      onTimeDeliveryRate: z.number().optional(),
      customerSatisfaction: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { updatePerformanceStats } = await import('../services/bu-mapping.service');
      const id = await updatePerformanceStats({
        buCode: input.buCode as BUCode,
        statPeriod: input.statPeriod,
        periodType: input.periodType,
        projectCount: input.projectCount,
        activeProjectCount: input.activeProjectCount,
        completedProjectCount: input.completedProjectCount,
        totalRevenue: input.totalRevenue,
        totalCost: input.totalCost,
        grossProfit: input.grossProfit,
        grossMargin: input.grossMargin,
        teamSize: input.teamSize,
        utilizationRate: input.utilizationRate,
        onTimeDeliveryRate: input.onTimeDeliveryRate,
        customerSatisfaction: input.customerSatisfaction,
      });
      return { success: true, id };
    }),

  /**
   * 初始化示例绩效数据
   */
  initSamplePerformanceData: adminProcedure.mutation(async () => {
    const { initSamplePerformanceData } = await import('../services/bu-mapping.service');
    const result = await initSamplePerformanceData();
    return { success: true, ...result };
  }),
});

/**
 * 获取角色中文名称
 */
function getRoleName(roleType: string): string {
  const roleNames: Record<string, string> = {
    'Sales': '销售与项目工程师',
    'Mech': '机械设计与项目工程师',
    'Elec': '电气设计与项目工程师',
    'Procurement': '采购与项目工程师',
    'Assembly': '装配工程师',
    'Debug': '调试工程师',
    'Delivery': '交付工程师',
    'CS': '客户服务工程师',
    'Other': '其他',
  };
  return roleNames[roleType] || roleType;
}
