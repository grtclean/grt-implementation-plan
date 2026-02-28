/**
 * ERP集成路由
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { 
  erpConnectionService, 
  ERPConnectionSchema,
  type ERPSystemType 
} from "./erp-connection.service";

export const erpRouter = router({
  /**
   * 创建ERP连接
   */
  createConnection: adminProcedure
    .input(ERPConnectionSchema)
    .mutation(async ({ input }) => {
      return await erpConnectionService.createConnection({
        ...input,
        systemType: input.systemType as ERPSystemType,
      });
    }),

  /**
   * 获取所有ERP连接
   */
  getAllConnections: adminProcedure.query(async () => {
    return await erpConnectionService.getAllConnections();
  }),

  /**
   * 获取单个ERP连接
   */
  getConnection: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await erpConnectionService.getConnection(input.id);
    }),

  /**
   * 测试ERP连接
   */
  testConnection: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await erpConnectionService.testConnection(input.id);
    }),

  /**
   * 获取连接统计
   */
  getConnectionStats: adminProcedure.query(async () => {
    const connections = await erpConnectionService.getAllConnections();
    return {
      total: connections.length,
      connected: connections.filter(c => c.isConnected).length,
      disconnected: connections.filter(c => !c.isConnected).length,
      byType: {
        sap: connections.filter(c => c.systemType === 'sap').length,
        oracle: connections.filter(c => c.systemType === 'oracle').length,
        kingdee: connections.filter(c => c.systemType === 'kingdee').length,
        custom: connections.filter(c => c.systemType === 'custom').length,
      },
    };
  }),

  /**
   * 获取ERP系统文档
   */
  getSystemDocumentation: protectedProcedure
    .input(z.object({ systemType: z.enum(['sap', 'oracle', 'kingdee']) }))
    .query(async ({ input }) => {
      const docs: Record<string, unknown> = {
        sap: {
          name: 'SAP ERP',
          description: 'SAP企业资源规划系统',
          supportedModules: ['MM', 'SD', 'FI', 'CO', 'HR'],
          connectionMethod: 'RFC/SOAP',
          documentation: 'https://help.sap.com',
          requiredFields: ['host', 'port', 'username', 'password', 'systemId'],
        },
        oracle: {
          name: 'Oracle EBS',
          description: 'Oracle电子商务套件',
          supportedModules: ['AR', 'AP', 'GL', 'PO', 'OM'],
          connectionMethod: 'JDBC/REST',
          documentation: 'https://docs.oracle.com/cd/E26401_01',
          requiredFields: ['host', 'port', 'database', 'username', 'password'],
        },
        kingdee: {
          name: '金蝶ERP',
          description: '金蝶企业管理软件',
          supportedModules: ['财务', '采购', '销售', '库存', '生产'],
          connectionMethod: 'WebService/REST',
          documentation: 'https://www.kingdee.com',
          requiredFields: ['host', 'port', 'username', 'password'],
        },
      };
      
      return docs[input.systemType] || null;
    }),
});
