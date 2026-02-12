/**
 * 实时协作编辑 Hook
 * 
 * 功能：
 * 1. WebSocket连接管理
 * 2. 实时文档同步
 * 3. 光标位置同步
 * 4. 在线状态管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// WebSocket消息类型
interface WSMessage {
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'chat' | 'sync' | 'presence' | 'ping' | 'pong';
  workspaceId: number;
  documentId?: number;
  userId?: number;
  userName?: string;
  data?: any;
  timestamp?: number;
}

// 在线用户
interface OnlineUser {
  userId: number;
  userName: string;
  documentId?: number;
}

// 光标位置
interface CursorPosition {
  userId: number;
  userName: string;
  position: { line: number; column: number };
  color?: string;
}

// 编辑操作
interface EditOperation {
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  text?: string;
  length?: number;
}

// Hook配置
interface UseCollaborationOptions {
  workspaceId: number;
  documentId?: number;
  userId: number;
  userName: string;
  onContentChange?: (content: string, version: number) => void;
  onPresenceChange?: (users: OnlineUser[]) => void;
  onCursorsChange?: (cursors: CursorPosition[]) => void;
  onChatMessage?: (message: { userId: number; userName: string; content: string; timestamp: number }) => void;
}

// 用户颜色映射
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

function getUserColor(userId: number): string {
  return userColors[userId % userColors.length];
}

export function useCollaboration(options: UseCollaborationOptions) {
  const {
    workspaceId,
    documentId,
    userId,
    userName,
    onContentChange,
    onPresenceChange,
    onCursorsChange,
    onChatMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 连接WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // 构建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collaboration?userId=${userId}&userName=${encodeURIComponent(userName)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Collaboration] WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);

        // 加入工作区
        ws.send(JSON.stringify({
          type: 'join',
          workspaceId,
          timestamp: Date.now(),
        }));

        // 如果有文档ID，加入文档编辑
        if (documentId) {
          ws.send(JSON.stringify({
            type: 'join',
            workspaceId,
            documentId,
            timestamp: Date.now(),
          }));
        }

        // 启动心跳
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('[Collaboration] Message parse error:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[Collaboration] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        cleanup();

        // 自动重连（非正常关闭时）
        if (event.code !== 1000 && event.code !== 4001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Collaboration] Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
        setConnectionError('连接失败，请检查网络');
      };
    } catch (error) {
      console.error('[Collaboration] Connection error:', error);
      setConnectionError('无法建立连接');
    }
  }, [workspaceId, documentId, userId, userName]);

  // 处理接收到的消息
  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'sync':
        // 同步数据
        if (message.data) {
          if (message.data.presence) {
            setOnlineUsers(message.data.presence);
            onPresenceChange?.(message.data.presence);
          }
          if (message.data.content !== undefined) {
            setContent(message.data.content);
            setVersion(message.data.version || 0);
            onContentChange?.(message.data.content, message.data.version || 0);
          }
          if (message.data.cursors) {
            const cursorsWithColors = message.data.cursors.map((c: CursorPosition) => ({
              ...c,
              color: getUserColor(c.userId),
            }));
            setCursors(cursorsWithColors);
            onCursorsChange?.(cursorsWithColors);
          }
        }
        break;

      case 'presence':
        // 在线状态更新
        if (message.data) {
          if (message.data.presence) {
            setOnlineUsers(message.data.presence);
            onPresenceChange?.(message.data.presence);
          }
          if (message.data.cursors) {
            const cursorsWithColors = message.data.cursors.map((c: CursorPosition) => ({
              ...c,
              color: getUserColor(c.userId),
            }));
            setCursors(cursorsWithColors);
            onCursorsChange?.(cursorsWithColors);
          }
        }
        break;

      case 'edit':
        // 编辑操作
        if (message.data) {
          // 应用远程编辑操作
          // 实际实现需要使用OT或CRDT算法
          if (message.data.version) {
            setVersion(message.data.version);
          }
        }
        break;

      case 'cursor':
        // 光标位置更新
        if (message.data && message.userId) {
          setCursors(prev => {
            const filtered = prev.filter(c => c.userId !== message.userId);
            return [...filtered, {
              userId: message.userId!,
              userName: message.userName || 'Unknown',
              position: message.data.position,
              color: getUserColor(message.userId!),
            }];
          });
        }
        break;

      case 'chat':
        // 聊天消息
        if (message.data && onChatMessage) {
          onChatMessage({
            userId: message.userId || 0,
            userName: message.userName || 'Unknown',
            content: message.data.content,
            timestamp: message.timestamp || Date.now(),
          });
        }
        break;

      case 'pong':
        // 心跳响应
        break;
    }
  }, [onContentChange, onPresenceChange, onCursorsChange, onChatMessage]);

  // 清理资源
  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    cleanup();
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [cleanup]);

  // 发送编辑操作
  const sendEdit = useCallback((operation: EditOperation) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && documentId) {
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        workspaceId,
        documentId,
        data: operation,
        timestamp: Date.now(),
      }));
    }
  }, [workspaceId, documentId]);

  // 发送光标位置
  const sendCursor = useCallback((position: { line: number; column: number }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && documentId) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        workspaceId,
        documentId,
        data: { position },
        timestamp: Date.now(),
      }));
    }
  }, [workspaceId, documentId]);

  // 发送聊天消息
  const sendChat = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        workspaceId,
        data: { content },
        timestamp: Date.now(),
      }));
    }
  }, [workspaceId]);

  // 加入文档编辑
  const joinDocument = useCallback((docId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join',
        workspaceId,
        documentId: docId,
        timestamp: Date.now(),
      }));
    }
  }, [workspaceId]);

  // 自动连接和断开
  useEffect(() => {
    if (workspaceId && userId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [workspaceId, userId]);

  // 文档ID变化时加入新文档
  useEffect(() => {
    if (isConnected && documentId) {
      joinDocument(documentId);
    }
  }, [isConnected, documentId, joinDocument]);

  return {
    isConnected,
    connectionError,
    onlineUsers,
    cursors,
    content,
    version,
    sendEdit,
    sendCursor,
    sendChat,
    joinDocument,
    connect,
    disconnect,
  };
}

export default useCollaboration;
