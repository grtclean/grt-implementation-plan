import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Known DDNS domains that always serve over HTTPS via their proxy */
const HTTPS_DDNS_DOMAINS = [".vicp.fun", ".oicp.net", ".xicp.net", ".nat300.top"];

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some(proto => proto.trim().toLowerCase() === "https")) return true;
  }

  // 花生壳/Oray DDNS proxies terminate HTTPS but don't always forward
  // x-forwarded-proto. Detect by hostname so cookie gets Secure flag.
  const host = (req.hostname || req.headers.host || "").toLowerCase().split(":")[0];
  if (HTTPS_DDNS_DOMAINS.some(d => host.endsWith(d))) return true;

  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "partitioned"> {
  const isSecure = isSecureRequest(req);

  // Detect cross-origin iframe context (Manus preview mode):
  // Sec-Fetch-Dest: iframe indicates we're inside an iframe.
  // Only in that case use SameSite=None + Partitioned for third-party cookie support.
  const fetchDest = req.headers["sec-fetch-dest"];
  const isIframe = fetchDest === "iframe" || fetchDest === "embed";

  if (isSecure && isIframe) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    };
  }

  // Normal first-party access (including HTTPS via DDNS/proxy):
  // SameSite=Lax is the correct default for first-party cookies
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  };
}
