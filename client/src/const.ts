export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Includes returnPath to redirect back to the original page after login.
export const getLoginUrl = (customReturnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://api.manus.im";
  const appId = import.meta.env.VITE_APP_ID;
  
  // 验证必需的环境变量
  if (!appId) {
    console.error(
      "[getLoginUrl] VITE_APP_ID环境变量未配置。\n" +
      "请在.env.local中添加: VITE_APP_ID=your_app_id_here\n" +
      "获取方式：登录 https://grtplan-mkq7dyle.manus.space → Settings → OAuth Applications"
    );
    // 返回一个占位符URL，防止应用崩溃
    return "#/login-error";
  }
  
  if (!oauthPortalUrl) {
    console.error(
      "[getLoginUrl] VITE_OAUTH_PORTAL_URL环境变量未配置。\n" +
      "请在.env.local中添加: VITE_OAUTH_PORTAL_URL=https://api.manus.im"
    );
    return "#/login-error";
  }
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  
  // Use custom return path if provided, otherwise use current location
  const returnPath = customReturnPath || (window.location.pathname + window.location.search);
  
  // Encode both redirectUri and returnPath into state
  const stateData = JSON.stringify({ redirectUri, returnPath });
  const state = btoa(stateData);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (error) {
    console.error(
      "[getLoginUrl] URL构造失败:",
      error,
      "\n检查VITE_OAUTH_PORTAL_URL是否为有效的URL格式"
    );
    return "#/login-error";
  }
};
