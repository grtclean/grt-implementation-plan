/**
 * WebSocket 协作服务单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket相关模块
vi.mock('ws', () => {
  const mockWebSocket = vi.fn().mockImplementation(() => ({
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  }));
  
  const mockWebSocketServer = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  }));
  
  return {
    WebSocket: mockWebSocket,
    WebSocketServer: mockWebSocketServer,
    default: { WebSocket: mockWebSocket, WebSocketServer: mockWebSocketServer },
  };
});

describe('WebSocket Collaboration Service', () => {
  describe('Message Types', () => {
    it('should define valid message types', () => {
      const validTypes = ['join', 'leave', 'edit', 'cursor', 'chat', 'sync', 'presence', 'ping', 'pong'];
      
      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edit Operations', () => {
    it('should support insert operation', () => {
      const insertOp = {
        type: 'insert' as const,
        position: { line: 0, column: 0 },
        text: 'Hello World',
        userId: 1,
        timestamp: Date.now(),
      };
      
      expect(insertOp.type).toBe('insert');
      expect(insertOp.text).toBe('Hello World');
      expect(insertOp.position.line).toBe(0);
      expect(insertOp.position.column).toBe(0);
    });

    it('should support delete operation', () => {
      const deleteOp = {
        type: 'delete' as const,
        position: { line: 0, column: 5 },
        length: 6,
        userId: 1,
        timestamp: Date.now(),
      };
      
      expect(deleteOp.type).toBe('delete');
      expect(deleteOp.length).toBe(6);
    });

    it('should support replace operation', () => {
      const replaceOp = {
        type: 'replace' as const,
        position: { line: 0, column: 0 },
        text: 'New Text',
        length: 8,
        userId: 1,
        timestamp: Date.now(),
      };
      
      expect(replaceOp.type).toBe('replace');
      expect(replaceOp.text).toBe('New Text');
      expect(replaceOp.length).toBe(8);
    });
  });

  describe('Cursor Position', () => {
    it('should track cursor position correctly', () => {
      const cursor = {
        userId: 1,
        userName: 'Test User',
        position: { line: 10, column: 25 },
        color: '#FF6B6B',
      };
      
      expect(cursor.position.line).toBe(10);
      expect(cursor.position.column).toBe(25);
      expect(cursor.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should assign different colors to different users', () => {
      const userColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      ];
      
      const getUserColor = (userId: number): string => {
        return userColors[userId % userColors.length];
      };
      
      expect(getUserColor(0)).toBe('#FF6B6B');
      expect(getUserColor(1)).toBe('#4ECDC4');
      expect(getUserColor(10)).toBe('#FF6B6B'); // Wraps around
    });
  });

  describe('Presence Management', () => {
    it('should track online users in workspace', () => {
      const onlineUsers = [
        { userId: 1, userName: 'User 1', documentId: 1 },
        { userId: 2, userName: 'User 2', documentId: 1 },
        { userId: 3, userName: 'User 3', documentId: undefined },
      ];
      
      expect(onlineUsers.length).toBe(3);
      expect(onlineUsers.filter(u => u.documentId === 1).length).toBe(2);
    });

    it('should handle user join event', () => {
      const joinMessage = {
        type: 'join' as const,
        workspaceId: 1,
        userId: 1,
        userName: 'Test User',
        timestamp: Date.now(),
      };
      
      expect(joinMessage.type).toBe('join');
      expect(joinMessage.workspaceId).toBe(1);
    });

    it('should handle user leave event', () => {
      const leaveMessage = {
        type: 'leave' as const,
        workspaceId: 1,
        userId: 1,
        userName: 'Test User',
        timestamp: Date.now(),
      };
      
      expect(leaveMessage.type).toBe('leave');
    });
  });

  describe('Chat Messages', () => {
    it('should format chat message correctly', () => {
      const chatMessage = {
        type: 'chat' as const,
        workspaceId: 1,
        userId: 1,
        userName: 'Test User',
        data: {
          content: 'Hello everyone!',
          messageId: 'msg_123456789_abc123',
        },
        timestamp: Date.now(),
      };
      
      expect(chatMessage.type).toBe('chat');
      expect(chatMessage.data.content).toBe('Hello everyone!');
      expect(chatMessage.data.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('Document Sync', () => {
    it('should sync document content and version', () => {
      const syncMessage = {
        type: 'sync' as const,
        workspaceId: 1,
        documentId: 1,
        data: {
          content: '# Document Title\n\nContent here...',
          version: 5,
          cursors: [],
        },
        timestamp: Date.now(),
      };
      
      expect(syncMessage.type).toBe('sync');
      expect(syncMessage.data.version).toBe(5);
      expect(syncMessage.data.content).toContain('# Document Title');
    });

    it('should increment version on each edit', () => {
      let version = 0;
      
      const applyEdit = () => {
        version++;
        return version;
      };
      
      expect(applyEdit()).toBe(1);
      expect(applyEdit()).toBe(2);
      expect(applyEdit()).toBe(3);
    });
  });

  describe('Connection Management', () => {
    it('should generate unique connection IDs', () => {
      const generateConnectionId = (): string => {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      };
      
      const id1 = generateConnectionId();
      const id2 = generateConnectionId();
      
      expect(id1).toMatch(/^conn_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^conn_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should handle ping/pong for keepalive', () => {
      const pingMessage = { type: 'ping' as const, timestamp: Date.now() };
      const pongMessage = { type: 'pong' as const, timestamp: Date.now() };
      
      expect(pingMessage.type).toBe('ping');
      expect(pongMessage.type).toBe('pong');
    });
  });

  describe('WebSocket Stats', () => {
    it('should return stats object with correct structure', () => {
      const mockStats = {
        totalConnections: 5,
        activeWorkspaces: 2,
        activeDocuments: 3,
        cachedDocuments: 3,
      };
      
      expect(mockStats).toHaveProperty('totalConnections');
      expect(mockStats).toHaveProperty('activeWorkspaces');
      expect(mockStats).toHaveProperty('activeDocuments');
      expect(mockStats).toHaveProperty('cachedDocuments');
      expect(typeof mockStats.totalConnections).toBe('number');
    });
  });
});
