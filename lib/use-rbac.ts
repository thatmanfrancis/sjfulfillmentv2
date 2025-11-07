"use client";

import { useAuth } from '@/lib/auth-context';
import { 
  hasPermission, 
  getDataFilter, 
  canAccessRecord, 
  getAllowedFields,
  canPerformBulkOperation,
  filterResponseData
} from '@/lib/rbac';

/**
 * Hook for Role-Based Access Control
 * Provides easy access to RBAC functions with current user context
 */
export function useRBAC() {
  const { user } = useAuth();

  const checkPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, resource, action);
  };

  const getFilterConditions = (resource: string) => {
    if (!user) return { id: 'no-access' };
    return getDataFilter(user, resource);
  };

  const canAccess = (record: any, resource: string): boolean => {
    if (!user) return false;
    return canAccessRecord(user, record, resource);
  };

  const getAllowedFieldsForAction = (resource: string, action: 'create' | 'update'): string[] => {
    if (!user) return [];
    return getAllowedFields(user.role, resource, action);
  };

  const canDoBulkOperation = (resource: string, operation: string): boolean => {
    if (!user) return false;
    return canPerformBulkOperation(user.role, resource, operation);
  };

  const filterData = (resource: string, data: any[]): any[] => {
    if (!user) return [];
    return filterResponseData(user, resource, data);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'ADMIN';
  };

  const isMerchant = (): boolean => {
    return user?.role === 'MERCHANT';
  };

  const isMerchantStaff = (): boolean => {
    return user?.role === 'MERCHANT_STAFF';
  };

  const isLogisticsPersonnel = (): boolean => {
    return user?.role === 'LOGISTICS_PERSONNEL';
  };

  const isWarehouseManager = (): boolean => {
    return user?.role === 'WAREHOUSE_MANAGER';
  };

  const isMerchantUser = (): boolean => {
    return user?.role === 'MERCHANT' || user?.role === 'MERCHANT_STAFF';
  };

  return {
    user,
    checkPermission,
    getFilterConditions,
    canAccess,
    getAllowedFieldsForAction,
    canDoBulkOperation,
    filterData,
    isAdmin,
    isMerchant,
    isMerchantStaff,
    isLogisticsPersonnel,
    isWarehouseManager,
    isMerchantUser,
  };
}