/**
 * Stream Proxy Service — RTSP→HLS转码代理
 *
 * Uses ffmpeg child processes to transcode RTSP camera streams to HLS format.
 * Manages concurrent stream limits, auto-cleanup on inactivity, and graceful shutdown.
 *
 * HLS output: {os.tmpdir()}/grt-camera-hls/{cameraId}/stream.m3u8
 * Max concurrent streams: 10
 * Auto-stop after 5 minutes of no heartbeat
 */

import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { createChildLogger } from "../lib/logger";
import { getCameraAdapter, type CameraRow } from "./camera-adapter.service";

const log = createChildLogger("stream-proxy");

// ─── Constants ───────────────────────────────────────────────

const MAX_CONCURRENT_STREAMS = 10;
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
const HLS_BASE_DIR = path.join(os.tmpdir(), "grt-camera-hls");

// ─── State ───────────────────────────────────────────────────

interface StreamEntry {
  process: ChildProcess;
  hlsDir: string;
  hlsUrl: string;
  startedAt: number;
}

const activeStreams = new Map<number, StreamEntry>();
const lastAccessMap = new Map<number, number>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

// ─── Ensure HLS base directory ───────────────────────────────

function ensureHlsDir(cameraId: number): string {
  const dir = path.join(HLS_BASE_DIR, String(cameraId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ─── Cleanup timer ───────────────────────────────────────────

function startCleanupTimer(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [cameraId, lastAccess] of lastAccessMap.entries()) {
      if (now - lastAccess > INACTIVITY_TIMEOUT_MS) {
        log.info({ cameraId }, "Auto-stopping inactive HLS stream");
        stopHlsStream(cameraId);
      }
    }
    // Stop timer if no active streams
    if (activeStreams.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, CLEANUP_CHECK_INTERVAL_MS);
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Get a snapshot via the brand-specific camera adapter.
 */
export async function getSnapshotProxy(camera: CameraRow): Promise<Buffer> {
  const adapter = getCameraAdapter(camera.brand);
  log.info({ cameraCode: camera.cameraCode, brand: camera.brand }, "Proxy snapshot request");
  return adapter.getSnapshot(camera);
}

/**
 * Start RTSP→HLS transcoding via ffmpeg.
 * Returns the HLS URL path (e.g., /camera-hls/42/stream.m3u8).
 */
export function startHlsStream(camera: CameraRow): string {
  // Already active?
  const existing = activeStreams.get(camera.id);
  if (existing) {
    lastAccessMap.set(camera.id, Date.now());
    return existing.hlsUrl;
  }

  // Check capacity
  if (activeStreams.size >= MAX_CONCURRENT_STREAMS) {
    throw new Error(
      `Maximum concurrent streams reached (${MAX_CONCURRENT_STREAMS}). Stop an existing stream first.`,
    );
  }

  // Resolve RTSP URL
  const adapter = getCameraAdapter(camera.brand);
  const rtspUrl = camera.rtspUrl || adapter.getStreamUrl(camera);
  if (!rtspUrl) {
    throw new Error(`No RTSP URL available for camera ${camera.cameraCode}`);
  }

  // Prepare output directory
  const hlsDir = ensureHlsDir(camera.id);
  const outputPath = path.join(hlsDir, "stream.m3u8");

  // Spawn ffmpeg
  const args = [
    "-rtsp_transport", "tcp",
    "-i", rtspUrl,
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "5",
    "-hls_flags", "delete_segments",
    outputPath,
  ];

  log.info({ cameraId: camera.id, cameraCode: camera.cameraCode, rtspUrl }, "Starting ffmpeg HLS transcode");

  const ffmpegProcess = spawn("ffmpeg", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const hlsUrl = `/camera-hls/${camera.id}/stream.m3u8`;

  // Handle stdout (ffmpeg outputs progress to stderr)
  ffmpegProcess.stdout?.on("data", () => {
    // ffmpeg sends most output to stderr; stdout is typically unused
  });

  ffmpegProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg.includes("Error") || msg.includes("error")) {
      log.error({ cameraId: camera.id, msg }, "ffmpeg error");
    }
  });

  ffmpegProcess.on("error", (err) => {
    log.error({ cameraId: camera.id, err }, "ffmpeg process error");
    activeStreams.delete(camera.id);
    lastAccessMap.delete(camera.id);
  });

  ffmpegProcess.on("exit", (code, signal) => {
    log.info({ cameraId: camera.id, code, signal }, "ffmpeg process exited");
    activeStreams.delete(camera.id);
    lastAccessMap.delete(camera.id);
    // Clean up HLS files
    try {
      if (fs.existsSync(hlsDir)) {
        const files = fs.readdirSync(hlsDir);
        for (const file of files) {
          fs.unlinkSync(path.join(hlsDir, file));
        }
        fs.rmSync(hlsDir, { recursive: true, force: true });
      }
    } catch {
      // Best effort cleanup
    }
  });

  // Register
  activeStreams.set(camera.id, {
    process: ffmpegProcess,
    hlsDir,
    hlsUrl,
    startedAt: Date.now(),
  });
  lastAccessMap.set(camera.id, Date.now());

  // Start inactivity checker
  startCleanupTimer();

  return hlsUrl;
}

/**
 * Stop an active HLS stream by killing the ffmpeg process.
 */
export function stopHlsStream(cameraId: number): void {
  const entry = activeStreams.get(cameraId);
  if (!entry) {
    log.warn({ cameraId }, "No active stream to stop");
    return;
  }

  log.info({ cameraId }, "Stopping HLS stream");
  try {
    entry.process.kill("SIGTERM");
  } catch {
    // Process may have already exited
  }
  activeStreams.delete(cameraId);
  lastAccessMap.delete(cameraId);
}

/**
 * Get the current status of a camera stream.
 */
export function getStreamStatus(cameraId: number): {
  active: boolean;
  hlsUrl?: string;
} {
  const entry = activeStreams.get(cameraId);
  if (entry) {
    // Update last access on status check
    lastAccessMap.set(cameraId, Date.now());
    return { active: true, hlsUrl: entry.hlsUrl };
  }
  return { active: false };
}

/**
 * Kill all active ffmpeg processes (for graceful shutdown).
 */
export function cleanup(): void {
  log.info({ activeCount: activeStreams.size }, "Cleaning up all HLS streams");

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  for (const [cameraId, entry] of activeStreams.entries()) {
    try {
      entry.process.kill("SIGTERM");
    } catch {
      // Best effort
    }
    log.info({ cameraId }, "Killed ffmpeg process");
  }

  activeStreams.clear();
  lastAccessMap.clear();

  // Clean up base HLS directory
  try {
    if (fs.existsSync(HLS_BASE_DIR)) {
      fs.rmSync(HLS_BASE_DIR, { recursive: true, force: true });
    }
  } catch {
    // Best effort
  }
}
