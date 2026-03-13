/**
 * KUKA KRC4 Adapter — RSI (Robot Sensor Interface)
 *
 * Protocol: XML messages over UDP, relayed through HTTP gateway.
 * Gateway endpoints: POST /kuka/rsi/{robotId}/telemetry, /command
 * Special: RSI cycle time (4ms/12ms), external axes, KUKA.PLC mxA
 *
 * Includes built-in simulator fallback for testing without hardware.
 */

import { BaseRobotAdapter } from "./base-adapter";
import { generateBrandTelemetry } from "./robot-simulator";
import type {
  RobotBrand,
  RobotTelemetry,
  RobotCommand,
  RobotConnectionStatus,
  CommandResult,
  ProtocolConfig,
} from "./types";

export class KukaAdapter extends BaseRobotAdapter {
  readonly brand: RobotBrand = "kuka";
  readonly protocolName = "RSI";
  private simulationMode = true;

  constructor() {
    super("kuka-adapter");
  }

  protected async doConnect(config: ProtocolConfig): Promise<RobotConnectionStatus> {
    const start = Date.now();

    // Attempt real gateway connection
    try {
      const baseUrl = `${config.gatewayUrl}:${config.gatewayPort}`;
      const resp = await fetch(`${baseUrl}/kuka/rsi/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(config.timeoutMs),
        body: JSON.stringify({ authToken: config.authCredential }),
      });

      if (resp.ok) {
        this.simulationMode = false;
        return {
          connected: true,
          latencyMs: Date.now() - start,
          lastHeartbeat: new Date().toISOString(),
          firmwareVersion: "KSS 8.6",
          controllerStatus: "ready",
        };
      }
    } catch {
      // Gateway unreachable — fall back to simulation
    }

    this.simulationMode = true;
    this.log.info("Using simulation mode (gateway unreachable)");
    return {
      connected: true,
      latencyMs: Date.now() - start,
      lastHeartbeat: new Date().toISOString(),
      firmwareVersion: "KSS 8.6 (simulated)",
      controllerStatus: "simulated",
    };
  }

  protected async doDisconnect(): Promise<void> {
    if (!this.simulationMode && this.config) {
      try {
        const baseUrl = this.getGatewayBaseUrl();
        await fetch(`${baseUrl}/kuka/rsi/disconnect`, { method: "POST" });
      } catch {
        // Best effort
      }
    }
  }

  protected async doGetTelemetry(): Promise<RobotTelemetry> {
    if (this.simulationMode) {
      return generateBrandTelemetry("kuka");
    }

    const baseUrl = this.getGatewayBaseUrl();
    const resp = await fetch(`${baseUrl}/kuka/rsi/telemetry`, {
      method: "GET",
      signal: AbortSignal.timeout(this.config?.timeoutMs ?? 5000),
    });
    return resp.json() as Promise<RobotTelemetry>;
  }

  protected async doSendCommand(cmd: RobotCommand): Promise<CommandResult> {
    if (this.simulationMode) {
      return { success: true, response: { simulated: true, command: cmd.type, brand: "kuka" } };
    }

    const baseUrl = this.getGatewayBaseUrl();
    const resp = await fetch(`${baseUrl}/kuka/rsi/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(this.config?.timeoutMs ?? 5000),
    });
    const data = await resp.json();
    return { success: resp.ok, response: data };
  }

  protected async doPing(): Promise<{ ok: boolean; latencyMs: number }> {
    if (this.simulationMode) {
      return { ok: true, latencyMs: Math.floor(Math.random() * 5) + 1 };
    }

    const start = Date.now();
    const baseUrl = this.getGatewayBaseUrl();
    const resp = await fetch(`${baseUrl}/kuka/rsi/ping`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return { ok: resp.ok, latencyMs: Date.now() - start };
  }
}
