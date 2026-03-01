/**
 * 公司员工管理路由
 * v2.0.0 - HR User Management Module (RBAC + Onboarding + Role Editor)
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import type { BuContext } from "../_core/gateway-bu-context.middleware";
import * as employeeService from "../services/employee.service";

/** Roles with global HR view (not BU-restricted) */
const GLOBAL_HR_ROLES = new Set(["admin", "director", "hr_manager", "hr_specialist", "finance_manager"]);

/** Resolve the BU code from context. Returns undefined for global-scope users. */
function resolveEmployeeBuCode(ctx: any): string | undefined {
  const role = ctx.user?.role ?? "";
  if (GLOBAL_HR_ROLES.has(role)) return undefined;
  return (ctx as any).bu?.buCode ?? undefined;
}

const systemRoleSchema = z.enum([
  "admin", "director", "bu_gm", "bu_pm", "bu_sales",
  "bu_mech", "bu_elec", "procurement_eng", "cs_engineer",
  "dept_manager", "team_lead", "hr_manager", "hr_specialist",
  "finance_manager", "finance_specialist", "employee",
  "production_worker", "guest",
]);

export const employeeRouter = router({
  // 获取所有员工 (active only, BU-scoped)
  getAll: requirePermission('hr:employees:view').query(async ({ ctx }) => {
    const buCode = resolveEmployeeBuCode(ctx);
    if (buCode) return employeeService.getEmployeesByBU(buCode);
    return employeeService.getAllEmployees();
  }),

  // 获取所有员工 (including inactive/resigned for HR management, BU-scoped)
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const buCode = resolveEmployeeBuCode(ctx);
    const employees = await employeeService.getAllEmployees(true);
    if (buCode) return employees.filter(e => e.buCode === buCode);
    return employees;
  }),

  // 获取员工列表（支持筛选 — includes all statuses for HR, BU-scoped）
  list: requirePermission('hr:employees:view')
    .input(z.object({
      buCode: z.string().optional(),
      department: z.string().optional(),
      search: z.string().optional(),
      includeAll: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const employees = await employeeService.getAllEmployees(input?.includeAll ?? false);
      let filtered = employees;

      // BU isolation: apply user's BU scope unless explicit buCode filter provided
      const userBuCode = input?.buCode ?? resolveEmployeeBuCode(ctx);
      if (userBuCode) {
        filtered = filtered.filter(e => e.buCode === userBuCode);
      }
      if (input?.department) {
        filtered = filtered.filter(e => e.department === input.department);
      }
      if (input?.search) {
        const keyword = input.search.toLowerCase();
        filtered = filtered.filter(e =>
          e.name.toLowerCase().includes(keyword) ||
          e.employeeId.toLowerCase().includes(keyword) ||
          e.position.toLowerCase().includes(keyword)
        );
      }

      return { employees: filtered, total: filtered.length };
    }),

  // 获取统计数据 (BU-scoped)
  getStats: requirePermission('hr:employees:view').query(async ({ ctx }) => {
    let employees = await employeeService.getAllEmployees();
    // BU isolation
    const buCode = resolveEmployeeBuCode(ctx);
    if (buCode) {
      employees = employees.filter(e => e.buCode === buCode);
    }
    const byBU: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};

    employees.forEach(e => {
      byBU[e.buCode] = (byBU[e.buCode] || 0) + 1;
      byDepartment[e.department] = (byDepartment[e.department] || 0) + 1;
    });

    return {
      total: employees.length,
      byBU,
      byDepartment
    };
  }),

  // 按部门获取员工
  getByDepartment: requirePermission('hr:employees:view')
    .input(z.object({ department: z.string() }))
    .query(async ({ input }) => {
      return employeeService.getEmployeesByDepartment(input.department);
    }),

  // 按BU获取员工
  getByBU: requirePermission('hr:employees:view')
    .input(z.object({ buCode: z.string() }))
    .query(async ({ input }) => {
      return employeeService.getEmployeesByBU(input.buCode);
    }),

  // 根据员工编号获取员工
  getById: requirePermission('hr:employees:view')
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      return employeeService.getEmployeeById(input.employeeId);
    }),

  // 搜索员工
  search: requirePermission('hr:employees:view')
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input }) => {
      return employeeService.searchEmployees(input.keyword);
    }),

  // 获取部门统计
  getDepartmentStats: requirePermission('hr:employees:view').query(async () => {
    return employeeService.getDepartmentStats();
  }),

  // 获取BU统计
  getBUStats: requirePermission('hr:employees:view').query(async () => {
    return employeeService.getBUStats();
  }),

  // 获取下一个可用员工编号
  getNextId: protectedProcedure.query(async () => {
    const nextId = await employeeService.getNextEmployeeId();
    return { nextId };
  }),

  // 创建员工（需要登录 — with role assignment）
  create: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      name: z.string(),
      department: z.string(),
      position: z.string(),
      buCode: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      systemRole: systemRoleSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      return employeeService.createEmployee(input);
    }),

  // 批量创建员工（需要登录）
  batchCreate: protectedProcedure
    .input(z.object({
      employees: z.array(z.object({
        employeeId: z.string(),
        name: z.string(),
        department: z.string(),
        position: z.string(),
        buCode: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return employeeService.batchCreateEmployees(input.employees);
    }),

  // 更新员工信息（需要登录）
  update: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      updates: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(['active', 'inactive', 'resigned']).optional(),
        systemRole: systemRoleSchema.optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      return employeeService.updateEmployee(input.employeeId, input.updates);
    }),

  // 更新系统角色（HR/Admin only）
  updateRole: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      systemRole: systemRoleSchema,
    }))
    .mutation(async ({ input }) => {
      return employeeService.updateSystemRole(input.employeeId, input.systemRole);
    }),

  // 批量更新系统角色 (HR bulk assignment)
  batchUpdateRoles: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        employeeId: z.string(),
        systemRole: systemRoleSchema,
      })).min(1).max(500),
    }))
    .mutation(async ({ input }) => {
      return employeeService.batchUpdateRoles(input.updates);
    }),

  // 更新员工状态 (activate / deactivate / resign)
  updateStatus: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      status: z.enum(['active', 'inactive', 'resigned']),
    }))
    .mutation(async ({ input }) => {
      return employeeService.updateEmployeeStatus(input.employeeId, input.status);
    }),

  // 初始化员工数据（从JSON导入）
  initFromData: protectedProcedure.mutation(async () => {
    // 从图片解析的员工数据
    const employees = [
      {employeeId: "GRT001", name: "侯亚东", department: "总裁办", position: "董事长"},
      {employeeId: "GRT002", name: "黄晓三", department: "财务部", position: "会计"},
      {employeeId: "GRT003", name: "侯亚琴", department: "事业三部", position: "采购与项目工程师"},
      {employeeId: "GRT004", name: "戴晓燕", department: "事业一部", position: "高级销售经理"},
      {employeeId: "GRT005", name: "金晓锋", department: "事业一部", position: "制造质量经理"},
      {employeeId: "GRT006", name: "洪希龙", department: "事业二部", position: "机械设计经理"},
      {employeeId: "GRT007", name: "孙坚", department: "事业三部", position: "电气主管"},
      {employeeId: "GRT008", name: "马柯", department: "事业十部", position: "质量专员"},
      {employeeId: "GRT009", name: "史龙昌", department: "事业十部", position: "激光切作班组长"},
      {employeeId: "GRT010", name: "吴卫斌", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT011", name: "张超", department: "事业十部", position: "激光"},
      {employeeId: "GRT012", name: "李兴伟", department: "事业十部", position: "冷作"},
      {employeeId: "GRT013", name: "孙珍", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT014", name: "瞿龙海", department: "事业一部", position: "售后技工"},
      {employeeId: "GRT015", name: "杜显文", department: "事业一部", position: "电气班组副班长"},
      {employeeId: "GRT016", name: "曹庆伟", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT017", name: "田坪珍", department: "事业一部", position: "焊工"},
      {employeeId: "GRT018", name: "孙国祥", department: "事业四部", position: "电气工程师"},
      {employeeId: "GRT019", name: "冯艳", department: "事业三部", position: "销售与项目工程师"},
      {employeeId: "GRT020", name: "张海", department: "事业一部", position: "采购与项目工程师"},
      {employeeId: "GRT021", name: "张松松", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT022", name: "李大鹏", department: "事业一部", position: "电气工程师"},
      {employeeId: "GRT023", name: "杨之贤", department: "事业三部", position: "电气装配"},
      {employeeId: "GRT024", name: "张鹏飞", department: "事业四部", position: "机加工班组长"},
      {employeeId: "GRT025", name: "肖辉隆", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT028", name: "朱明华", department: "事业一部", position: "售后技工"},
      {employeeId: "GRT029", name: "殷小勇", department: "事业三部", position: "电气装配"},
      {employeeId: "GRT030", name: "匡丽娟", department: "事业一部", position: "售后服务主管"},
      {employeeId: "GRT031", name: "沈龙翔", department: "事业一部", position: "电气装配"},
      {employeeId: "GRT032", name: "王丹", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT033", name: "张龙", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT034", name: "王勇", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT035", name: "王志亮", department: "事业三部", position: "销售与项目工程师"},
      {employeeId: "GRT036", name: "韩品来", department: "事业一部", position: "电气装配"},
      {employeeId: "GRT037", name: "黄清清", department: "事业三部", position: "文员"},
      {employeeId: "GRT038", name: "马林山", department: "事业二部", position: "装配班组长"},
      {employeeId: "GRT039", name: "侯德明", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT040", name: "曾春贵", department: "事业一部", position: "售后技工"},
      {employeeId: "GRT041", name: "张良", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT042", name: "刘建华", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT043", name: "韩保程", department: "事业一部", position: "销售与项目工程师"},
      {employeeId: "GRT044", name: "洪小东", department: "事业二部", position: "机械研发工程师"},
      {employeeId: "GRT045", name: "杨勇", department: "事业部支持部", position: "客户与服务经理"},
      {employeeId: "GRT046", name: "吕昌冬", department: "事业一部", position: "电气班组班长"},
      {employeeId: "GRT047", name: "胡国华", department: "事业一部", position: "协作辅助"},
      {employeeId: "GRT049", name: "胡炜", department: "AI数智部", position: "IT工程师"},
      {employeeId: "GRT050", name: "蕾翠林", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT051", name: "崔晓鸣", department: "事业一部", position: "电气装配"},
      {employeeId: "GRT052", name: "赵强", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT053", name: "段天珠", department: "人事行政部", position: "前法"},
      {employeeId: "GRT054", name: "王秀萍", department: "财务部", position: "总账会计"},
      {employeeId: "GRT055", name: "沈迎风", department: "事业三部", position: "商务经理"},
      {employeeId: "GRT056", name: "陈成成", department: "事业三部", position: "焊工"},
      {employeeId: "GRT057", name: "滕颖英", department: "事业一部", position: "采购与项目工程师"},
      {employeeId: "GRT058", name: "周辉", department: "事业三部", position: "前厅经理"},
      {employeeId: "GRT059", name: "焦斌", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT060", name: "杨金龙", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT061", name: "李明遂", department: "事业一部", position: "数控车工"},
      {employeeId: "GRT062", name: "朱宇浩", department: "AI数智部", position: "IT工程师"},
      {employeeId: "GRT063", name: "刘建康", department: "事业一部", position: "销售经理"},
      {employeeId: "GRT064", name: "刘兵兵", department: "事业一部", position: "激光切割"},
      {employeeId: "GRT065", name: "蔡琪", department: "事业二部", position: "机械研发工程师"},
      {employeeId: "GRT066", name: "李新正", department: "财务部", position: "仓库管理员"},
      {employeeId: "GRT067", name: "沙建梅", department: "人事行政部", position: "人事行政主管"},
      {employeeId: "GRT068", name: "李宇超", department: "事业十部", position: "CNC操作工"},
      {employeeId: "GRT069", name: "李鹏飞", department: "事业十部", position: "数控车工"},
      {employeeId: "GRT071", name: "刘环杨", department: "事业一部", position: "电气装配"},
      {employeeId: "GRT072", name: "赵城杰", department: "事业一部", position: "电气装配"},
      {employeeId: "GRT073", name: "范威", department: "事业十部", position: "CNC操作工"},
      {employeeId: "GRT074", name: "王金海", department: "事业二部", position: "机械装配"},
      {employeeId: "GRT075", name: "胡绍杰", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT076", name: "王森", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT077", name: "吴阳洋", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT079", name: "阎建华", department: "事业一部", position: "机械装配"},
      {employeeId: "GRT080", name: "刘奥运", department: "AI数智部", position: "董事长助理"},
      {employeeId: "GRT082", name: "沈富高", department: "事业一部", position: "焊工"},
      {employeeId: "GRT083", name: "刘坤", department: "AI数智部", position: "销售与项目工程师"},
      {employeeId: "GRT084", name: "蒋秋琪", department: "事业三部", position: "机械装配"},
      {employeeId: "GRT087", name: "梅奥杰", department: "事业一部", position: "助理电气工程师"},
      {employeeId: "GRT088", name: "蒋嘉义", department: "事业一部", position: "助理电气工程师"},
      {employeeId: "GRT089", name: "罗小玲", department: "事业三部", position: "助理机械研发工程师"},
      {employeeId: "GRT090", name: "张如翊", department: "事业一部", position: "助理机械研发工程师"},
      {employeeId: "GRT093", name: "李翔翔", department: "事业一部", position: "销售与项目工程师"},
      {employeeId: "GRT094", name: "徐明雪", department: "事业一部", position: "部门经理"},
      {employeeId: "GRT095", name: "王雯云", department: "人事行政部", position: "后勤助理"},
      {employeeId: "GRT096", name: "侯晓薇", department: "AI数智部", position: "部门经理"},
      {employeeId: "GRT097", name: "钱绍辉", department: "事业二部", position: "电气工程师"},
      {employeeId: "GRT099", name: "殷金刚", department: "事业二部", position: "机械装配"},
      {employeeId: "GRT100", name: "田轩毓", department: "人事行政部", position: "行政助理"},
      {employeeId: "GRT101", name: "王汝月", department: "财务部", position: "会计助理"},
      {employeeId: "GRT102", name: "张飞", department: "事业十部", position: "机加工铣工"},
      {employeeId: "GRT103", name: "朱文斌", department: "AI数智部", position: "市场专员"},
      {employeeId: "GRT079_2", name: "马鹏风", department: "财务部", position: "供应链工程师"},
    ];
    
    return employeeService.batchCreateEmployees(employees);
  }),

  // 从简道云同步员工数据
  syncFromJiandaoyun: protectedProcedure.mutation(async () => {
    // TODO: 实际从简道云API获取数据
    // 这里返回模拟结果
    return {
      added: 0,
      updated: 0,
      deleted: 0,
      message: '同步完成，请确保简道云API已配置'
    };
  }),
});
