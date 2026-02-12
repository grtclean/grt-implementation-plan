/**
 * v1.7.2 CCD检测WebSocket实时推送服务
 * CCD Detection Real-time Push Service
 * 
 * 功能：
 * 1. CCD检测结果实时推送到已订阅的客户端
 * 2. 按项目/工序订阅管理
 * 3. 连接状态监控与统计
 * 4. 与现有WebSocket服务集成
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// ============================================================
// 类型定义
// ============================================================

/** CCD WebSocket连接 */
interface CcdWSConnection {
  ws: WebSocket;
  connectionId: string;
  userId: number;
  userName: string;
  /** 订阅的项目ID列表 */
  subscribedProjects: Set<string>;
  /** 订阅的工序代码列表 */
  subscribedProcesses: Set<string>;
  /** 是否订阅所有（管理员模式） */
  subscribeAll: boolean;
  lastActivity: Date;
  connectedAt: Date;
}

/** CCD WebSocket消息类型 */
interface CcdWSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'detection_result' | 'stats' | 'connection_info';
  data?: any;
  timestamp?: number;
}

/** CCD检测推送数据 */
export interface CcdDetectionPushData {
  detectionId: string;
  stationId: string;
  projectId: string;
  processCode: string;
  partId?: string;
  partName?: string;
  overallScore: number;
  severity: 'critical' | 'major' | 'minor' | 'pass';
  defectCount: number;
  triggeredInterlock: boolean;
  inCooldown: boolean;
  defects: Array<{
    defectType: string;
    location: string;
    confidence: number;
    description?: string;
  }>;
  inspectedAt: number;
  processedAt: number;
}

// ============================================================
// 连接管理
// ============================================================

/** 所有CCD WebSocket连接 */
const ccdConnections = new Map<string, CcdWSConnection>();

/** 按项目分组的连接ID */
const projectSubscriptions = new Map<string, Set<string>>();

/** 按工序分组的连接ID */
const processSubscriptions = new Map<string, Set<string>>();

/** 订阅所有的连接ID */
const allSubscriptions = new Set<string>();

/** 生成连接ID */
function generateCcdConnectionId(): string {
  return `ccd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// 订阅管理
// ============================================================

/** 处理订阅请求 */
function handleSubscribe(connId: string, message: CcdWSMessage) {
  const conn = ccdConnections.get(connId);
  if (!conn) return;

  const { projects, processes, all } = message.data || {};

  // 订阅所有
  if (all) {
    conn.subscribeAll = true;
    allSubscriptions.add(connId);
  }

  // 订阅项目
  if (Array.isArray(projects)) {
    for (const projectId of projects) {
      conn.subscribedProjects.add(projectId);
      if (!projectSubscriptions.has(projectId)) {
        projectSubscriptions.set(projectId, new Set());
      }
      projectSubscriptions.get(projectId)!.add(connId);
    }
  }

  // 订阅工序
  if (Array.isArray(processes)) {
    for (const processCode of processes) {
      conn.subscribedProcesses.add(processCode);
      if (!processSubscriptions.has(processCode)) {
        processSubscriptions.set(processCode, new Set());
      }
      processSubscriptions.get(processCode)!.add(connId);
    }
  }

  // 确认订阅
  conn.ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      status: 'ok',
      subscribedProjects: Array.from(conn.subscribedProjects),
      subscribedProcesses: Array.from(conn.subscribedProcesses),
      subscribeAll: conn.subscribeAll,
    },
    timestamp: Date.now(),
  }));
}

/** 处理取消订阅 */
function handleUnsubscribe(connId: string, message: CcdWSMessage) {
  const conn = ccdConnections.get(connId);
  if (!conn) return;

  const { projects, processes, all } = message.data || {};

  if (all) {
    conn.subscribeAll = false;
    allSubscriptions.delete(connId);
  }

  if (Array.isArray(projects)) {
    for (const projectId of projects) {
      conn.subscribedProjects.delete(projectId);
      const subs = projectSubscriptions.get(projectId);
      if (subs) {
        subs.delete(connId);
        if (subs.size === 0) projectSubscriptions.delete(projectId);
      }
    }
  }

  if (Array.isArray(processes)) {
    for (const processCode of processes) {
      conn.subscribedProcesses.delete(processCode);
      const subs = processSubscriptions.get(processCode);
      if (subs) {
        subs.delete(connId);
        if (subs.size === 0) processSubscriptions.delete(processCode);
      }
    }
  }

  conn.ws.send(JSON.stringify({
    type: 'unsubscribe',
    data: {
      status: 'ok',
      subscribedProjects: Array.from(conn.subscribedProjects),
      subscribedProcesses: Array.from(conn.subscribedProcesses),
      subscribeAll: conn.subscribeAll,
    },
    timestamp: Date.now(),
  }));
}

// ============================================================
// 推送功能
// ============================================================

/**
 * 推送CCD检测结果到所有匹配的订阅者
 * 这是核心推送函数，在CCD检测结果处理完成后调用
 */
export function pushCcdDetectionResult(data: CcdDetectionPushData) {
  const targetConnIds = new Set<string>();

  // 1. 收集订阅了所有的连接
  allSubscriptions.forEach(connId => targetConnIds.add(connId));

  // 2. 收集订阅了该项目的连接
  const projectSubs = projectSubscriptions.get(data.projectId);
  if (projectSubs) {
    projectSubs.forEach(connId => targetConnIds.add(connId));
  }

  // 3. 收集订阅了该工序的连接
  const processSubs = processSubscriptions.get(data.processCode);
  if (processSubs) {
    processSubs.forEach(connId => targetConnIds.add(connId));
  }

  // 4. 推送到所有目标连接
  const message = JSON.stringify({
    type: 'detection_result',
    data,
    timestamp: Date.now(),
  });

  let sentCount = 0;
  let failedCount = 0;

  targetConnIds.forEach(connId => {
    const conn = ccdConnections.get(connId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(message);
        sentCount++;
      } catch (err) {
        failedCount++;
        console.error(`[CCD-WS] Failed to send to ${connId}:`, err);
      }
    }
  });

  return { targetCount: targetConnIds.size, sentCount, failedCount };
}

// ============================================================
// 连接断开处理
// ============================================================

/** 清理断开的连接 */
function handleCcdDisconnect(connId: string) {
  const conn = ccdConnections.get(connId);
  if (!conn) return;

  // 清理项目订阅
  conn.subscribedProjects.forEach(projectId => {
    const subs = projectSubscriptions.get(projectId);
    if (subs) {
      subs.delete(connId);
      if (subs.size === 0) projectSubscriptions.delete(projectId);
    }
  });

  // 清理工序订阅
  conn.subscribedProcesses.forEach(processCode => {
    const subs = processSubscriptions.get(processCode);
    if (subs) {
      subs.delete(connId);
      if (subs.size === 0) processSubscriptions.delete(processCode);
    }
  });

  // 清理全局订阅
  allSubscriptions.delete(connId);

  // 移除连接
  ccdConnections.delete(connId);
}

// ============================================================
// WebSocket服务器初始化
// ============================================================

/**
 * 初始化CCD检测WebSocket服务器
 * 在现有HTTP服务器上添加新的WebSocket路径
 */
export function initCcdWebSocketServer(server: any): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws/ccd-detection',
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const connId = generateCcdConnectionId();

    // 从URL参数获取用户信息
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId') || '0');
    const userName = url.searchParams.get('userName') || 'Anonymous';

    if (!userId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // 创建连接记录
    const connection: CcdWSConnection = {
      ws,
      connectionId: connId,
      userId,
      userName,
      subscribedProjects: new Set(),
      subscribedProcesses: new Set(),
      subscribeAll: false,
      lastActivity: new Date(),
      connectedAt: new Date(),
    };
    ccdConnections.set(connId, connection);

    console.log(`[CCD-WS] New connection: ${connId}, user: ${userName}`);

    // 处理消息
    ws.on('message', (data: Buffer) => {
      try {
        const message: CcdWSMessage = JSON.parse(data.toString());
        const conn = ccdConnections.get(connId);
        if (conn) conn.lastActivity = new Date();

        switch (message.type) {
          case 'subscribe':
            handleSubscribe(connId, message);
            break;
          case 'unsubscribe':
            handleUnsubscribe(connId, message);
            break;
          case 'stats':
            ws.send(JSON.stringify({
              type: 'stats',
              data: getCcdWebSocketStats(),
              timestamp: Date.now(),
            }));
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
        }
      } catch (error) {
        console.error('[CCD-WS] Message parse error:', error);
      }
    });

    // 处理断开连接
    ws.on('close', () => {
      console.log(`[CCD-WS] Connection closed: ${connId}`);
      handleCcdDisconnect(connId);
    });

    // 处理错误
    ws.on('error', (error) => {
      console.error(`[CCD-WS] Connection error: ${connId}`, error);
      handleCcdDisconnect(connId);
    });

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'connection_info',
      data: {
        connectionId: connId,
        status: 'connected',
        availableCommands: ['subscribe', 'unsubscribe', 'stats', 'ping'],
      },
      timestamp: Date.now(),
    }));
  });

  // 定期清理不活跃连接（3分钟超时）
  setInterval(() => {
    const now = new Date();
    const timeout = 3 * 60 * 1000;

    ccdConnections.forEach((conn, connId) => {
      if (now.getTime() - conn.lastActivity.getTime() > timeout) {
        console.log(`[CCD-WS] Cleaning up inactive connection: ${connId}`);
        conn.ws.close(4002, 'Inactive');
        handleCcdDisconnect(connId);
      }
    });
  }, 60 * 1000);

  console.log('[CCD-WS] CCD Detection real-time push server initialized');
  return wss;
}

// ============================================================
// 统计信息
// ============================================================

/** 获取CCD WebSocket统计信息 */
export function getCcdWebSocketStats() {
  const connectionDetails: Array<{
    connectionId: string;
    userId: number;
    userName: string;
    subscribedProjects: string[];
    subscribedProcesses: string[];
    subscribeAll: boolean;
    connectedAt: string;
    lastActivity: string;
  }> = [];

  ccdConnections.forEach((conn) => {
    connectionDetails.push({
      connectionId: conn.connectionId,
      userId: conn.userId,
      userName: conn.userName,
      subscribedProjects: Array.from(conn.subscribedProjects),
      subscribedProcesses: Array.from(conn.subscribedProcesses),
      subscribeAll: conn.subscribeAll,
      connectedAt: conn.connectedAt.toISOString(),
      lastActivity: conn.lastActivity.toISOString(),
    });
  });

  return {
    totalConnections: ccdConnections.size,
    projectSubscriptions: projectSubscriptions.size,
    processSubscriptions: processSubscriptions.size,
    allSubscribers: allSubscriptions.size,
    connections: connectionDetails,
  };
}

export default {
  initCcdWebSocketServer,
  pushCcdDetectionResult,
  getCcdWebSocketStats,
};
