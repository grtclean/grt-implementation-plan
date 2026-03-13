/**
 * ABB IRC5 Adapter — EGM (Externally Guided Motion)
 *
 * Protocol: UDP protobuf, relayed through HTTP gateway.
 * Gateway endpoints: POST /abb/egm/{robotId}/telemetry, /command
 * Special: EGM filter bandwidth, RAPID task control, motion supervision
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

export class AbbAdapter extends BaseRobotAdapter {
  readonly brand: RobotBrand = "abb";
  readonly protocolName = "EGM";
  private simulationMode = true;

  constructor() {
    super("abb-adapter");
  }

  protected async doConnect(config: ProtocolConfig): Promise<RobotConnectionStatus> {
    const start = Date.now();

    try {
      const baseUrl = `${config.gatewayUrl}:${config.gatewayPort}`;
      const resp = await fetch(`${baseUrl}/abb/egm/ping`, {
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
          firmwareVersion: "RobotWare 6.15",
          controllerStatus: "ready",
        };
      }
    } catch {
      // Gateway unreachable
    }

    this.simulationMode = true;
    this.log.info("Using simulation mode (gateway unreachable)");
    return {
      connected: true,
      latencyMs: Date.now() - start,
      lastHeartbeat: new Date().toISOString(),
      firmwareVersion: "RobotWare 6.15 (simulated)",
      controllerStatus: "simulated",
    };
  }

  protected async doDisconnect(): Promise<void> {
    if (!this.simulationMode && this.config) {
      try {
        const baseUrl = this.getGatewayBaseUrl();
        await fetch(`${baseUrl}/abb/egm/disconnect`, { method: "POST" });
      } catch {
        // Best effort
      }
    }
  }

  protected async doGetTelemetry(): Promise<RobotTelemetry> {
    if (this.simulationMode) {
      return generateBrandTelemetry("abb");
    }

    const baseUrl = this.getGatewayBaseUrl();
    const resp = await fetch(`${baseUrl}/abb/egm/telemetry`, {
      method: "GET",
      signal: AbortSignal.timeout(this.config?.timeoutMs ?? 5000),
    });
    return resp.json() as Promise<RobotTelemetry>;
  }

  protected async doSendCommand(cmd: RobotCommand): Promise<CommandResult> {
    if (this.simulationMode) {
      return { success: true, response: { simulated: true, command: cmd.type, brand: "abb" } };
    }

    const baseUrl = this.getGatewayBaseUrl();
    const resp = await fetch(`${baseUrl}/abb/egm/command`, {
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
    const resp = await fetch(`${baseUrl}/abb/egm/ping`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return { ok: resp.ok, latencyMs: Date.now() - start };
  }
}
