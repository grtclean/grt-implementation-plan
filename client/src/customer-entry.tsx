/**
 * Customer Portal — Ultra-light entry with inline SPA routing
 *
 * ZERO tRPC, ZERO QueryClient, ZERO providers.
 * Just React + page components. Navigation via global function.
 */
import React, { Suspense, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const CustomerAuth = React.lazy(() => import("./pages/CustomerAuth"));
const CustomerWorkspace = React.lazy(() => import("./pages/CustomerWorkspace"));
const CustomerProjectPortal = React.lazy(() => import("./pages/CustomerProjectPortal"));
const CustomerForum = React.lazy(() => import("./pages/CustomerForum"));

const ROUTES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "/customer/auth": CustomerAuth,
  "/customer-workspace": CustomerWorkspace,
  "/customer/portal": CustomerProjectPortal,
  "/customer/forum": CustomerForum,
};

function Fallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#faf9f8", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/GRTlogo.gif" alt="GRT" width="48" height="48" style={{ marginBottom: 12 }} />
        <div style={{ width: 28, height: 28, border: "2px solid transparent", borderTopColor: "#0078d4", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
      </div>
    </div>
  );
}

// ── Global navigate function — called from CustomerAuth ──
let _setRoute: ((path: string) => void) | null = null;
(window as any).grtCustomerNavigate = (path: string) => {
  if (_setRoute) {
    window.history.pushState(null, "", path);
    _setRoute(path);
  } else {
    window.location.href = path;
  }
};

function CustomerApp() {
  const [route, setRoute] = useState(() => window.location.pathname.replace(/\/$/, "") || "/");

  useEffect(() => {
    _setRoute = setRoute;
    const onPop = () => setRoute(window.location.pathname.replace(/\/$/, "") || "/");
    window.addEventListener("popstate", onPop);
    return () => { _setRoute = null; window.removeEventListener("popstate", onPop); };
  }, []);

  const Page = ROUTES[route];
  if (!Page) { window.location.href = "/"; return null; }

  return (
    <Suspense fallback={<Fallback />}>
      <Page />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(<CustomerApp />);

// Dismiss loading overlay
const el = document.getElementById("app-loader");
if (el) el.remove();
document.documentElement.classList.remove("no-transitions");
