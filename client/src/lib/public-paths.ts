/**
 * 公开页面路径判断 — 单一数据源
 *
 * 所有客户/展示/公开页面的路径检查统一使用此函数。
 * 用于跳过认证检查、tRPC 偏好查询、重定向守卫等。
 */

const PUBLIC_EXACT = new Set([
  "/login",
  "/login-success",
  "/customer/auth",
  "/customer/forum",
  "/customer-workspace",
  "/customer/portal",
  "/gateway",
  "/talent-portal",
  "/online-interview",
  "/join",
  "/careers",
  "/403",
  "/404",
]);

const PUBLIC_PREFIXES = [
  "/showcase/",
  "/showroom",
  "/client-portal/",
  "/guest/",
  "/conference/",
  "/supplier-portal/",
  "/kiosk",
  "/expo-kiosk",
  "/keynote",
  "/project-nexus",
  "/exec-vision",
  "/sync-matrix",
];

/**
 * Returns true if the given pathname is a public page that does NOT require authentication.
 * Call with `window.location.pathname` or omit for current page.
 */
export function isPublicPath(pathname?: string): boolean {
  const p = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (PUBLIC_EXACT.has(p)) return true;
  return PUBLIC_PREFIXES.some(prefix => p.startsWith(prefix));
}
