/**
 * useConcurrentSync — 并行指挥中心实时同步 Hook
 *
 * Connects to WebSocket workspace 9900 (CCC dedicated channel).
 * Listens for 'action' messages → invalidates tRPC queries + shows toasts.
 * Maintains a local activity log merged with server history.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Constants ───────────────────────────────────────────────────────────────

const CCC_WORKSPACE_ID = 9900;
const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;
const MAX_LOCAL_ACTIVITIES = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  action: string;
  target: string;
  userName: string;
  timestamp: string;
}

interface OnlineUser {
  userId: number;
  userName: string;
}

// Human-readable action labels
const ACTION_LABELS: Record<string, string> = {
  claimRoom: "claimed",
  updateRoomStatus: "updated status of",
  approveMerge: "approved merge for",
  updateSandboxStatus: "updated sandbox",
  approveCommissioningReport: "approved",
};

function describeAction(entry: ActivityEntry): string {
  const verb = ACTION_LABELS[entry.action] ?? entry.action;
  return `${entry.userName} ${verb} ${entry.target}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConcurrentSync(userId: number, userName: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();

  // Fetch server-side activity log on mount
  const historyQuery = trpc.concurrentCommand.getActivityLog.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Seed local activities from server history once
  const seededRef = useRef(false);
  useEffect(() => {
    if (historyQuery.data && !seededRef.current) {
      seededRef.current = true;
      const mapped: ActivityEntry[] = historyQuery.data.slice(0, MAX_LOCAL_ACTIVITIES).map((a: any) => ({
        id: String(a.id),
        action: a.action ?? "",
        target: a.target ?? "",
        userName: a.userName ?? "",
        timestamp: a.createdAt ?? a.timestamp ?? "",
      }));
      setActivities(mapped);
    }
  }, [historyQuery.data]);

  // Invalidate all CCC queries so the UI refreshes
  const invalidateAll = useCallback(() => {
    utils.concurrentCommand.listRooms.invalidate();
    utils.concurrentCommand.listSandboxes.invalidate();
    utils.concurrentCommand.generateCommissioningReport.invalidate();
    utils.concurrentCommand.getActivityLog.invalidate();
  }, [utils]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "action" && msg.data) {
          const raw = msg.data;
          const entry: ActivityEntry = {
            id: String(raw.id ?? ""),
            action: raw.action ?? "",
            target: raw.target ?? "",
            userName: raw.userName ?? "",
            timestamp: raw.createdAt ?? raw.timestamp ?? msg.timestamp ?? new Date().toISOString(),
          };

          // Append to local activity list
          setActivities((prev) => {
            const merged = [entry, ...prev.filter((a) => a.id !== entry.id)];
            return merged.slice(0, MAX_LOCAL_ACTIVITIES);
          });

          // Show toast notification
          toast.info(describeAction(entry));

          // Invalidate queries so tRPC refetches
          invalidateAll();
        }

        if (msg.type === "sync" && msg.data?.presence) {
          setOnlineUsers(msg.data.presence);
        }

        if (msg.type === "presence" && msg.data?.presence) {
          setOnlineUsers(msg.data.presence);
        }
      } catch {
        // Ignore parse errors
      }
    },
    [invalidateAll],
  );

  // Connect / reconnect logic
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/collaboration?userId=${userId}&userName=${encodeURIComponent(userName)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Join the CCC workspace
        ws.send(JSON.stringify({ type: "join", workspaceId: CCC_WORKSPACE_ID, timestamp: Date.now() }));
        // Heartbeat
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = handleMessage;

      ws.onclose = (ev) => {
        setIsConnected(false);
        cleanup();
        if (ev.code !== 1000 && ev.code !== 4001) {
          reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }
  }, [userId, userName, handleMessage]);

  const cleanup = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
  }, []);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    if (userId) connect();
    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close(1000, "unmount");
        wsRef.current = null;
      }
    };
  }, [userId, connect, cleanup]);

  return { isConnected, onlineUsers, activities };
}

export default useConcurrentSync;
