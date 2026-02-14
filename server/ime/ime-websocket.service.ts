/**
 * G-IME Phase 2: Real-time Meeting Assistant WebSocket Service
 * 实时会议助手 WebSocket 服务
 *
 * Path: /ws/ime-live
 * Connection: ws://host/ws/ime-live?sessionId=Z&userId=X&userName=Y
 * Client → Server: transcription_segment, ping
 * Server → Client: contribution_update, ai_suggestion, session_ended, pong
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import * as imeService from "./ime.service";

interface IMEConnection {
  ws: WebSocket;
  sessionId: number;
  userId: string;
  userName: string;
  lastActivity: Date;
}

// sessionId → connections
const sessions = new Map<number, Set<IMEConnection>>();

let wss: WebSocketServer | null = null;

export function initIMEWebSocket(server: any): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests for /ws/ime-live path
  server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/ime-live") return;

    const sessionId = Number(url.searchParams.get("sessionId"));
    const userId = url.searchParams.get("userId") || "unknown";
    const userName = decodeURIComponent(url.searchParams.get("userName") || "Unknown");

    if (!sessionId) {
      socket.destroy();
      return;
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit("connection", ws, request, { sessionId, userId, userName });
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, params: { sessionId: number; userId: string; userName: string }) => {
    const conn: IMEConnection = {
      ws,
      sessionId: params.sessionId,
      userId: params.userId,
      userName: params.userName,
      lastActivity: new Date(),
    };

    // Add to session group
    if (!sessions.has(params.sessionId)) {
      sessions.set(params.sessionId, new Set());
    }
    sessions.get(params.sessionId)!.add(conn);

    console.log(`[IME-WS] Connected: user=${params.userName} session=${params.sessionId}`);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        conn.lastActivity = new Date();
        await handleMessage(conn, message);
      } catch (e) {
        console.error("[IME-WS] Message error:", e);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => {
      const sessionConns = sessions.get(params.sessionId);
      if (sessionConns) {
        sessionConns.delete(conn);
        if (sessionConns.size === 0) {
          sessions.delete(params.sessionId);
        }
      }
      console.log(`[IME-WS] Disconnected: user=${params.userName} session=${params.sessionId}`);
    });

    ws.on("error", (err) => {
      console.error(`[IME-WS] Error: user=${params.userName}`, err.message);
    });
  });

  // Cleanup inactive connections every 60s
  setInterval(() => {
    const now = Date.now();
    Array.from(sessions.entries()).forEach(([sessionId, conns]) => {
      Array.from(conns).forEach((conn) => {
        if (now - conn.lastActivity.getTime() > 5 * 60 * 1000) {
          conn.ws.close(4001, "Inactive");
          conns.delete(conn);
        }
      });
      if (conns.size === 0) sessions.delete(sessionId);
    });
  }, 60000);

  return wss;
}

async function handleMessage(conn: IMEConnection, message: any) {
  switch (message.type) {
    case "transcription_segment": {
      const segment = {
        speaker: message.speaker || conn.userName,
        text: message.text || "",
        start: message.start,
        end: message.end,
      };

      try {
        const result = await imeService.processLiveSegment(conn.sessionId, segment);

        // Broadcast contribution update to all session participants
        broadcastToSession(conn.sessionId, {
          type: "contribution_update",
          snapshot: result.updatedSnapshot,
          totalSegments: result.totalSegments,
        });

        // If we got an AI suggestion, broadcast it
        if (result.suggestion) {
          broadcastToSession(conn.sessionId, {
            type: "ai_suggestion",
            suggestion: result.suggestion,
            totalSegments: result.totalSegments,
          });
        }
      } catch (e) {
        console.error("[IME-WS] Segment processing error:", e);
      }
      break;
    }

    case "ping":
      conn.ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;

    default:
      console.warn(`[IME-WS] Unknown message type: ${message.type}`);
  }
}

function broadcastToSession(sessionId: number, data: any) {
  const conns = sessions.get(sessionId);
  if (!conns) return;

  const payload = JSON.stringify(data);
  Array.from(conns).forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(payload);
    }
  });
}

export function notifySessionEnded(sessionId: number) {
  broadcastToSession(sessionId, { type: "session_ended", timestamp: Date.now() });
}

export function getIMEWebSocketStats() {
  let totalConnections = 0;
  sessions.forEach((conns) => { totalConnections += conns.size; });
  return {
    activeSessions: sessions.size,
    totalConnections,
  };
}
