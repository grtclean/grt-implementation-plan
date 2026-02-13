/**
 * Employee AI Assistant Service
 * Code generation and session management for employee AI assistants
 */

type AssistantType =
  | "general"
  | "sales"
  | "tech"
  | "pm"
  | "hr"
  | "finance"
  | "production"
  | "engineering";

const TYPE_PREFIX_MAP: Record<AssistantType, string> = {
  general: "GEN",
  sales: "SAL",
  tech: "TEC",
  pm: "PM",
  hr: "HR",
  finance: "FIN",
  production: "PRO",
  engineering: "ENG",
};

/**
 * Generate a unique assistant code based on employee ID and assistant type
 * Format: AST-{TYPE_PREFIX}-{employeeId}-{RANDOM}
 */
export function generateAssistantCode(
  employeeId: number,
  assistantType: AssistantType
): string {
  const prefix = TYPE_PREFIX_MAP[assistantType] || "GEN";
  const randomPart = generateRandomAlphaNumeric(6);
  return `AST-${prefix}-${employeeId}-${randomPart}`;
}

/**
 * Generate a unique session ID
 * Format: sess-{timestamp_hex}-{random_hex}
 */
export function generateSessionId(): string {
  const timestampPart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `sess-${timestampPart}-${randomPart}`;
}

function generateRandomAlphaNumeric(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
