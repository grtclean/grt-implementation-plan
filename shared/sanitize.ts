/**
 * Shared name/text sanitization utilities.
 * Fixes garbled characters (U+FFFD) caused by GBK/CP936→UTF-8 encoding mismatch
 * on Chinese Windows PostgreSQL connections.
 */

/**
 * Sanitize a user display name:
 * 1. Decode URL-encoded strings (%XX sequences)
 * 2. Strip Unicode replacement characters (U+FFFD / \uFFFD)
 * 3. Trim whitespace
 */
export function sanitizeName(raw: string | null | undefined): string {
  if (!raw) return '';
  let name = raw;
  // Decode URL-encoded names (e.g. %E7%8E%8B%E6%98%8E → 王明)
  if (/%[0-9A-Fa-f]{2}/.test(name)) {
    try { name = decodeURIComponent(name); } catch { /* keep original */ }
  }
  // Strip replacement characters from encoding mismatch
  name = name.replace(/\uFFFD/g, '');
  return name.trim();
}

/**
 * Check if a string contains garbled replacement characters.
 */
export function hasGarbledChars(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\uFFFD/.test(text);
}
