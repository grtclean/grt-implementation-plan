/**
 * 权限检查Hook
 * 用于前端检查用户权限和角色
 */

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * 权限检查Hook
 * @param permissionCode 权限编码
 * @returns 用户是否拥有该权限
 */
export function usePermission(permissionCode: string): boolean {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { data, isLoading: queryLoading } = trpc.permission.checkPermission.useQuery(
    { permissionCode },
    { enabled: !!permissionCode }
  );

  useEffect(() => {
    if (!queryLoading) {
      setHasPermission(data?.hasPermission || false);
      setIsLoading(false);
    }
  }, [data, queryLoading]);

  return hasPermission;
}

/**
 * 获取用户所有权限Hook
 * @returns 用户权限列表
 */
export function useUserPermissions() {
  const { data, isLoading, error } = trpc.permission.getUserPermissions.useQuery();

  return {
    permissions: data?.permissions || [],
    isLoading,
    error,
  };
}

/**
 * 获取用户数据范围Hook
 * @returns 用户数据范围
 */
export function useUserDataScope() {
  const { data, isLoading, error } = trpc.permission.getUserDataScope.useQuery();

  return {
    dataScope: data?.dataScope,
    isLoading,
    error,
  };
}

/**
 * 获取用户认证Hook
 * @returns 用户认证列表
 */
export function useUserCertifications() {
  const { data, isLoading, error } = trpc.permission.getUserCertifications.useQuery();

  return {
    certifications: data?.certifications || [],
    isLoading,
    error,
  };
}

/**
 * 权限检查工具函数
 * 用于条件渲染
 */
export function canAccess(
  permissions: string[],
  requiredPermission: string
): boolean {
  return permissions.includes(requiredPermission);
}

/**
 * 多权限检查工具函数
 * 检查用户是否拥有任何一个权限
 */
export function canAccessAny(
  permissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((p) => permissions.includes(p));
}

/**
 * 多权限检查工具函数
 * 检查用户是否拥有所有权限
 */
export function canAccessAll(
  permissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((p) => permissions.includes(p));
}
