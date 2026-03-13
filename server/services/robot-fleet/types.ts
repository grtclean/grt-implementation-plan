/**
 * Universal Robot Fleet Types
 *
 * Common interfaces for KUKA, FANUC, ABB, and Stäubli robot adapters.
 * Gateway-based architecture: adapters communicate via HTTP with edge gateways
 * that translate to native protocols (RSI/PCDK/EGM/uniVAL).
 */

export type RobotBrand = "kuka" | "fanuc" | "abb" | "staubli";

export interface RobotTelemetry {
  joints: number[];        // J1-J6 degrees
  tcp: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  speed: number;           // % of max
  payload: number;         // kg
  motorTemps: number[];    // celsius per motor
  operatingMode: string;   // auto/manual/t1/t2
  programName: string;
  programLine: number;
  timestamp: string;
}

export interface RobotCommand {
  type:
    | "movej" | "movel" | "movec" | "stop" | "pause" | "resume" | "home" | "set_speed" | "set_override"
    | "load_program" | "run_program" | "upload_program" | "debug_mode" | "auto_mode";
  params: Record<string, unknown>;
}

export interface RobotConnectionStatus {
  connected: boolean;
  latencyMs: number;
  lastHeartbeat: string;
  firmwareVersion?: string;
  controllerStatus?: string;
}

export interface IRobotAdapter {
  readonly brand: RobotBrand;
  readonly protocolName: string;
  connect(config: ProtocolConfig): Promise<RobotConnectionStatus>;
  disconnect(): Promise<void>;
  getTelemetry(): Promise<RobotTelemetry>;
  sendCommand(cmd: RobotCommand): Promise<CommandResult>;
  getStatus(): Promise<RobotConnectionStatus>;
  ping(): Promise<{ ok: boolean; latencyMs: number }>;
}

export interface CommandResult {
  success: boolean;
  response?: unknown;
  error?: string;
}

export interface ProtocolConfig {
  gatewayUrl: string;
  gatewayPort: number;
  authMethod: string;
  authCredential?: string;
  timeoutMs: number;
  customConfig?: Record<string, unknown>;
}

/** Brand-specific joint limits (degrees) */
export interface JointLimits {
  min: number[];
  max: number[];
}

/** Brand specification reference data */
export interface BrandSpec {
  brand: RobotBrand;
  protocolName: string;
  models: string[];
  controllerTypes: string[];
  defaultJointLimits: JointLimits;
  maxPayloadKg: number;
  reachMm: number;
  repeatabilityMm: number;
  description: string;
}

/** Protocol test report */
export interface ProtocolTestReport {
  robotId: number;
  robotCode: string;
  brand: RobotBrand;
  timestamp: string;
  ping: { ok: boolean; latencyMs: number };
  telemetry: { ok: boolean; data?: RobotTelemetry; error?: string };
  command: { ok: boolean; response?: unknown; error?: string };
  overall: "pass" | "partial" | "fail";
}
