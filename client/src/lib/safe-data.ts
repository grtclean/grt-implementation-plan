/**
 * Safe Data Access Utilities
 *
 * Prevents "Cannot read property of undefined" errors when accessing
 * tRPC query data. Use these helpers instead of direct .data.field access.
 *
 * Usage:
 *   const items = safeArray(query.data?.items);
 *   const name = safeString(query.data?.user?.name, "未知");
 *   const count = safeNumber(query.data?.total, 0);
 */

/** Safely access an array, returns [] if undefined/null */
export function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/** Safely access a string, returns fallback if undefined/null */
export function safeString(value: string | undefined | null, fallback = ""): string {
  return value ?? fallback;
}

/** Safely access a number, returns fallback if undefined/null/NaN */
export function safeNumber(value: number | undefined | null, fallback = 0): number {
  if (value == null || Number.isNaN(value)) return fallback;
  return value;
}

/** Safely access a boolean, returns fallback if undefined/null */
export function safeBoolean(value: boolean | undefined | null, fallback = false): boolean {
  return value ?? fallback;
}

/** Safely access an object, returns fallback if undefined/null */
export function safeObject<T extends Record<string, unknown>>(
  value: T | undefined | null,
  fallback: T,
): T {
  return value ?? fallback;
}

/** Safely access nested data with a path string */
export function safePath<T = unknown>(
  obj: Record<string, unknown> | undefined | null,
  path: string,
  fallback?: T,
): T {
  if (!obj) return fallback as T;
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return fallback as T;
    current = (current as Record<string, unknown>)[key];
  }
  return (current as T) ?? (fallback as T);
}
