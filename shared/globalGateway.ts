/**
 * GRT智能系统 - 全球网关配置
 * 版本: v2.6.2
 * 
 * 规范：
 * - GRT-Global-Gateway统一接口
 * - 支持亚洲、欧洲、美洲三大区域
 * - 智能路由实现低延迟调用
 */

// 区域定义
export const GATEWAY_REGIONS = ['asia', 'europe', 'americas'] as const;
export type GatewayRegion = typeof GATEWAY_REGIONS[number];

// 路由策略
export const ROUTING_STRATEGIES = ['geo_proximity', 'round_robin', 'weighted', 'failover'] as const;
export type RoutingStrategy = typeof ROUTING_STRATEGIES[number];

// 健康状态
export const HEALTH_STATUSES = ['healthy', 'unhealthy', 'unknown'] as const;
export type HealthStatus = typeof HEALTH_STATUSES[number];

// 区域端点配置
export interface RegionEndpoint {
  region: GatewayRegion;
  url: string;
  weight: number;
  healthStatus: HealthStatus;
  lastHealthCheck: Date | null;
  latencyMs: number;
  isActive: boolean;
}

// 默认区域端点
export const DEFAULT_REGION_ENDPOINTS: Record<GatewayRegion, RegionEndpoint> = {
  asia: {
    region: 'asia',
    url: 'https://asia.gateway.gerrytech.com',
    weight: 100,
    healthStatus: 'unknown',
    lastHealthCheck: null,
    latencyMs: 0,
    isActive: true
  },
  europe: {
    region: 'europe',
    url: 'https://eu.gateway.gerrytech.com',
    weight: 100,
    healthStatus: 'unknown',
    lastHealthCheck: null,
    latencyMs: 0,
    isActive: true
  },
  americas: {
    region: 'americas',
    url: 'https://us.gateway.gerrytech.com',
    weight: 100,
    healthStatus: 'unknown',
    lastHealthCheck: null,
    latencyMs: 0,
    isActive: true
  }
};

// 网关配置
export interface GlobalGatewayConfig {
  defaultRegion: GatewayRegion;
  routingStrategy: RoutingStrategy;
  healthCheckInterval: number;  // 秒
  healthCheckTimeout: number;   // 秒
  unhealthyThreshold: number;   // 连续失败次数
  requestTimeout: number;       // 毫秒
  retryAttempts: number;
  retryDelay: number;           // 毫秒
  connectionPooling: boolean;
  keepAlive: boolean;
  compression: 'none' | 'gzip' | 'br';
  caching: {
    enabled: boolean;
    ttl: number;  // 秒
    maxSize: string;
  };
}

// 默认网关配置
export const DEFAULT_GATEWAY_CONFIG: GlobalGatewayConfig = {
  defaultRegion: 'asia',
  routingStrategy: 'geo_proximity',
  healthCheckInterval: 30,
  healthCheckTimeout: 5,
  unhealthyThreshold: 3,
  requestTimeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  connectionPooling: true,
  keepAlive: true,
  compression: 'gzip',
  caching: {
    enabled: true,
    ttl: 300,
    maxSize: '100MB'
  }
};

// 请求上下文
export interface GatewayRequestContext {
  requestId: string;
  sourceRegion: GatewayRegion;
  targetRegion: GatewayRegion;
  organizationId: string;
  userId?: string;
  timestamp: number;
  traceId?: string;
}

// 响应元数据
export interface GatewayResponseMetadata {
  requestId: string;
  region: GatewayRegion;
  latencyMs: number;
  cached: boolean;
  retryCount: number;
}

/**
 * 根据客户端位置选择最优区域
 */
export function selectOptimalRegion(
  clientLocation: string,
  endpoints: Record<GatewayRegion, RegionEndpoint>,
  strategy: RoutingStrategy
): GatewayRegion {
  // 获取健康的端点
  const healthyEndpoints = Object.values(endpoints).filter(
    ep => ep.isActive && ep.healthStatus !== 'unhealthy'
  );
  
  if (healthyEndpoints.length === 0) {
    // 所有端点都不健康，返回默认区域
    return 'asia';
  }
  
  switch (strategy) {
    case 'geo_proximity':
      return selectByGeoProximity(clientLocation, healthyEndpoints);
    case 'round_robin':
      return selectByRoundRobin(healthyEndpoints);
    case 'weighted':
      return selectByWeight(healthyEndpoints);
    case 'failover':
      return selectByFailover(healthyEndpoints);
    default:
      return 'asia';
  }
}

/**
 * 基于地理位置选择
 */
function selectByGeoProximity(
  clientLocation: string,
  endpoints: RegionEndpoint[]
): GatewayRegion {
  // 国家代码到区域映射
  const countryToRegion: Record<string, GatewayRegion> = {
    // 亚洲
    'CN': 'asia', 'JP': 'asia', 'KR': 'asia', 'SG': 'asia', 
    'HK': 'asia', 'TW': 'asia', 'IN': 'asia', 'AU': 'asia',
    // 欧洲
    'DE': 'europe', 'FR': 'europe', 'GB': 'europe', 'IT': 'europe',
    'ES': 'europe', 'NL': 'europe', 'BE': 'europe', 'CH': 'europe',
    'AT': 'europe', 'PL': 'europe', 'SE': 'europe', 'NO': 'europe',
    // 美洲
    'US': 'americas', 'CA': 'americas', 'MX': 'americas', 'BR': 'americas'
  };
  
  const preferredRegion = countryToRegion[clientLocation.toUpperCase()];
  
  if (preferredRegion) {
    const endpoint = endpoints.find(ep => ep.region === preferredRegion);
    if (endpoint) {
      return endpoint.region;
    }
  }
  
  // 回退到延迟最低的端点
  return selectByLatency(endpoints);
}

/**
 * 基于延迟选择
 */
function selectByLatency(endpoints: RegionEndpoint[]): GatewayRegion {
  const sorted = [...endpoints].sort((a, b) => a.latencyMs - b.latencyMs);
  return sorted[0]?.region || 'asia';
}

/**
 * 轮询选择
 */
let roundRobinIndex = 0;
function selectByRoundRobin(endpoints: RegionEndpoint[]): GatewayRegion {
  const index = roundRobinIndex % endpoints.length;
  roundRobinIndex++;
  return endpoints[index].region;
}

/**
 * 基于权重选择
 */
function selectByWeight(endpoints: RegionEndpoint[]): GatewayRegion {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint.region;
    }
  }
  
  return endpoints[0].region;
}

/**
 * 故障转移选择
 */
function selectByFailover(endpoints: RegionEndpoint[]): GatewayRegion {
  // 按健康状态和延迟排序
  const sorted = [...endpoints].sort((a, b) => {
    if (a.healthStatus === 'healthy' && b.healthStatus !== 'healthy') return -1;
    if (a.healthStatus !== 'healthy' && b.healthStatus === 'healthy') return 1;
    return a.latencyMs - b.latencyMs;
  });
  
  return sorted[0]?.region || 'asia';
}

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `grt-${timestamp}-${random}`;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  region: GatewayRegion;
  status: HealthStatus;
  latencyMs: number;
  timestamp: Date;
  error?: string;
}

/**
 * 执行健康检查
 */
export async function performHealthCheck(
  endpoint: RegionEndpoint,
  timeout: number
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
    
    const response = await fetch(`${endpoint.url}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const latencyMs = Date.now() - startTime;
    
    return {
      region: endpoint.region,
      status: response.ok ? 'healthy' : 'unhealthy',
      latencyMs,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      region: endpoint.region,
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 网关请求选项
 */
export interface GatewayRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  preferredRegion?: GatewayRegion;
}

/**
 * 构建网关URL
 */
export function buildGatewayUrl(
  endpoint: RegionEndpoint,
  path: string
): string {
  const baseUrl = endpoint.url.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
