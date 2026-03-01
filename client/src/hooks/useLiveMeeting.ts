/**
 * G-IME Phase 2: Live Meeting WebSocket Hook
 * 实时会议助手 WebSocket 连接管理
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface Contribution {
  [speaker: string]: {
    speakingTime: number;
    segments: number;
    lastText: string;
  };
}

interface LiveMeetingState {
  isConnected: boolean;
  contributions: Contribution;
  suggestions: string[];
  totalSegments: number;
  error: string | null;
}

export function useLiveMeeting() {
  const [state, setState] = useState<LiveMeetingState>({
    isConnected: false,
    contributions: {},
    suggestions: [],
    totalSegments: 0,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const isDisconnectingRef = useRef(false);

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

  const connect = useCallback((sessionId: number, userId?: string, userName?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    isDisconnectingRef.current = false;
    sessionIdRef.current = sessionId;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/ime-live?sessionId=${sessionId}&userId=${encodeURIComponent(userId || "user")}&userName=${encodeURIComponent(userName || "User")}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[IME-Live] Connected to session", sessionId);
        setState((s) => ({ ...s, isConnected: true, error: null }));

        // 30s heartbeat
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "contribution_update":
              setState((s) => ({
                ...s,
                contributions: msg.snapshot || s.contributions,
                totalSegments: msg.totalSegments || s.totalSegments,
              }));
              break;
            case "ai_suggestion":
              if (msg.suggestion) {
                setState((s) => ({
                  ...s,
                  suggestions: [...s.suggestions, msg.suggestion],
                  totalSegments: msg.totalSegments || s.totalSegments,
                }));
              }
              break;
            case "session_ended":
              setState((s) => ({ ...s, isConnected: false }));
              cleanup();
              break;
            case "pong":
              break;
            case "error":
              setState((s) => ({ ...s, error: msg.message }));
              break;
          }
        } catch (e) {
          console.error("[IME-Live] Message parse error:", e);
        }
      };

      ws.onclose = (event) => {
        console.log("[IME-Live] Disconnected:", event.code);
        setState((s) => ({ ...s, isConnected: false }));
        cleanup();

        // Auto-reconnect on abnormal close (skip if intentionally disconnecting)
        if (event.code !== 1000 && event.code !== 4001 && sessionIdRef.current && !isDisconnectingRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[IME-Live] Reconnecting...");
            connect(sessionIdRef.current!, userId, userName);
          }, 3000);
        }
      };

      ws.onerror = () => {
        setState((s) => ({ ...s, error: "WebSocket connection failed" }));
      };
    } catch (e) {
      setState((s) => ({ ...s, error: "Cannot establish connection" }));
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    isDisconnectingRef.current = true;
    cleanup();
    sessionIdRef.current = null;
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnect");
      wsRef.current = null;
    }
    setState((s) => ({ ...s, isConnected: false }));
  }, [cleanup]);

  const sendSegment = useCallback(
    (segment: { speaker: string; text: string; start?: number; end?: number }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "transcription_segment",
            ...segment,
          })
        );
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendSegment,
  };
}

export default useLiveMeeting;
