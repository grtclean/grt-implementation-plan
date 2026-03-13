/**
 * Telemetry Server-Sent Events (SSE) Service
 *
 * Singleton pub/sub manager for real-time telemetry push:
 *   - Clients connect via GET with topic subscriptions
 *   - Publishers push to topics; manager fans out to all subscribed clients
 *   - 30-second heartbeat keeps connections alive through proxies/LBs
 *   - Hard cap of 500 concurrent connections to prevent resource exhaustion
 *
 * Usage from routers:
 *   import { sseManager } from "../services/telemetry-sse.service";
 *   // In Express route handler:
 *   sseManager.addClient(clientId, res, ["iot:temp", "robot:alerts"]);
 *   // From any service:
 *   sseManager.publish("iot:temp", { robotId: 7, temp: 62.3 });
 */

import { createChildLogger } from "../lib/logger";
import { EventEmitter } from "events";
import type { Response } from "express";

const log = createChildLogger("telemetry-sse");

// ── Types ────────────────────────────────────────────────────────────────

interface SSEClient {
  res: Response;
  topics: string[];
  connectedAt: Date;
}

interface SSEEvent {
  id: string;
  topic: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ── SSE Manager ──────────────────────────────────────────────────────────

class TelemetrySSEManager {
  private emitter = new EventEmitter();
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private maxConnections = 500;
  private eventCounter = 0;

  constructor() {
    this.emitter.setMaxListeners(600);
    this.startHeartbeat();
    log.info(
      { maxConnections: this.maxConnections },
      "TelemetrySSEManager initialized"
    );
  }

  /**
   * Register an SSE client connection.
   *
   * Sets the required SSE headers, adds the client to the map,
   * subscribes to requested topics, and handles disconnect cleanup.
   */
  addClient(clientId: string, res: Response, topics: string[]): void {
    // Enforce connection limit
    if (this.clients.size >= this.maxConnections) {
      log.warn(
        { clientId, currentConnections: this.clients.size },
        "SSE connection rejected — max connections reached"
      );
      res.status(503).json({
        error: "Too many SSE connections",
        maxConnections: this.maxConnections,
      });
      return;
    }

    // If this clientId is already connected, close the old connection first
    if (this.clients.has(clientId)) {
      log.info({ clientId }, "Replacing existing SSE connection");
      this.removeClient(clientId);
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx buffering
    });

    // Send initial connection event
    const connectPayload: SSEEvent = {
      id: this.nextEventId(),
      topic: "system:connected",
      data: {
        clientId,
        subscribedTopics: topics,
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    this.writeEvent(res, connectPayload);

    // Register client
    const client: SSEClient = {
      res,
      topics: [...topics],
      connectedAt: new Date(),
    };
    this.clients.set(clientId, client);

    // Subscribe to each topic via EventEmitter
    const handler = (event: SSEEvent) => {
      this.writeEvent(res, event);
    };

    for (const topic of topics) {
      this.emitter.on(topic, handler);
    }

    // Clean up on disconnect
    res.on("close", () => {
      for (const topic of topics) {
        this.emitter.removeListener(topic, handler);
      }
      this.clients.delete(clientId);
      log.info(
        {
          clientId,
          duration: Date.now() - client.connectedAt.getTime(),
          remainingConnections: this.clients.size,
        },
        "SSE client disconnected"
      );
    });

    log.info(
      {
        clientId,
        topics,
        totalConnections: this.clients.size,
      },
      "SSE client connected"
    );
  }

  /**
   * Explicitly remove a client. Called on reconnect or administrative eviction.
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Send a close event before ending
    try {
      const closePayload: SSEEvent = {
        id: this.nextEventId(),
        topic: "system:disconnected",
        data: { clientId, reason: "server_eviction" },
        timestamp: new Date().toISOString(),
      };
      this.writeEvent(client.res, closePayload);
      client.res.end();
    } catch {
      // Client may already be gone — swallow
    }

    this.clients.delete(clientId);
    log.info({ clientId }, "SSE client removed");
  }

  /**
   * Publish an event to a topic. Fans out to all clients subscribed to that topic
   * via the EventEmitter.
   */
  publish(topic: string, data: Record<string, unknown>): void {
    const event: SSEEvent = {
      id: this.nextEventId(),
      topic,
      data,
      timestamp: new Date().toISOString(),
    };

    // Count how many listeners will receive this
    const listenerCount = this.emitter.listenerCount(topic);

    if (listenerCount === 0) {
      log.debug({ topic }, "Published to topic with no subscribers");
      return;
    }

    this.emitter.emit(topic, event);

    log.debug(
      { topic, eventId: event.id, listenerCount },
      "Event published to topic"
    );
  }

  /**
   * Send heartbeat comment every 30 seconds to keep connections alive
   * through proxies (Nginx, ALB, CloudFront) that close idle connections.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const deadClients: string[] = [];

      for (const [clientId, client] of this.clients.entries()) {
        try {
          client.res.write(`:heartbeat ${new Date().toISOString()}\n\n`);
        } catch {
          // Connection broken — mark for removal
          deadClients.push(clientId);
        }
      }

      // Purge dead connections
      for (const clientId of deadClients) {
        this.clients.delete(clientId);
        log.info({ clientId }, "Purged dead SSE connection during heartbeat");
      }

      if (deadClients.length > 0) {
        log.info(
          { purged: deadClients.length, remaining: this.clients.size },
          "Heartbeat sweep completed"
        );
      }
    }, 30_000);

    // Prevent the interval from keeping Node.js alive on shutdown
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Get current SSE connection statistics.
   */
  getStats(): {
    connections: number;
    topics: string[];
    maxConnections: number;
    clientDetails: Array<{
      clientId: string;
      topics: string[];
      connectedAt: string;
      durationMs: number;
    }>;
  } {
    const now = Date.now();
    const topicSet = new Set<string>();
    const clientDetails: Array<{
      clientId: string;
      topics: string[];
      connectedAt: string;
      durationMs: number;
    }> = [];

    for (const [clientId, client] of this.clients.entries()) {
      for (const t of client.topics) {
        topicSet.add(t);
      }
      clientDetails.push({
        clientId,
        topics: client.topics,
        connectedAt: client.connectedAt.toISOString(),
        durationMs: now - client.connectedAt.getTime(),
      });
    }

    return {
      connections: this.clients.size,
      topics: Array.from(topicSet).sort(),
      maxConnections: this.maxConnections,
      clientDetails,
    };
  }

  /**
   * Graceful shutdown — close all client connections and stop heartbeat.
   */
  shutdown(): void {
    log.info(
      { connections: this.clients.size },
      "Shutting down SSE manager"
    );

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const [clientId, client] of this.clients.entries()) {
      try {
        const shutdownEvent: SSEEvent = {
          id: this.nextEventId(),
          topic: "system:shutdown",
          data: { reason: "server_shutdown" },
          timestamp: new Date().toISOString(),
        };
        this.writeEvent(client.res, shutdownEvent);
        client.res.end();
      } catch {
        // Client already gone
      }
      this.clients.delete(clientId);
    }

    this.emitter.removeAllListeners();
    log.info("SSE manager shutdown complete");
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Write a single SSE event to a response stream.
   * Format: `id: <id>\nevent: <topic>\ndata: <json>\n\n`
   */
  private writeEvent(res: Response, event: SSEEvent): void {
    try {
      res.write(`id: ${event.id}\n`);
      res.write(`event: ${event.topic}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    } catch (err) {
      log.debug(
        { eventId: event.id, err },
        "Failed to write SSE event — client likely disconnected"
      );
    }
  }

  /**
   * Generate a monotonically increasing event ID.
   */
  private nextEventId(): string {
    this.eventCounter += 1;
    return `${Date.now()}-${this.eventCounter}`;
  }
}

// ── Singleton export ─────────────────────────────────────────────────────

export const sseManager = new TelemetrySSEManager();
