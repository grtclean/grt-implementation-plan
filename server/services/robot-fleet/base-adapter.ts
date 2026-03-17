/**
 * Base Robot Adapter
 *
 * Abstract class implementing common logic for all robot brand adapters.
 * Handles connection state, retry logic, heartbeat tracking, and logging.
 */

import { createChildLogger } from "../../lib/logger";
import type {
  IRobotAdapter,
  RobotBrand,
  RobotTelemetry,
  RobotCommand,
  RobotConnectionStatus,
  CommandResult,
  ProtocolConfig,
} from "./types";

export abstract class BaseRobotAdapter implements IRobotAdapter {
  abstract readonly brand: RobotBrand;
  abstract readonly protocolName: string;

  protected connected = false;
  protected config: ProtocolConfig | null = null;
  protected lastHeartbeat: string = "";
  protected log: any;

  constructor(loggerName: string) {
    this.log = createChildLogger(loggerName) as any;
  }

  async connect(config: ProtocolConfig): Promise<RobotConnectionStatus> {
    this.config = config;
    const start = Date.now();

    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const status = await this.doConnect(config);
        this.connected = true;
        this.lastHeartbeat = new Date().toISOString();
        this.log.info("Connected", { brand: this.brand, attempt, latencyMs: Date.now() - start });
        return status;
      } catch (err) {
        lastError = err as Error;
        this.log.warn("Connection attempt failed", { brand: this.brand, attempt, error: lastError.message });
        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          await this.sleep(500 * Math.pow(2, attempt - 1));
        }
      }
    }

    this.connected = false;
    this.log.error("Connection failed after retries", { brand: this.brand, error: lastError?.message });
    return {
      connected: false,
      latencyMs: Date.now() - start,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.doDisconnect();
    } finally {
      this.connected = false;
      this.log.info("Disconnected", { brand: this.brand });
    }
  }

  async getTelemetry(): Promise<RobotTelemetry> {
    this.ensureConnected();
    return this.doGetTelemetry();
  }

  async sendCommand(cmd: RobotCommand): Promise<CommandResult> {
    this.ensureConnected();
    this.log.info("Sending command", { brand: this.brand, commandType: cmd.type });
    return this.doSendCommand(cmd);
  }

  async getStatus(): Promise<RobotConnectionStatus> {
    return {
      connected: this.connected,
      latencyMs: 0,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const result = await this.doPing();
      return { ok: result.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Abstract methods to be implemented by brand-specific adapters ──

  protected abstract doConnect(config: ProtocolConfig): Promise<RobotConnectionStatus>;
  protected abstract doDisconnect(): Promise<void>;
  protected abstract doGetTelemetry(): Promise<RobotTelemetry>;
  protected abstract doSendCommand(cmd: RobotCommand): Promise<CommandResult>;
  protected abstract doPing(): Promise<{ ok: boolean; latencyMs: number }>;

  // ── Helpers ──

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error(`${this.brand} adapter not connected. Call connect() first.`);
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getGatewayBaseUrl(): string {
    if (!this.config) throw new Error("No config set");
    return `${this.config.gatewayUrl}:${this.config.gatewayPort}`;
  }
}
