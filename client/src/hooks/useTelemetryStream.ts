import { useState, useEffect, useRef, useCallback } from "react";

interface TelemetryEvent {
  topic: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseTelemetryStreamOptions {
  /** List of topic channels to subscribe to */
  topics: string[];
  /** Whether the SSE connection is enabled (default: true) */
  enabled?: boolean;
  /** Callback fired on every incoming event */
  onEvent?: (event: TelemetryEvent) => void;
}

interface UseTelemetryStreamReturn {
  /** Whether the EventSource connection is currently open */
  connected: boolean;
  /** The most recently received event */
  lastEvent: TelemetryEvent | null;
  /** Rolling buffer of the last 100 events */
  events: TelemetryEvent[];
  /** Clear the events buffer */
  clear: () => void;
}

/**
 * React hook for subscribing to server-sent telemetry events.
 *
 * Opens an EventSource to `/api/telemetry/stream` filtered by topic list.
 * Automatically reconnects on error via the browser's native EventSource retry.
 * Keeps a rolling buffer of the last 100 events.
 */
export function useTelemetryStream(
  options: UseTelemetryStreamOptions
): UseTelemetryStreamReturn {
  const { topics, enabled = true, onEvent } = options;

  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TelemetryEvent | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Keep onEvent in a ref so it does not trigger reconnects when the callback
  // identity changes (common with inline arrow functions).
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Stable topic key for dependency comparison
  const topicKey = topics.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || topics.length === 0) {
      return;
    }

    const url = `/api/telemetry/stream?topics=${encodeURIComponent(topicKey)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as TelemetryEvent;
        setLastEvent(event);
        setEvents((prev) => [...prev.slice(-99), event]); // keep last 100
        onEventRef.current?.(event);
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      setConnected(false);
      // The browser will attempt automatic reconnection per the SSE spec.
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [topicKey, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return { connected, lastEvent, events, clear };
}
