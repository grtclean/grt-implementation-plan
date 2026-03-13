/**
 * Retry wrapper with exponential backoff.
 * Handles ECONNRESET / network failures on tRPC mutations.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.message?.includes("ECONNRESET") ||
        err?.message?.includes("fetch failed") ||
        err?.message?.includes("network") ||
        err?.message?.includes("502") ||
        err?.message?.includes("503") ||
        err?.cause?.code === "ECONNRESET";
      if (!isRetryable || attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
