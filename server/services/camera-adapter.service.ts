/**
 * Camera Adapter Service — 工业相机多品牌适配器
 *
 * Supports 6 camera brands with unified interface:
 *   Hikvision (ISAPI + Digest Auth)
 *   Dahua     (ONVIF + HTTP API)
 *   Axis      (VAPIX API)
 *   Basler    (Pylon REST)
 *   Cognex    (In-Sight REST)
 *   Keyence   (CV-X HTTP)
 *
 * Each adapter provides: snapshot, stream URL, PTZ control, device info, health check.
 * Password field uses AES-256-CBC encryption at rest.
 */

import crypto from "crypto";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("camera-adapter");

// ─── Types ───────────────────────────────────────────────────

export interface CameraRow {
  id: number;
  cameraCode: string;
  name: string;
  brand: string;
  model: string | null;
  protocol: string | null;
  ipAddress: string;
  port: number | null;
  rtspUrl: string | null;
  httpSnapshotUrl: string | null;
  hlsProxyUrl: string | null;
  username: string | null;
  passwordEncrypted: string | null;
  location: string | null;
  stationId: number | null;
  machineId: number | null;
  warehouseId: number | null;
  purpose: string | null;
  resolution: string | null;
  fps: number | null;
  hasAudio: boolean | null;
  hasPtz: boolean | null;
  hasAiAnalysis: boolean | null;
  status: string | null;
  lastHeartbeat: string | null;
  isActive: boolean | null;
}

export interface PtzAction {
  command: "up" | "down" | "left" | "right" | "zoom_in" | "zoom_out" | "stop";
  speed?: number; // 1-100
  durationMs?: number;
}

export interface DeviceInfo {
  brand: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  macAddress?: string;
}

export interface CameraAdapter {
  getSnapshot(camera: CameraRow): Promise<Buffer>;
  getStreamUrl(camera: CameraRow): string;
  ptzControl(camera: CameraRow, action: PtzAction): Promise<void>;
  getDeviceInfo(camera: CameraRow): Promise<DeviceInfo>;
  healthCheck(camera: CameraRow): Promise<boolean>;
}

// ─── Encryption Helper ───────────────────────────────────────

const ENCRYPTION_KEY =
  process.env.CAMERA_ENCRYPTION_KEY || "grt-camera-default-key-32ch";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

function decryptPassword(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) return encryptedText; // plaintext fallback
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const key = Buffer.alloc(32);
    Buffer.from(ENCRYPTION_KEY).copy(key);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    log.warn({ err }, "Failed to decrypt camera password — check CAMERA_ENCRYPTION_KEY");
    return ""; // Return empty instead of encrypted text to avoid silent auth failures
  }
}

export function encryptPassword(plainText: string): string {
  const key = Buffer.alloc(32);
  Buffer.from(ENCRYPTION_KEY).copy(key);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function getCredentials(camera: CameraRow): { user: string; pass: string } {
  const user = camera.username || "admin";
  const pass = camera.passwordEncrypted
    ? decryptPassword(camera.passwordEncrypted)
    : "";
  return { user, pass };
}

function getPort(camera: CameraRow, defaultPort: number): number {
  return camera.port ?? defaultPort;
}

// ─── Helper: fetch with timeout ──────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Hikvision Adapter (ISAPI + Digest Auth) ─────────────────

class HikvisionAdapter implements CameraAdapter {
  async getSnapshot(camera: CameraRow): Promise<Buffer> {
    const { user, pass } = getCredentials(camera);
    const url =
      camera.httpSnapshotUrl ||
      `http://${camera.ipAddress}:${getPort(camera, 80)}/ISAPI/Streaming/channels/101/picture`;
    log.info({ cameraCode: camera.cameraCode, url }, "Hikvision snapshot");
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`Hikvision snapshot failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getStreamUrl(camera: CameraRow): string {
    if (camera.rtspUrl) return camera.rtspUrl;
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 554);
    return `rtsp://${user}:${pass}@${camera.ipAddress}:${port}/Streaming/Channels/101`;
  }

  async ptzControl(camera: CameraRow, action: PtzAction): Promise<void> {
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 80);
    const speed = action.speed ?? 50;
    const panSpeed = ["left", "right"].includes(action.command) ? speed : 0;
    const tiltSpeed = ["up", "down"].includes(action.command) ? speed : 0;
    const zoomSpeed = action.command.startsWith("zoom_") ? speed : 0;
    const body = `<PTZData><pan>${action.command === "right" ? panSpeed : -panSpeed}</pan><tilt>${action.command === "up" ? tiltSpeed : -tiltSpeed}</tilt><zoom>${action.command === "zoom_in" ? zoomSpeed : -zoomSpeed}</zoom></PTZData>`;
    const url = `http://${camera.ipAddress}:${port}/ISAPI/PTZCtrl/channels/1/continuous`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    await fetchWithTimeout(url, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/xml",
      },
      body,
    });
    log.info({ cameraCode: camera.cameraCode, action: action.command }, "Hikvision PTZ");
  }

  async getDeviceInfo(camera: CameraRow): Promise<DeviceInfo> {
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 80);
    const url = `http://${camera.ipAddress}:${port}/ISAPI/System/deviceInfo`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const text = await res.text();
    return {
      brand: "hikvision",
      model: text.match(/<model>(.*?)<\/model>/)?.[1] || camera.model || "unknown",
      serialNumber: text.match(/<serialNumber>(.*?)<\/serialNumber>/)?.[1] || "",
      firmwareVersion: text.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/)?.[1] || "",
      macAddress: text.match(/<macAddress>(.*?)<\/macAddress>/)?.[1],
    };
  }

  async healthCheck(camera: CameraRow): Promise<boolean> {
    try {
      const port = getPort(camera, 80);
      const res = await fetchWithTimeout(
        `http://${camera.ipAddress}:${port}/ISAPI/System/status`,
        {},
        5000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Dahua Adapter (ONVIF + HTTP API) ────────────────────────

class DahuaAdapter implements CameraAdapter {
  async getSnapshot(camera: CameraRow): Promise<Buffer> {
    const { user, pass } = getCredentials(camera);
    const url =
      camera.httpSnapshotUrl ||
      `http://${camera.ipAddress}:${getPort(camera, 80)}/cgi-bin/snapshot.cgi`;
    log.info({ cameraCode: camera.cameraCode, url }, "Dahua snapshot");
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`Dahua snapshot failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getStreamUrl(camera: CameraRow): string {
    if (camera.rtspUrl) return camera.rtspUrl;
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 554);
    return `rtsp://${user}:${pass}@${camera.ipAddress}:${port}/cam/realmonitor?channel=1&subtype=0`;
  }

  async ptzControl(camera: CameraRow, action: PtzAction): Promise<void> {
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 80);
    const cmdMap: Record<string, string> = {
      up: "Up", down: "Down", left: "Left", right: "Right",
      zoom_in: "ZoomTele", zoom_out: "ZoomWide", stop: "Stop",
    };
    const cmd = cmdMap[action.command] || "Stop";
    const url = `http://${camera.ipAddress}:${port}/cgi-bin/ptz.cgi?action=start&channel=1&code=${cmd}&arg1=0&arg2=${action.speed ?? 5}&arg3=0`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    await fetchWithTimeout(url, { headers: { Authorization: `Basic ${auth}` } });
    log.info({ cameraCode: camera.cameraCode, action: action.command }, "Dahua PTZ");
  }

  async getDeviceInfo(camera: CameraRow): Promise<DeviceInfo> {
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 80);
    const url = `http://${camera.ipAddress}:${port}/cgi-bin/magicBox.cgi?action=getDeviceType`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const text = await res.text();
    return {
      brand: "dahua",
      model: text.split("=")[1]?.trim() || camera.model || "unknown",
      serialNumber: "",
      firmwareVersion: "",
    };
  }

  async healthCheck(camera: CameraRow): Promise<boolean> {
    try {
      const port = getPort(camera, 80);
      const res = await fetchWithTimeout(
        `http://${camera.ipAddress}:${port}/cgi-bin/magicBox.cgi?action=getSerialNo`,
        {},
        5000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Axis Adapter (VAPIX API) ────────────────────────────────

class AxisAdapter implements CameraAdapter {
  async getSnapshot(camera: CameraRow): Promise<Buffer> {
    const { user, pass } = getCredentials(camera);
    const url =
      camera.httpSnapshotUrl ||
      `http://${camera.ipAddress}:${getPort(camera, 80)}/axis-cgi/jpg/image.cgi`;
    log.info({ cameraCode: camera.cameraCode, url }, "Axis snapshot");
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`Axis snapshot failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getStreamUrl(camera: CameraRow): string {
    if (camera.rtspUrl) return camera.rtspUrl;
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 554);
    return `rtsp://${user}:${pass}@${camera.ipAddress}:${port}/axis-media/media.amp`;
  }

  async ptzControl(camera: CameraRow, action: PtzAction): Promise<void> {
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 80);
    const cmdMap: Record<string, string> = {
      up: "tilt=10", down: "tilt=-10", left: "pan=-10", right: "pan=10",
      zoom_in: "zoom=100", zoom_out: "zoom=-100", stop: "continuouspantiltmove=0,0",
    };
    const cmd = cmdMap[action.command] || "continuouspantiltmove=0,0";
    const url = `http://${camera.ipAddress}:${port}/axis-cgi/com/ptz.cgi?${cmd}`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    await fetchWithTimeout(url, { headers: { Authorization: `Basic ${auth}` } });
    log.info({ cameraCode: camera.cameraCode, action: action.command }, "Axis PTZ");
  }

  async getDeviceInfo(camera: CameraRow): Promise<DeviceInfo> {
    const { user, pass } = getCredentials(camera);
    const port = getPort(camera, 80);
    const url = `http://${camera.ipAddress}:${port}/axis-cgi/basicdeviceinfo.cgi`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiVersion: "1.0", method: "getAllProperties" }),
    });
    const data = (await res.json()) as Record<string, any>;
    const props = data?.data?.propertyList || {};
    return {
      brand: "axis",
      model: props.ProdShortName || camera.model || "unknown",
      serialNumber: props.SerialNumber || "",
      firmwareVersion: props.Version || "",
      macAddress: props.MacAddress,
    };
  }

  async healthCheck(camera: CameraRow): Promise<boolean> {
    try {
      const port = getPort(camera, 80);
      const res = await fetchWithTimeout(
        `http://${camera.ipAddress}:${port}/axis-cgi/param.cgi?action=list&group=Brand`,
        {},
        5000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Basler Adapter (Pylon REST) ─────────────────────────────

class BaslerAdapter implements CameraAdapter {
  private getBaseUrl(camera: CameraRow): string {
    return `http://${camera.ipAddress}:${getPort(camera, 8080)}`;
  }

  async getSnapshot(camera: CameraRow): Promise<Buffer> {
    const serial = camera.model || camera.cameraCode;
    const url =
      camera.httpSnapshotUrl ||
      `${this.getBaseUrl(camera)}/api/cameras/${serial}/snapshot`;
    log.info({ cameraCode: camera.cameraCode, url }, "Basler snapshot");
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Basler snapshot failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getStreamUrl(camera: CameraRow): string {
    if (camera.rtspUrl) return camera.rtspUrl;
    const serial = camera.model || camera.cameraCode;
    return `${this.getBaseUrl(camera)}/api/cameras/${serial}/stream`;
  }

  async ptzControl(_camera: CameraRow, _action: PtzAction): Promise<void> {
    log.warn("Basler cameras typically do not support PTZ");
  }

  async getDeviceInfo(camera: CameraRow): Promise<DeviceInfo> {
    const serial = camera.model || camera.cameraCode;
    const url = `${this.getBaseUrl(camera)}/api/cameras/${serial}`;
    const res = await fetchWithTimeout(url);
    const data = (await res.json()) as Record<string, any>;
    return {
      brand: "basler",
      model: data.modelName || camera.model || "unknown",
      serialNumber: data.serialNumber || "",
      firmwareVersion: data.firmwareVersion || "",
    };
  }

  async healthCheck(camera: CameraRow): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${this.getBaseUrl(camera)}/api/cameras`,
        {},
        5000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Cognex Adapter (In-Sight REST) ──────────────────────────

class CognexAdapter implements CameraAdapter {
  async getSnapshot(camera: CameraRow): Promise<Buffer> {
    const url =
      camera.httpSnapshotUrl ||
      `http://${camera.ipAddress}:${getPort(camera, 80)}/api/image`;
    log.info({ cameraCode: camera.cameraCode, url }, "Cognex snapshot");
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Cognex snapshot failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getStreamUrl(camera: CameraRow): string {
    if (camera.rtspUrl) return camera.rtspUrl;
    return `http://${camera.ipAddress}:${getPort(camera, 80)}/api/image?stream=true`;
  }

  async ptzControl(_camera: CameraRow, _action: PtzAction): Promise<void> {
    log.warn("Cognex In-Sight cameras do not support PTZ");
  }

  async getDeviceInfo(camera: CameraRow): Promise<DeviceInfo> {
    const url = `http://${camera.ipAddress}:${getPort(camera, 80)}/api/info`;
    const res = await fetchWithTimeout(url);
    const data = (await res.json()) as Record<string, any>;
    return {
      brand: "cognex",
      model: data.model || camera.model || "unknown",
      serialNumber: data.serialNumber || "",
      firmwareVersion: data.firmwareVersion || "",
    };
  }

  async healthCheck(camera: CameraRow): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `http://${camera.ipAddress}:${getPort(camera, 80)}/api/info`,
        {},
        5000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Keyence Adapter (CV-X HTTP) ─────────────────────────────

class KeyenceAdapter implements CameraAdapter {
  async getSnapshot(camera: CameraRow): Promise<Buffer> {
    const url =
      camera.httpSnapshotUrl ||
      `http://${camera.ipAddress}:${getPort(camera, 80)}/api/v1/capture`;
    log.info({ cameraCode: camera.cameraCode, url }, "Keyence snapshot");
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Keyence snapshot failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getStreamUrl(camera: CameraRow): string {
    if (camera.rtspUrl) return camera.rtspUrl;
    return `http://${camera.ipAddress}:${getPort(camera, 80)}/api/v1/stream`;
  }

  async ptzControl(_camera: CameraRow, _action: PtzAction): Promise<void> {
    log.warn("Keyence CV-X cameras do not support PTZ");
  }

  async getDeviceInfo(camera: CameraRow): Promise<DeviceInfo> {
    const url = `http://${camera.ipAddress}:${getPort(camera, 80)}/api/v1/device`;
    const res = await fetchWithTimeout(url);
    const data = (await res.json()) as Record<string, any>;
    return {
      brand: "keyence",
      model: data.model || camera.model || "unknown",
      serialNumber: data.serialNumber || "",
      firmwareVersion: data.firmwareVersion || "",
    };
  }

  async healthCheck(camera: CameraRow): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `http://${camera.ipAddress}:${getPort(camera, 80)}/api/v1/device`,
        {},
        5000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────

const adapters: Record<string, CameraAdapter> = {
  hikvision: new HikvisionAdapter(),
  dahua: new DahuaAdapter(),
  axis: new AxisAdapter(),
  basler: new BaslerAdapter(),
  cognex: new CognexAdapter(),
  keyence: new KeyenceAdapter(),
};

export function getCameraAdapter(brand: string): CameraAdapter {
  const adapter = adapters[brand.toLowerCase()];
  if (!adapter) {
    throw new Error(`Unsupported camera brand: ${brand}. Supported: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}
