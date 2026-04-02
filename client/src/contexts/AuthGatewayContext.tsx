/**
 * GRT Omni-Gateway AuthContext
 *
 * Extends existing useAuth with:
 * - Tenant context (multi-tenant isolation)
 * - Role-based routing decisions
 * - Gateway state management
 *
 * Roles: Admin, Sales, VIP_Client, C_Level, Engineer, Finance, HR, Guest
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Gateway role types
export type GatewayRole =
  | 'admin'        // System administrator
  | 'c_level'      // CEO/CTO/CFO — executive vision
  | 'sales'        // Sales director/rep — CRM + quotation
  | 'vip_client'   // VIP customer — portal access
  | 'engineer'     // Mechanical/Electrical/Procurement
  | 'finance'      // Finance team
  | 'hr'           // Human resources
  | 'production'   // Shop floor / assembly
  | 'guest';       // Public / conference visitor

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantType: 'grt_internal' | 'customer_portal' | 'supplier_portal' | 'conference';
  buCode?: string;
  theme?: 'dark' | 'light';
  features: string[];
}

export interface GatewayUser {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  role: GatewayRole;
  systemRole: string; // original 24-role from UserProfileContext
  department: string;
  position: string;
  buCode?: string;
  avatarUrl?: string;
  employeeCode?: string; // GRT001-GRT105
}

export interface GatewayState {
  user: GatewayUser | null;
  tenant: TenantInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  getTargetRoute: () => string;
}

// Map system roles to gateway roles
function mapToGatewayRole(systemRole: string): GatewayRole {
  const mapping: Record<string, GatewayRole> = {
    admin: 'admin',
    ceo: 'c_level', cto: 'c_level', cfo: 'c_level',
    director: 'c_level', bu_gm: 'c_level', hr_director: 'hr',
    vp: 'c_level',
    sales_director: 'sales', sales_rep: 'sales', bu_sales: 'sales',
    finance_manager: 'finance', finance_specialist: 'finance',
    hr_manager: 'hr', hr_specialist: 'hr',
    project_manager: 'engineer', bu_pm: 'engineer',
    engineer: 'engineer', bu_mech: 'engineer', bu_elec: 'engineer',
    qc_manager: 'engineer', quality_eng: 'engineer',
    production_supervisor: 'production', floor_operator: 'production',
    cs_engineer: 'engineer',
    dept_manager: 'engineer', team_lead: 'engineer',
    customer: 'vip_client',
    guest: 'guest',
    employee: 'engineer',
  };
  return mapping[systemRole] || 'guest';
}

// Determine target route based on role
function resolveTargetRoute(role: GatewayRole, tenantType: string): string {
  if (tenantType === 'customer_portal') return '/customer-portal/vip-dashboard';
  if (tenantType === 'conference') return '/guest/showcase';
  if (tenantType === 'supplier_portal') return '/supplier-portal';

  const routeMap: Record<GatewayRole, string> = {
    admin: '/admin/operations',
    c_level: '/ceo-finance',
    sales: '/crm',
    vip_client: '/customer-portal/vip-dashboard',
    engineer: '/me',
    finance: '/finance',
    hr: '/hrm',
    production: '/kiosk',
    guest: '/public',
  };
  return routeMap[role] || '/me';
}

// Default tenant for internal users
const DEFAULT_TENANT: TenantInfo = {
  tenantId: 'grt-main',
  tenantName: 'GRT 杰瑞德自动化',
  tenantType: 'grt_internal',
  theme: 'dark',
  features: ['full'],
};

const GatewayContext = createContext<GatewayState | null>(null);

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GatewayUser | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const gatewayRole = mapToGatewayRole(data.user.role || 'guest');
          setUser({
            id: data.user.id,
            username: data.user.username || data.user.name,
            displayName: data.user.name || data.user.username,
            email: data.user.email,
            role: gatewayRole,
            systemRole: data.user.role || 'guest',
            department: data.user.department || '',
            position: data.user.position || '',
            buCode: data.user.buCode,
            employeeCode: data.user.employeeCode,
          });
          setTenant(DEFAULT_TENANT);
        }
      }
    } catch {
      // Not authenticated
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.user) {
        const gatewayRole = mapToGatewayRole(data.user.role || 'guest');
        setUser({
          id: data.user.id,
          username: data.user.username || username,
          displayName: data.user.name || username,
          email: data.user.email,
          role: gatewayRole,
          systemRole: data.user.role || 'guest',
          department: data.user.department || '',
          position: data.user.position || '',
          buCode: data.user.buCode,
          employeeCode: data.user.employeeCode,
        });
        if (data.token) localStorage.setItem('app_session_id', data.token);
        setTenant(DEFAULT_TENANT);
        return true;
      }
      setError(data.error || '登录失败');
      return false;
    } catch (err: any) {
      setError(err.message || '网络错误');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('app_session_id');
    setUser(null);
    setTenant(null);
  }, []);

  const switchTenant = useCallback((tenantId: string) => {
    // In production: fetch tenant config from API
    const tenantMap: Record<string, TenantInfo> = {
      'grt-main': DEFAULT_TENANT,
      'customer-portal': { tenantId: 'customer-portal', tenantName: '客户门户', tenantType: 'customer_portal', theme: 'light', features: ['project_view', 'document_download'] },
      'conference': { tenantId: 'conference', tenantName: '会议访客', tenantType: 'conference', theme: 'dark', features: ['showcase_only'] },
    };
    setTenant(tenantMap[tenantId] || DEFAULT_TENANT);
  }, []);

  const getTargetRoute = useCallback((): string => {
    if (!user || !tenant) return '/login';
    return resolveTargetRoute(user.role, tenant.tenantType);
  }, [user, tenant]);

  return (
    <GatewayContext.Provider value={{
      user, tenant, isAuthenticated: !!user, isLoading, error,
      login, logout, switchTenant, getTargetRoute,
    }}>
      {children}
    </GatewayContext.Provider>
  );
}

export function useGateway(): GatewayState {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error('useGateway must be used within GatewayProvider');
  return ctx;
}

export { resolveTargetRoute, mapToGatewayRole };
