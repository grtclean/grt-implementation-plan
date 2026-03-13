/**
 * Binary chunked file upload client
 * Uses the existing PUT /api/upload/chunk/:sessionId/:chunkIndex endpoint
 */

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

export interface ChunkedUploadOptions {
  file: File;
  sessionId: string;
  totalChunks: number;
  completedIndices?: number[];
  onProgress?: (percent: number) => void;
}

export interface ChunkedUploadResult {
  completedChunks: number;
  totalChunks: number;
}

async function uploadSingleChunk(
  sessionId: string,
  chunkIndex: number,
  blob: Blob,
): Promise<{ received: boolean; checksum: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`/api/upload/chunk/${sessionId}/${chunkIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: blob,
      });
      if (!res.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed with status ${res.status}`);
      }
      return await res.json() as { received: boolean; checksum: string };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }
  throw lastError ?? new Error(`Chunk ${chunkIndex} failed after ${MAX_RETRIES} retries`);
}

export async function uploadChunked(opts: ChunkedUploadOptions): Promise<ChunkedUploadResult> {
  const { file, sessionId, totalChunks, completedIndices = [], onProgress } = opts;
  const completed = new Set(completedIndices);
  let doneCount = completed.size;

  for (let i = 0; i < totalChunks; i++) {
    if (completed.has(i)) continue;

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);

    await uploadSingleChunk(sessionId, i, blob);
    doneCount++;
    onProgress?.(Math.round((doneCount / totalChunks) * 100));
  }

  return { completedChunks: doneCount, totalChunks };
}
