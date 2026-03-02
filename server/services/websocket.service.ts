/**
 * WebSocket 实时协作服务
 * 
 * 功能：
 * 1. 实时文档协作编辑
 * 2. 在线状态同步
 * 3. 实时消息推送
 * 4. 光标位置同步
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("websocket");

// 连接类型定义
interface WSConnection {
  ws: WebSocket;
  userId: number;
  userName: string;
  workspaceId: number;
  documentId?: number;
  cursorPosition?: { line: number; column: number };
  lastActivity: Date;
}

// 消息类型定义
interface WSMessage {
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'chat' | 'sync' | 'presence' | 'ping' | 'pong' | 'action';
  workspaceId: number;
  documentId?: number;
  userId?: number;
  userName?: string;
  data?: any;
  timestamp?: number;
}

// 文档编辑操作
interface EditOperation {
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  text?: string;
  length?: number;
  userId: number;
  timestamp: number;
}

// 存储所有连接
const connections = new Map<string, WSConnection>();

// 按工作区分组的连接
const workspaceConnections = new Map<number, Set<string>>();

// 按文档分组的连接
const documentConnections = new Map<number, Set<string>>();

// 文档内容缓存（简化版，生产环境应使用Redis）
const documentCache = new Map<number, {
  content: string;
  version: number;
  lastModified: Date;
}>();

// 操作历史（用于冲突解决）
const operationHistory = new Map<number, EditOperation[]>();

/**
 * 生成连接ID
 */
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 广播消息到工作区内所有连接
 */
function broadcastToWorkspace(workspaceId: number, message: WSMessage, excludeConnectionId?: string) {
  const connIds = workspaceConnections.get(workspaceId);
  if (!connIds) return;

  const messageStr = JSON.stringify(message);
  connIds.forEach(connId => {
    if (connId === excludeConnectionId) return;
    const conn = connections.get(connId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(messageStr);
    }
  });
}

/**
 * 广播消息到文档内所有连接
 */
function broadcastToDocument(documentId: number, message: WSMessage, excludeConnectionId?: string) {
  const connIds = documentConnections.get(documentId);
  if (!connIds) return;

  const messageStr = JSON.stringify(message);
  connIds.forEach(connId => {
    if (connId === excludeConnectionId) return;
    const conn = connections.get(connId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(messageStr);
    }
  });
}

/**
 * 获取工作区在线成员列表
 */
function getWorkspacePresence(workspaceId: number): Array<{ userId: number; userName: string; documentId?: number }> {
  const connIds = workspaceConnections.get(workspaceId);
  if (!connIds) return [];

  const presence: Array<{ userId: number; userName: string; documentId?: number }> = [];
  const seenUsers = new Set<number>();

  connIds.forEach(connId => {
    const conn = connections.get(connId);
    if (conn && !seenUsers.has(conn.userId)) {
      seenUsers.add(conn.userId);
      presence.push({
        userId: conn.userId,
        userName: conn.userName,
        documentId: conn.documentId,
      });
    }
  });

  return presence;
}

/**
 * 获取文档编辑者光标位置
 */
function getDocumentCursors(documentId: number): Array<{ userId: number; userName: string; position: { line: number; column: number } }> {
  const connIds = documentConnections.get(documentId);
  if (!connIds) return [];

  const cursors: Array<{ userId: number; userName: string; position: { line: number; column: number } }> = [];

  connIds.forEach(connId => {
    const conn = connections.get(connId);
    if (conn && conn.cursorPosition) {
      cursors.push({
        userId: conn.userId,
        userName: conn.userName,
        position: conn.cursorPosition,
      });
    }
  });

  return cursors;
}

/**
 * 处理加入工作区
 */
function handleJoinWorkspace(connId: string, message: WSMessage) {
  const conn = connections.get(connId);
  if (!conn) return;

  conn.workspaceId = message.workspaceId;
  
  // 添加到工作区连接组
  if (!workspaceConnections.has(message.workspaceId)) {
    workspaceConnections.set(message.workspaceId, new Set());
  }
  workspaceConnections.get(message.workspaceId)!.add(connId);

  // 广播用户加入消息
  broadcastToWorkspace(message.workspaceId, {
    type: 'presence',
    workspaceId: message.workspaceId,
    userId: conn.userId,
    userName: conn.userName,
    data: {
      action: 'join',
      presence: getWorkspacePresence(message.workspaceId),
    },
    timestamp: Date.now(),
  }, connId);

  // 发送当前在线成员列表给新加入的用户
  conn.ws.send(JSON.stringify({
    type: 'sync',
    workspaceId: message.workspaceId,
    data: {
      presence: getWorkspacePresence(message.workspaceId),
    },
    timestamp: Date.now(),
  }));
}

/**
 * 处理加入文档编辑
 */
function handleJoinDocument(connId: string, message: WSMessage) {
  const conn = connections.get(connId);
  if (!conn || !message.documentId) return;

  conn.documentId = message.documentId;

  // 添加到文档连接组
  if (!documentConnections.has(message.documentId)) {
    documentConnections.set(message.documentId, new Set());
  }
  documentConnections.get(message.documentId)!.add(connId);

  // 获取文档内容（从缓存或数据库）
  const docCache = documentCache.get(message.documentId);

  // 广播用户加入文档编辑
  broadcastToDocument(message.documentId, {
    type: 'presence',
    workspaceId: conn.workspaceId,
    documentId: message.documentId,
    userId: conn.userId,
    userName: conn.userName,
    data: {
      action: 'join_document',
      cursors: getDocumentCursors(message.documentId),
    },
    timestamp: Date.now(),
  }, connId);

  // 发送文档内容和光标位置给新加入的用户
  conn.ws.send(JSON.stringify({
    type: 'sync',
    workspaceId: conn.workspaceId,
    documentId: message.documentId,
    data: {
      content: docCache?.content || '',
      version: docCache?.version || 0,
      cursors: getDocumentCursors(message.documentId),
    },
    timestamp: Date.now(),
  }));
}

/**
 * 处理文档编辑操作
 */
function handleEdit(connId: string, message: WSMessage) {
  const conn = connections.get(connId);
  if (!conn || !conn.documentId || !message.data) return;

  const operation: EditOperation = {
    ...message.data,
    userId: conn.userId,
    timestamp: Date.now(),
  };

  // 记录操作历史
  if (!operationHistory.has(conn.documentId)) {
    operationHistory.set(conn.documentId, []);
  }
  operationHistory.get(conn.documentId)!.push(operation);

  // 限制历史记录长度
  const history = operationHistory.get(conn.documentId)!;
  if (history.length > 1000) {
    history.splice(0, 500);
  }

  // 更新文档缓存
  const docCache = documentCache.get(conn.documentId) || { content: '', version: 0, lastModified: new Date() };
  docCache.version++;
  docCache.lastModified = new Date();
  // 实际应用操作到内容（简化版）
  if (operation.type === 'insert' && operation.text) {
    // 简化处理：实际应该按行列位置插入
    docCache.content += operation.text;
  }
  documentCache.set(conn.documentId, docCache);

  // 广播编辑操作到其他编辑者
  broadcastToDocument(conn.documentId, {
    type: 'edit',
    workspaceId: conn.workspaceId,
    documentId: conn.documentId,
    userId: conn.userId,
    userName: conn.userName,
    data: {
      operation,
      version: docCache.version,
    },
    timestamp: Date.now(),
  }, connId);
}

/**
 * 处理光标位置更新
 */
function handleCursor(connId: string, message: WSMessage) {
  const conn = connections.get(connId);
  if (!conn || !conn.documentId || !message.data) return;

  conn.cursorPosition = message.data.position;
  conn.lastActivity = new Date();

  // 广播光标位置到其他编辑者
  broadcastToDocument(conn.documentId, {
    type: 'cursor',
    workspaceId: conn.workspaceId,
    documentId: conn.documentId,
    userId: conn.userId,
    userName: conn.userName,
    data: {
      position: conn.cursorPosition,
    },
    timestamp: Date.now(),
  }, connId);
}

/**
 * 处理聊天消息
 */
function handleChat(connId: string, message: WSMessage) {
  const conn = connections.get(connId);
  if (!conn || !message.data) return;

  // 广播聊天消息到工作区
  broadcastToWorkspace(conn.workspaceId, {
    type: 'chat',
    workspaceId: conn.workspaceId,
    userId: conn.userId,
    userName: conn.userName,
    data: {
      content: message.data.content,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    timestamp: Date.now(),
  });
}

/**
 * 处理连接断开
 */
function handleDisconnect(connId: string) {
  const conn = connections.get(connId);
  if (!conn) return;

  // 从文档连接组移除
  if (conn.documentId) {
    const docConns = documentConnections.get(conn.documentId);
    if (docConns) {
      docConns.delete(connId);
      if (docConns.size === 0) {
        documentConnections.delete(conn.documentId);
      }
    }

    // 广播用户离开文档
    broadcastToDocument(conn.documentId, {
      type: 'presence',
      workspaceId: conn.workspaceId,
      documentId: conn.documentId,
      userId: conn.userId,
      userName: conn.userName,
      data: {
        action: 'leave_document',
        cursors: getDocumentCursors(conn.documentId),
      },
      timestamp: Date.now(),
    });
  }

  // 从工作区连接组移除
  if (conn.workspaceId) {
    const wsConns = workspaceConnections.get(conn.workspaceId);
    if (wsConns) {
      wsConns.delete(connId);
      if (wsConns.size === 0) {
        workspaceConnections.delete(conn.workspaceId);
      }
    }

    // 广播用户离开工作区
    broadcastToWorkspace(conn.workspaceId, {
      type: 'presence',
      workspaceId: conn.workspaceId,
      userId: conn.userId,
      userName: conn.userName,
      data: {
        action: 'leave',
        presence: getWorkspacePresence(conn.workspaceId),
      },
      timestamp: Date.now(),
    });
  }

  // 移除连接
  connections.delete(connId);
}

/**
 * 初始化WebSocket服务器
 */
export function initWebSocketServer(server: any): WebSocketServer {
  // Use noServer mode to avoid destroying sockets for non-matching paths
  // (ws library's { server, path } mode calls abortHandshake on mismatches,
  //  which kills Vite HMR WebSocket connections)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname !== '/ws/collaboration') return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const connId = generateConnectionId();
    
    // 从URL参数获取用户信息（实际应该从session验证）
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId') || '0');
    const userName = url.searchParams.get('userName') || 'Anonymous';

    if (!userId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // 创建连接记录
    const connection: WSConnection = {
      ws,
      userId,
      userName,
      workspaceId: 0,
      lastActivity: new Date(),
    };
    connections.set(connId, connection);

    log.info({ connId, userName }, "New connection");

    // 处理消息
    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join':
            if (message.documentId) {
              handleJoinDocument(connId, message);
            } else {
              handleJoinWorkspace(connId, message);
            }
            break;
          case 'edit':
            handleEdit(connId, message);
            break;
          case 'cursor':
            handleCursor(connId, message);
            break;
          case 'chat':
            handleChat(connId, message);
            break;
          case 'action':
            // Rebroadcast action messages to all workspace members
            if (message.workspaceId) {
              broadcastToWorkspace(message.workspaceId, {
                ...message,
                timestamp: Date.now(),
              }, connId);
            }
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
        }
      } catch (error) {
        log.error({ err: error }, "Message parse error");
      }
    });

    // 处理断开连接
    ws.on('close', () => {
      log.info({ connId }, "Connection closed");
      handleDisconnect(connId);
    });

    // 处理错误
    ws.on('error', (error) => {
      log.error({ err: error, connId }, "Connection error");
      handleDisconnect(connId);
    });

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'sync',
      data: { connectionId: connId, status: 'connected' },
      timestamp: Date.now(),
    }));
  });

  // 定期清理不活跃连接
  setInterval(() => {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5分钟超时

    connections.forEach((conn, connId) => {
      if (now.getTime() - conn.lastActivity.getTime() > timeout) {
        log.info({ connId }, "Cleaning up inactive connection");
        conn.ws.close(4002, 'Inactive');
        handleDisconnect(connId);
      }
    });
  }, 60 * 1000); // 每分钟检查一次

  log.info("Collaboration server initialized");
  return wss;
}

/**
 * 获取WebSocket服务统计信息
 */
export function getWebSocketStats() {
  return {
    totalConnections: connections.size,
    activeWorkspaces: workspaceConnections.size,
    activeDocuments: documentConnections.size,
    cachedDocuments: documentCache.size,
  };
}

export { broadcastToWorkspace, getWorkspacePresence };

export default {
  initWebSocketServer,
  getWebSocketStats,
  broadcastToWorkspace,
  getWorkspacePresence,
};
