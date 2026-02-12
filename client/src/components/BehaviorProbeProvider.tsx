/**
 * 行为探针Provider组件
 * 在应用根组件中初始化行为探针，并在用户登录后自动设置用户信息
 */
import { useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { behaviorProbe } from '@/lib/behaviorProbe';

interface BehaviorProbeProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function BehaviorProbeProvider({ children, enabled = true }: BehaviorProbeProviderProps) {
  const { user, isAuthenticated } = useAuth();

  // 初始化行为探针
  useEffect(() => {
    behaviorProbe.init({ enabled });
  }, [enabled]);

  // 用户登录后设置用户信息
  useEffect(() => {
    if (isAuthenticated && user) {
      behaviorProbe.setUser(user.id, user.openId);
    }
  }, [isAuthenticated, user]);

  return <>{children}</>;
}

export default BehaviorProbeProvider;
