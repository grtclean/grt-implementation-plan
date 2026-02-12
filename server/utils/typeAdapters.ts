/**
 * Type Adapters for Drizzle ORM
 * 
 * These utilities help convert between JavaScript types and database types
 * when using drizzle-orm with MySQL.
 * 
 * Key conversions:
 * - Date <-> string (for timestamp columns with mode: 'string')
 * - boolean <-> number (for tinyint columns)
 */

/**
 * Convert a Date to ISO string for database storage
 * Returns undefined if input is undefined/null
 */
export function dateToString(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Convert a string to Date for application use
 * Returns undefined if input is undefined/null
 */
export function stringToDate(str: string | null | undefined): Date | null {
  if (str === null || str === undefined) return null;
  return new Date(str);
}

/**
 * Convert boolean to number (0/1) for tinyint columns
 */
export function boolToInt(value: boolean | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  return value ? 1 : 0;
}

/**
 * Convert number (0/1) to boolean for application use
 */
export function intToBool(value: number | boolean | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  return value !== 0;
}

/**
 * Format date for display (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Format date for display (YYYY-MM-DD)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/**
 * Get current timestamp as ISO string
 */
export function nowString(): string {
  return new Date().toISOString();
}

/**
 * Safely access toISOString on a date that might be a string
 */
export function toISOStringSafe(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Safely access getTime on a date that might be a string
 */
export function getTimeSafe(date: Date | string | null | undefined): number | null {
  if (date === null || date === undefined) return null;
  if (typeof date === 'string') return new Date(date).getTime();
  return date.getTime();
}

/**
 * Type guard to check if value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

/**
 * Type guard to check if value is a valid date string
 */
export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}
