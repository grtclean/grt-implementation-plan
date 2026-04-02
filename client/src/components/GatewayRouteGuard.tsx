/**
 * GRT Omni-Gateway Route Guard
 *
 * After login, intercepts the initial navigation and redirects to role-specific workspace:
 * - Admin → /admin/operations
 * - C_Level (CEO/CTO/CFO) → /ceo-finance (executive cockpit)
 * - Sales → /crm
 * - VIP_Client → /customer-portal/vip-dashboard
 * - Engineer → /me (personal portal)
 * - Finance → /finance (finance workbench)
 * - HR → /hrm
 * - Production → /kiosk (shop floor)
 * - Guest → /public
 */

import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGateway, type GatewayRole } from '../contexts/AuthGatewayContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', '/gateway', '/public', '/guest/', '/showcase/',
  '/customer-portal', '/403', '/404',
];

// Role-based route access control
const ROUTE_ACCESS: Record<string, GatewayRole[]> = {
  '/admin': ['admin'],
  '/ceo-finance': ['admin', 'c_level'],
  '/cto-dashboard': ['admin', 'c_level'],
  '/ceo-dashboard': ['admin', 'c_level'],
  '/finance': ['admin', 'c_level', 'finance'],
  '/hrm': ['admin', 'c_level', 'hr'],
  '/payroll': ['admin', 'c_level', 'hr', 'finance'],
  '/crm': ['admin', 'c_level', 'sales'],
  '/customer-portal': ['admin', 'vip_client'],
  '/kiosk': ['admin', 'c_level', 'production', 'engineer'],
  '/me': ['admin', 'c_level', 'sales', 'engineer', 'finance', 'hr', 'production'],
};

export function GatewayRouteGuard({ children }: RouteGuardProps) {
  const { user, isAuthenticated, isLoading, getTargetRoute } = useGateway();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Allow public routes
    if (PUBLIC_ROUTES.some(r => location.startsWith(r))) return;

    // Redirect to gateway if not authenticated
    if (!isAuthenticated) {
      navigate('/gateway', { replace: true });
      return;
    }

    // Check route access
    if (user) {
      const matchedRoute = Object.keys(ROUTE_ACCESS).find(r => location.startsWith(r));
      if (matchedRoute) {
        const allowedRoles = ROUTE_ACCESS[matchedRoute];
        if (!allowedRoles.includes(user.role)) {
          // Redirect to user's default workspace
          navigate(getTargetRoute(), { replace: true });
          return;
        }
      }
    }

    // If at root (/), redirect to role-specific workspace
    if (location === '/' && isAuthenticated) {
      navigate(getTargetRoute(), { replace: true });
    }
  }, [location, isAuthenticated, isLoading, user, navigate, getTargetRoute]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-cyan-400 mt-4 text-sm font-mono tracking-widest">GRT SYSTEM INITIALIZING...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export { ROUTE_ACCESS, PUBLIC_ROUTES };
