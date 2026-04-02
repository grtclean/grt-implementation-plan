/**
 * Camera Event WebSocket Service — 摄像头事件实时推送
 *
 * Path: /ws/camera-events
 * Connection: ws://host/ws/camera-events?cameraIds=1,2,3 | ?stationId=5 | ?location=SHOPFLOOR | ?all=true
 * Server → Client: camera_status_change, camera_event, snapshot_captured, recording_started, recording_stopped
 * Client → Server: ping
 * Server → Client: pong
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import type { Server } from "http";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("camera-ws");
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// ─── Types ──────────────────────────────────────────────────────
export type CameraWsEventType =
  | "camera_status_change"
  | "camera_event"
  | "snapshot_captured"
  | "recording_started"
  | "recording_stopped";

export interface CameraWsEvent {
  type: CameraWsEventType;
  cameraId: number;
  timestamp: string;
  previousStatus?: string;
  newStatus?: string;
  eventType?: string;
  severity?: string;
  description?: string;
  snapshotUrl?: string;
  snapshotId?: number;
  triggerType?: string;
  recordingId?: number;
  workOrderId?: number;
}

interface CameraConnection {
  cameraIds: number[];
  stationId?: number;
  location?: string;
  all: boolean;
  lastPing: number;
}

// ─── State ──────────────────────────────────────────────────────
const clients = new Map<WebSocket, CameraConnection>();
let wss: WebSocketServer | null = null;

// ─── Init ───────────────────────────────────────────────────────
export function initCameraEventWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/camera-events") return;

    const cameraIdsRaw = url.searchParams.get("cameraIds");
    const stationIdRaw = url.searchParams.get("stationId");
    const location = url.searchParams.get("location") || undefined;
    const all = url.searchParams.get("all") === "true";

    const cameraIds = cameraIdsRaw
      ? cameraIdsRaw.split(",").map(Number).filter((n) => !isNaN(n))
      : [];
    const stationId = stationIdRaw ? Number(stationIdRaw) : undefined;

    if (!all && cameraIds.length === 0 && !stationId && !location) {
      socket.destroy();
      return;
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit("connection", ws, { cameraIds, stationId, location, all });
    });
  });

  wss.on("connection", (ws: WebSocket, params: Omit<CameraConnection, "lastPing">) => {
    const conn: CameraConnection = { ...params, lastPing: Date.now() };
    clients.set(ws, conn);

    log.info({ cameraIds: conn.cameraIds, stationId: conn.stationId, location: conn.location, all: conn.all }, "Connected");

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        conn.lastPing = Date.now();
        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (e) {
        log.error({ err: e }, "Message parse error");
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      log.info("Disconnected");
    });

    ws.on("error", (err) => {
      log.error({ err }, "Connection error");
    });
  });

  // Cleanup stale connections every 60s (3-minute timeout) — prevent multiple intervals on re-init
  if (cleanupIntervalId) clearInterval(cleanupIntervalId);
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    clients.forEach((conn, ws) => {
      if (now - conn.lastPing > 3 * 60 * 1000) {
        ws.close(4001, "Inactive");
        clients.delete(ws);
      }
    });
  }, 60000);

  return wss;
}

// ─── Broadcast Helpers ──────────────────────────────────────────
function sendToWs(ws: WebSocket, event: CameraWsEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

export function broadcastCameraEvent(event: CameraWsEvent): void {
  clients.forEach((conn, ws) => {
    if (conn.all || conn.cameraIds.includes(event.cameraId)) {
      sendToWs(ws, event);
    }
  });
}

export function broadcastToCamera(cameraId: number, event: CameraWsEvent): void {
  clients.forEach((conn, ws) => {
    if (conn.all || conn.cameraIds.includes(cameraId)) {
      sendToWs(ws, event);
    }
  });
}

export function broadcastToStation(stationId: number, event: CameraWsEvent): void {
  clients.forEach((conn, ws) => {
    if (conn.all || conn.stationId === stationId) {
      sendToWs(ws, event);
    }
  });
}

export function broadcastToLocation(location: string, event: CameraWsEvent): void {
  clients.forEach((conn, ws) => {
    if (conn.all || conn.location === location) {
      sendToWs(ws, event);
    }
  });
}

export function getCameraWebSocketStats() {
  return {
    totalConnections: clients.size,
  };
}
