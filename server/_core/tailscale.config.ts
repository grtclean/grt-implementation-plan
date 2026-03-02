/**
 * Tailscale Network Routing Configuration
 * 
 * 安全约束：
 * 1. 仅允许使用Tailscale内网IP（100.x.y.z）或子网路由（192.168.10.x）
 * 2. 禁止使用公网IP访问Jared ERP数据库
 * 3. 连接超时时不要切换回备用公网接口，应报错并通知管理员
 */

import { TRPCError } from "@trpc/server";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("tailscale");

/**
 * Tailscale ACL 配置接口
 */
interface TailscaleACL {
  version: number;
  acls: ACLRule[];
  hosts: Record<string, string>;
  tagOwners: Record<string, string[]>;
  autoApprovers: {
    routes: string[];
    exitNodes: string[];
  };
  ssh: Array<{
    action: string;
    principal: string[];
    targets: string[];
  }>;
}

/**
 * ACL规则接口
 */
interface ACLRule {
  action: "accept" | "deny";
  src: string[];
  dst: string[];
  ports: string[];
}

/**
 * 数据库连接配置
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

/**
 * 验证IP地址是否为Tailscale内网IP
 */
export function isValidTailscaleIP(ip: string): boolean {
  // Tailscale内网IP范围: 100.64.0.0/10
  const tailscalePattern = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/;
  return tailscalePattern.test(ip);
}

/**
 * 验证IP地址是否为子网路由IP
 */
export function isValidSubnetIP(ip: string): boolean {
  // 子网路由范围: 192.168.10.x
  const subnetPattern = /^192\.168\.10\.\d{1,3}$/;
  return subnetPattern.test(ip);
}

/**
 * 验证数据库连接字符串
 */
export function validateDatabaseConnection(config: DatabaseConfig): void {
  const { host } = config;

  // 检查是否为公网IP
  if (isPublicIP(host)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `DLP Policy Violation: 禁止使用公网IP访问Jared ERP数据库。请使用Tailscale内网IP (100.x.y.z) 或子网路由 (192.168.10.x)。当前连接: ${host}`,
    });
  }

  // 检查是否为有效的Tailscale或子网IP
  if (!isValidTailscaleIP(host) && !isValidSubnetIP(host)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `DLP Policy Violation: 数据库主机必须使用Tailscale内网IP或子网路由。当前: ${host}`,
    });
  }
}

/**
 * 检查是否为公网IP
 */
function isPublicIP(ip: string): boolean {
  // 私有IP范围
  const privatePatterns = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
    /^192\.168\.\d{1,3}\.\d{1,3}$/,             // 192.168.0.0/16
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,         // 127.0.0.0/8 (localhost)
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // Tailscale 100.64.0.0/10
  ];

  return !privatePatterns.some(pattern => pattern.test(ip));
}

/**
 * Tailscale ACL 配置模板
 */
export const tailscaleACLTemplate: TailscaleACL = {
  version: 1,
  acls: [
    // M0: 商机与提案 - 销售人员访问公海池
    {
      action: "accept",
      src: ["tag:sales"],
      dst: ["tag:jared-erp-pool"],
      ports: ["3306:3306"],
    },
    // M2: 项目启动 - 项目组访问特定BOM分区
    {
      action: "accept",
      src: ["tag:project-team"],
      dst: ["tag:jared-erp-bom"],
      ports: ["3306:3306"],
    },
    // M4: 研发设计 - 设计师访问CAD库
    {
      action: "accept",
      src: ["tag:design"],
      dst: ["tag:cad-repository"],
      ports: ["3306:3306", "8080:8080"],
    },
    // M6: 采购询价 - 采购员访问供应商数据
    {
      action: "accept",
      src: ["tag:procurement"],
      dst: ["tag:supplier-data"],
      ports: ["3306:3306"],
    },
    // M8: 生产制造 - 工厂PLC单向上传数据（禁止下行控制）
    {
      action: "accept",
      src: ["tag:factory-plc"],
      dst: ["tag:data-collector"],
      ports: ["5432:5432"],
    },
    // 禁止所有其他连接
    {
      action: "deny",
      src: ["*"],
      dst: ["*"],
      ports: ["*:*"],
    },
  ],
  hosts: {
    "jared-erp.internal": "100.64.1.1",
    "cad-repo.internal": "100.64.2.1",
    "supplier-portal.internal": "100.64.3.1",
    "factory-gateway.internal": "192.168.10.1",
  },
  tagOwners: {
    "tag:sales": ["group:sales-team"],
    "tag:project-team": ["group:engineering"],
    "tag:design": ["group:design-team"],
    "tag:procurement": ["group:procurement"],
    "tag:factory-plc": ["group:manufacturing"],
  },
  autoApprovers: {
    routes: [],
    exitNodes: [],
  },
  ssh: [
    {
      action: "accept",
      principal: ["tag:admin"],
      targets: ["tag:*"],
    },
  ],
};

/**
 * 获取安全的数据库连接字符串
 */
export function getSecureDatabaseURL(config: DatabaseConfig): string {
  // 验证连接配置
  validateDatabaseConnection(config);

  const { host, port, database, username, password, ssl } = config;
  const protocol = ssl ? "mysql+ssl" : "mysql";

  return `${protocol}://${username}:${password}@${host}:${port}/${database}`;
}

/**
 * 连接失败处理 - 禁止切换到公网接口
 */
export function handleConnectionFailure(error: Error, host: string): void {
  log.error({ host }, "Database connection failed");
  log.error({ err: error }, "Connection error details");

  // 不要尝试切换回备用公网接口
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Database connection failed. Please check Tailscale Tunnel status. Contact administrator if issue persists. Host: ${host}`,
  });
}

/**
 * 导出Tailscale ACL配置为YAML格式
 */
export function exportACLAsYAML(acl: TailscaleACL): string {
  let yaml = `# Tailscale ACL Configuration\n`;
  yaml += `# Generated: ${new Date().toISOString()}\n\n`;

  yaml += `version: ${acl.version}\n\n`;

  yaml += `# 主机映射\n`;
  yaml += `hosts:\n`;
  Object.entries(acl.hosts).forEach(([hostname, ip]) => {
    yaml += `  ${hostname}: ${ip}\n`;
  });

  yaml += `\n# 标签所有者\n`;
  yaml += `tagOwners:\n`;
  Object.entries(acl.tagOwners).forEach(([tag, owners]) => {
    yaml += `  ${tag}:\n`;
    owners.forEach(owner => {
      yaml += `    - ${owner}\n`;
    });
  });

  yaml += `\n# ACL规则\n`;
  yaml += `acls:\n`;
  acl.acls.forEach((rule, index) => {
    yaml += `  - action: ${rule.action}\n`;
    yaml += `    src:\n`;
    rule.src.forEach(s => {
      yaml += `      - ${s}\n`;
    });
    yaml += `    dst:\n`;
    rule.dst.forEach(d => {
      yaml += `      - ${d}\n`;
    });
    yaml += `    ports:\n`;
    rule.ports.forEach(p => {
      yaml += `      - ${p}\n`;
    });
  });

  return yaml;
}
