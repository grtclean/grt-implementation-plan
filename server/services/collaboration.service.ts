/**
 * Collaboration Service
 * 使用Y.js实现实时协作编辑
 */

// @ts-ignore - yjs types not installed
import * as Y from "yjs";
// @ts-ignore - y-websocket types not installed
import { WebsocketProvider } from "y-websocket";
import { requireDb } from '../utils/db-helpers';
import { collaborationStates } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface CollaborationSession {
  meetingId: string;
  documentId: string;
  ydoc: Y.Doc;
  provider?: WebsocketProvider;
  users: Map<string, { userId: number; userName: string; color: string }>;
}

// 全局协作会话管理
const collaborationSessions = new Map<string, CollaborationSession>();

// 用户颜色池（用于光标和选择显示）
const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

/**
 * 初始化协作会话
 */
export async function initializeCollaborationSession(
  meetingId: string,
  userId: number,
  userName: string
): Promise<CollaborationSession> {
  const documentId = uuidv4();
  const database = await requireDb();

  // 检查是否已有现有会话
  let session = collaborationSessions.get(meetingId);

  if (!session) {
    // 创建新的Y.js文档
    const ydoc = new Y.Doc();

    // 从数据库加载之前的状态（如果存在）
    const existingState = await database
      .select()
      .from(collaborationStates)
      .where(eq(collaborationStates.meetingId, meetingId))
      .then((results) => results[results.length - 1]); // 获取最新版本

    if (existingState && existingState.state) {
      // 恢复之前的状态
      Y.applyUpdate(ydoc, Buffer.from(existingState.state));
    }

    session = {
      meetingId,
      documentId,
      ydoc,
      users: new Map(),
    };

    collaborationSessions.set(meetingId, session);
  }

  // 添加用户到会话
  const userColor = USER_COLORS[session.users.size % USER_COLORS.length];
  session.users.set(userId.toString(), {
    userId,
    userName,
    color: userColor,
  });

  return session;
}

/**
 * 获取协作会话
 */
export function getCollaborationSession(
  meetingId: string
): CollaborationSession | undefined {
  return collaborationSessions.get(meetingId);
}

/**
 * 获取Y.js文档
 */
export function getYDoc(meetingId: string): Y.Doc | undefined {
  const session = collaborationSessions.get(meetingId);
  return session?.ydoc;
}

/**
 * 获取协作状态（用于新用户加入时同步）
 */
export function getCollaborationState(meetingId: string): Uint8Array {
  const session = collaborationSessions.get(meetingId);
  if (!session) {
    throw new Error("Collaboration session not found");
  }

  return Y.encodeStateAsUpdate(session.ydoc);
}

/**
 * 应用远程更新
 */
export function applyRemoteUpdate(
  meetingId: string,
  update: Uint8Array
): void {
  const session = collaborationSessions.get(meetingId);
  if (!session) {
    throw new Error("Collaboration session not found");
  }

  Y.applyUpdate(session.ydoc, update);
}

/**
 * 保存协作状态到数据库
 */
export async function saveCollaborationState(meetingId: string): Promise<void> {
  const database = await requireDb();
  const session = collaborationSessions.get(meetingId);

  if (!session) {
    throw new Error("Collaboration session not found");
  }

  const state = Y.encodeStateAsUpdate(session.ydoc);
  const stateId = uuidv4();

  // 获取当前版本号
  const lastVersion = await database
    .select()
    .from(collaborationStates)
    .where(eq(collaborationStates.meetingId, meetingId))
    .then((results) => {
      if (results.length === 0) return 0;
      return Math.max(...results.map((r) => r.version || 0));
    });

  await database.insert(collaborationStates).values({
    id: stateId,
    meetingId,
    documentId: session.documentId,
    state: Buffer.from(state).toString('base64'),
    version: lastVersion + 1,
  });
}

/**
 * 获取活跃用户列表
 */
export function getActiveUsers(meetingId: string): Array<{
  userId: number;
  userName: string;
  color: string;
}> {
  const session = collaborationSessions.get(meetingId);
  if (!session) {
    return [];
  }

  return Array.from(session.users.values());
}

/**
 * 移除用户
 */
export function removeUserFromSession(
  meetingId: string,
  userId: number
): void {
  const session = collaborationSessions.get(meetingId);
  if (!session) {
    return;
  }

  session.users.delete(userId.toString());

  // 如果没有用户了，清理会话
  if (session.users.size === 0) {
    collaborationSessions.delete(meetingId);
  }
}

/**
 * 获取共享文本内容
 */
export function getSharedText(meetingId: string): string {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    return "";
  }

  const ytext = ydoc.getText("shared-text");
  return ytext.toString();
}

/**
 * 更新共享文本
 */
export function updateSharedText(meetingId: string, text: string): void {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    throw new Error("Y.js document not found");
  }

  const ytext = ydoc.getText("shared-text");
  ytext.delete(0, ytext.length);
  ytext.insert(0, text);
}

/**
 * 获取共享数组（用于存储结构化数据）
 */
export function getSharedArray(meetingId: string, arrayName: string): Y.Array<any> {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    throw new Error("Y.js document not found");
  }

  return ydoc.getArray(arrayName);
}

/**
 * 获取共享映射（用于存储键值对）
 */
export function getSharedMap(meetingId: string, mapName: string): Y.Map<any> {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    throw new Error("Y.js document not found");
  }

  return ydoc.getMap(mapName);
}

/**
 * 监听文档更新
 */
export function onDocumentUpdate(
  meetingId: string,
  callback: (update: Uint8Array, origin: any) => void
): void {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    throw new Error("Y.js document not found");
  }

  ydoc.on("update", callback);
}

/**
 * 移除文档更新监听
 */
export function offDocumentUpdate(
  meetingId: string,
  callback: (update: Uint8Array, origin: any) => void
): void {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    return;
  }

  ydoc.off("update", callback);
}

/**
 * 获取光标位置（用于显示其他用户的光标）
 */
export function getCursorPosition(
  meetingId: string,
  userId: number
): { line: number; column: number } | null {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    return null;
  }

  const cursorMap = ydoc.getMap("cursors");
  const cursor = cursorMap.get(userId.toString());

  return cursor || null;
}

/**
 * 更新光标位置
 */
export function updateCursorPosition(
  meetingId: string,
  userId: number,
  position: { line: number; column: number }
): void {
  const ydoc = getYDoc(meetingId);
  if (!ydoc) {
    throw new Error("Y.js document not found");
  }

  const cursorMap = ydoc.getMap("cursors");
  cursorMap.set(userId.toString(), position);
}

/**
 * 清理所有协作会话（用于服务器关闭）
 */
export async function cleanupAllSessions(): Promise<void> {
  // 保存所有会话状态
  for (const [meetingId] of Array.from(collaborationSessions)) {
    try {
      await saveCollaborationState(meetingId);
    } catch (error) {
      console.error(`Error saving collaboration state for meeting ${meetingId}:`, error);
    }
  }

  collaborationSessions.clear();
}

/**
 * 获取协作统计信息
 */
export function getCollaborationStats(): {
  activeSessions: number;
  totalUsers: number;
  sessions: Array<{
    meetingId: string;
    userCount: number;
    users: Array<{ userId: number; userName: string }>;
  }>;
} {
  const stats = {
    activeSessions: collaborationSessions.size,
    totalUsers: 0,
    sessions: [] as Array<{
      meetingId: string;
      userCount: number;
      users: Array<{ userId: number; userName: string }>;
    }>,
  };

  for (const [meetingId, session] of Array.from(collaborationSessions)) {
    const users = Array.from(session.users.values()).map((u: any) => ({
      userId: u.userId,
      userName: u.userName,
    }));

    stats.sessions.push({
      meetingId,
      userCount: session.users.size,
      users,
    });

    stats.totalUsers += session.users.size;
  }

  return stats;
}
