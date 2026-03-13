/**
 * Chunked File Upload Service
 *
 * Handles large file uploads (500MB+ CAD files) via chunked transfer:
 *   1. Client initiates upload → gets sessionId + totalChunks
 *   2. Client sends chunks (5MB default) as raw buffers
 *   3. Each chunk is SHA256-hashed and stored to disk
 *   4. On complete, chunks are concatenated into final file
 *   5. Cancel cleans up partial uploads
 *
 * DB tables: file_upload_sessions, file_upload_chunks
 * Disk layout: data/uploads/{sessionId}/{chunkIndex} → data/uploads/{sessionId}/{fileName}
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import {
  fileUploadSessions,
  fileUploadChunks,
} from "../../drizzle/file-upload-schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const log = createChildLogger("chunked-upload");
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Helpers ──────────────────────────────────────────────────────────────

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (err: unknown) {
    // EEXIST is fine — directory already exists
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }
}

function generateSessionId(): string {
  return crypto.randomBytes(24).toString("hex"); // 48-char hex string
}

function sessionDir(sessionId: string): string {
  return path.join(UPLOAD_DIR, sessionId);
}

function chunkPath(sessionId: string, chunkIndex: number): string {
  return path.join(sessionDir(sessionId), String(chunkIndex));
}

// ── initiateUpload ───────────────────────────────────────────────────────

export async function initiateUpload(params: {
  fileName: string;
  fileSizeBytes: number;
  chunkSizeBytes?: number;
  mimeType?: string;
  uploadedBy: string;
  targetPath?: string;
  projectId?: number;
  sharepointSiteCode?: string;
}): Promise<{ sessionId: string; totalChunks: number }> {
  const db = await requireDb();
  const chunkSize = params.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.ceil(params.fileSizeBytes / chunkSize);
  const sessionId = generateSessionId();

  // Ensure the upload directory tree exists
  await ensureDir(sessionDir(sessionId));

  log.info(
    {
      sessionId,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      chunkSize,
      totalChunks,
      uploadedBy: params.uploadedBy,
    },
    "Upload session initiated"
  );

  await db.insert(fileUploadSessions).values({
    sessionId,
    fileName: params.fileName,
    fileSizeBytes: params.fileSizeBytes,
    chunkSizeBytes: chunkSize,
    totalChunks,
    completedChunks: 0,
    status: "uploading",
    mimeType: params.mimeType ?? "application/octet-stream",
    uploadedBy: params.uploadedBy,
    targetPath: params.targetPath ?? "",
    projectId: params.projectId ?? null,
    sharepointSiteCode: params.sharepointSiteCode ?? null,
  });

  return { sessionId, totalChunks };
}

// ── receiveChunk ─────────────────────────────────────────────────────────

export async function receiveChunk(
  sessionId: string,
  chunkIndex: number,
  data: Buffer
): Promise<{ received: boolean; checksum: string }> {
  const db = await requireDb();

  // Validate session exists and is still uploading
  const sessions = await db
    .select()
    .from(fileUploadSessions)
    .where(eq(fileUploadSessions.sessionId, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    log.warn({ sessionId }, "Chunk received for unknown session");
    throw new Error(`Upload session not found: ${sessionId}`);
  }

  const session = sessions[0];

  if (session.status !== "uploading") {
    log.warn(
      { sessionId, status: session.status },
      "Chunk received for non-active session"
    );
    throw new Error(
      `Upload session ${sessionId} is not active (status: ${session.status})`
    );
  }

  if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
    throw new Error(
      `Invalid chunk index ${chunkIndex} — must be 0..${session.totalChunks - 1}`
    );
  }

  // Check for duplicate chunk
  const existing = await db
    .select()
    .from(fileUploadChunks)
    .where(
      and(
        eq(fileUploadChunks.sessionId, sessionId),
        eq(fileUploadChunks.chunkIndex, chunkIndex)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    log.info(
      { sessionId, chunkIndex },
      "Duplicate chunk received — returning existing checksum"
    );
    return { received: true, checksum: existing[0].checksum };
  }

  // Compute SHA-256 checksum
  const checksum = crypto.createHash("sha256").update(data).digest("hex");

  // Write chunk to disk
  const filePath = chunkPath(sessionId, chunkIndex);
  await ensureDir(sessionDir(sessionId));
  await fs.promises.writeFile(filePath, data);

  // Record in DB
  await db.insert(fileUploadChunks).values({
    sessionId,
    chunkIndex,
    chunkSizeBytes: data.length,
    checksum,
    storagePath: filePath,
  });

  // Increment completed chunks count
  await db
    .update(fileUploadSessions)
    .set({ completedChunks: session.completedChunks + 1 })
    .where(eq(fileUploadSessions.sessionId, sessionId));

  log.debug(
    {
      sessionId,
      chunkIndex,
      chunkSize: data.length,
      checksum,
      progress: `${session.completedChunks + 1}/${session.totalChunks}`,
    },
    "Chunk received and stored"
  );

  return { received: true, checksum };
}

// ── completeUpload ───────────────────────────────────────────────────────

export async function completeUpload(
  sessionId: string
): Promise<{ filePath: string; totalBytes: number }> {
  const db = await requireDb();

  const sessions = await db
    .select()
    .from(fileUploadSessions)
    .where(eq(fileUploadSessions.sessionId, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    throw new Error(`Upload session not found: ${sessionId}`);
  }

  const session = sessions[0];

  if (session.status !== "uploading") {
    throw new Error(
      `Cannot complete session in status "${session.status}"`
    );
  }

  // Mark as assembling
  await db
    .update(fileUploadSessions)
    .set({ status: "assembling" })
    .where(eq(fileUploadSessions.sessionId, sessionId));

  // Verify all chunks are present
  const chunks = await db
    .select()
    .from(fileUploadChunks)
    .where(eq(fileUploadChunks.sessionId, sessionId))
    .limit(10000);

  if (chunks.length !== session.totalChunks) {
    const msg = `Missing chunks: got ${chunks.length}, expected ${session.totalChunks}`;
    log.error({ sessionId, got: chunks.length, expected: session.totalChunks }, msg);
    await db
      .update(fileUploadSessions)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(fileUploadSessions.sessionId, sessionId));
    throw new Error(msg);
  }

  // Sort chunks by index and concatenate
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const finalPath = path.join(sessionDir(sessionId), session.fileName);
  const writeStream = fs.createWriteStream(finalPath);

  let totalBytes = 0;
  for (const chunk of sortedChunks) {
    const chunkData = await fs.promises.readFile(chunk.storagePath);
    writeStream.write(chunkData);
    totalBytes += chunkData.length;
  }

  // Wait for the write stream to finish
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    writeStream.end();
  });

  // Verify assembled file size
  if (totalBytes !== session.fileSizeBytes) {
    const msg = `Size mismatch: assembled ${totalBytes} bytes, expected ${session.fileSizeBytes}`;
    log.error({ sessionId, totalBytes, expected: session.fileSizeBytes }, msg);
    await db
      .update(fileUploadSessions)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(fileUploadSessions.sessionId, sessionId));
    throw new Error(msg);
  }

  // Clean up individual chunk files (keep final assembled file)
  for (const chunk of sortedChunks) {
    try {
      await fs.promises.unlink(chunk.storagePath);
    } catch {
      // Non-fatal — chunk file may already be removed
    }
  }

  // Mark session as completed
  await db
    .update(fileUploadSessions)
    .set({
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(fileUploadSessions.sessionId, sessionId));

  log.info(
    { sessionId, filePath: finalPath, totalBytes, fileName: session.fileName },
    "Upload completed — file assembled"
  );

  return { filePath: finalPath, totalBytes };
}

// ── getUploadStatus ──────────────────────────────────────────────────────

export async function getUploadStatus(sessionId: string): Promise<{
  sessionId: string;
  fileName: string;
  status: string;
  totalChunks: number;
  completedChunks: number;
  fileSizeBytes: number;
  progressPercent: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
} | null> {
  const db = await requireDb();

  const sessions = await db
    .select()
    .from(fileUploadSessions)
    .where(eq(fileUploadSessions.sessionId, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    return null;
  }

  const s = sessions[0];
  const progressPercent =
    s.totalChunks > 0
      ? Math.round((s.completedChunks / s.totalChunks) * 100)
      : 0;

  return {
    sessionId: s.sessionId,
    fileName: s.fileName,
    status: s.status,
    totalChunks: s.totalChunks,
    completedChunks: s.completedChunks,
    fileSizeBytes: s.fileSizeBytes,
    progressPercent,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
    errorMessage: s.errorMessage,
  };
}

// ── cancelUpload ─────────────────────────────────────────────────────────

export async function cancelUpload(sessionId: string): Promise<void> {
  const db = await requireDb();

  const sessions = await db
    .select()
    .from(fileUploadSessions)
    .where(eq(fileUploadSessions.sessionId, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    log.warn({ sessionId }, "Cancel requested for unknown session");
    throw new Error(`Upload session not found: ${sessionId}`);
  }

  const session = sessions[0];

  if (session.status === "completed") {
    log.warn({ sessionId }, "Cannot cancel completed upload");
    throw new Error("Cannot cancel a completed upload");
  }

  // Update status to cancelled
  await db
    .update(fileUploadSessions)
    .set({ status: "cancelled" })
    .where(eq(fileUploadSessions.sessionId, sessionId));

  // Clean up all chunk files and the session directory
  const dir = sessionDir(sessionId);
  try {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      await fs.promises.unlink(path.join(dir, file));
    }
    await fs.promises.rmdir(dir);
    log.info(
      { sessionId, filesRemoved: files.length },
      "Upload cancelled — chunk files removed"
    );
  } catch (err: unknown) {
    // Directory may not exist if no chunks were ever uploaded
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      log.warn({ sessionId, err }, "Error cleaning up chunk directory");
    }
  }
}
