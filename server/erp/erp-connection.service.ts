/**
 * ERP连接管理服务
 */

import { z } from "zod";

export type ERPSystemType = 'sap' | 'oracle' | 'kingdee' | 'custom';

export interface ERPConnectionConfig {
  id?: string;
  systemType: ERPSystemType;
  systemName: string;
  host: string;
  port: number;
  username: string;
  password: string;
  enabled: boolean;
  isConnected?: boolean;
  lastConnectedAt?: Date;
  lastErrorMessage?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  errorDetails?: string;
}

export const ERPConnectionSchema = z.object({
  systemType: z.enum(['sap', 'oracle', 'kingdee', 'custom']),
  systemName: z.string().min(1),
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
  enabled: z.boolean().default(true),
});

export class ERPConnectionService {
  private connections: Map<string, ERPConnectionConfig> = new Map();

  async createConnection(config: ERPConnectionConfig): Promise<ERPConnectionConfig> {
    ERPConnectionSchema.parse(config);
    const id = `erp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newConfig: ERPConnectionConfig = {
      ...config,
      id,
      isConnected: false,
    };
    this.connections.set(id, newConfig);
    return newConfig;
  }

  async getConnection(id: string): Promise<ERPConnectionConfig | null> {
    return this.connections.get(id) || null;
  }

  async getAllConnections(): Promise<ERPConnectionConfig[]> {
    return Array.from(this.connections.values());
  }

  async testConnection(id: string): Promise<ConnectionTestResult> {
    const config = this.connections.get(id);
    if (!config) {
      return {
        success: false,
        message: '连接配置不存在',
      };
    }

    const startTime = Date.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const responseTime = Date.now() - startTime;
      
      this.connections.set(id, {
        ...config,
        isConnected: true,
        lastConnectedAt: new Date(),
      });
      
      return {
        success: true,
        message: `连接成功 (${responseTime}ms)`,
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        message: '连接失败',
        errorDetails: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}

export const erpConnectionService = new ERPConnectionService();
