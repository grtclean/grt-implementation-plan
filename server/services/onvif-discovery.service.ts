/**
 * ONVIF Camera Discovery Service — 摄像头自动发现
 *
 * Lightweight HTTP-based discovery for Hikvision, Dahua, Axis cameras.
 * Scans GRT factory subnet (default 10.2.2.0/24) with brand-specific
 * endpoint probes and 500ms timeout per IP.
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("onvif-discovery");

// ─── Types ──────────────────────────────────────────────────────
export interface DiscoveredCamera {
  ipAddress: string;
  port: number;
  brand?: string;
  model?: string;
  protocol?: string;
}

interface ProbeTarget {
  port: number;
  path: string;
  brand: string;
  protocol: string;
}

const PROBE_TARGETS: ProbeTarget[] = [
  { port: 80, path: "/ISAPI/System/deviceInfo", brand: "Hikvision", protocol: "ISAPI" },
  { port: 80, path: "/cgi-bin/magicBox.cgi?action=getDeviceType", brand: "Dahua", protocol: "CGI" },
  { port: 80, path: "/axis-cgi/basicdeviceinfo.cgi", brand: "Axis", protocol: "VAPIX" },
  { port: 8080, path: "/ISAPI/System/deviceInfo", brand: "Hikvision", protocol: "ISAPI" },
  { port: 8080, path: "/cgi-bin/magicBox.cgi?action=getDeviceType", brand: "Dahua", protocol: "CGI" },
  { port: 554, path: "/", brand: "Unknown", protocol: "RTSP" },
];

const BATCH_SIZE = 20;
const TIMEOUT_MS = 500;

// ─── Helpers ────────────────────────────────────────────────────
function generateSubnetIPs(subnet: string): string[] {
  // Simple /24 subnet expansion: "10.2.2.0/24" → 10.2.2.1 .. 10.2.2.254
  const base = subnet.replace(/\/\d+$/, "");
  const parts = base.split(".").map(Number);
  const ips: string[] = [];
  for (let i = 1; i <= 254; i++) {
    ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`);
  }
  return ips;
}

async function probeEndpoint(
  ip: string,
  target: ProbeTarget,
): Promise<DiscoveredCamera | null> {
  const url = `http://${ip}:${target.port}${target.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/xml, application/json, text/plain" },
    });
    clearTimeout(timer);

    if (resp.ok || resp.status === 401) {
      // 401 means device exists but needs auth — still a valid discovery
      const body = await resp.text().catch(() => "");
      let model: string | undefined;

      // Try to extract model from Hikvision XML
      const modelMatch = body.match(/<model>(.*?)<\/model>/i);
      if (modelMatch) model = modelMatch[1];

      // Try Dahua response
      const dahuaMatch = body.match(/type=(.*)/i);
      if (dahuaMatch) model = dahuaMatch[1].trim();

      return {
        ipAddress: ip,
        port: target.port,
        brand: target.brand,
        model,
        protocol: target.protocol,
      };
    }
    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────
export async function probeSingleCamera(
  ipAddress: string,
  port?: number,
): Promise<DiscoveredCamera | null> {
  const targets = port
    ? PROBE_TARGETS.filter((t) => t.port === port)
    : PROBE_TARGETS;

  for (const target of targets) {
    const result = await probeEndpoint(ipAddress, target);
    if (result) {
      log.info({ ip: ipAddress, brand: result.brand }, "Camera found");
      return result;
    }
  }
  return null;
}

export async function discoverCameras(
  subnet: string = "10.2.2.0/24",
): Promise<DiscoveredCamera[]> {
  const ips = generateSubnetIPs(subnet);
  const discovered: DiscoveredCamera[] = [];

  log.info({ subnet, totalIPs: ips.length }, "Starting camera discovery scan");

  // Process in batches to limit concurrency
  for (let i = 0; i < ips.length; i += BATCH_SIZE) {
    const batch = ips.slice(i, i + BATCH_SIZE);
    const promises = batch.flatMap((ip) =>
      PROBE_TARGETS.map((target) => probeEndpoint(ip, target)),
    );

    const results = await Promise.allSettled(promises);

    // Deduplicate by IP — keep first successful probe per IP
    const seenIPs = new Set(discovered.map((d) => d.ipAddress));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        if (!seenIPs.has(result.value.ipAddress)) {
          seenIPs.add(result.value.ipAddress);
          discovered.push(result.value);
        }
      }
    }
  }

  log.info({ subnet, found: discovered.length }, "Discovery scan complete");
  return discovered;
}
