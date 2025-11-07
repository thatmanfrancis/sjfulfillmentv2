/**
 * Role-Based Access Control (RBAC) Utilities
 * Handles permissions and data filtering based on user roles
 */

export type UserRole = 'ADMIN' | 'MERCHANT' | 'MERCHANT_STAFF' | 'LOGISTICS_PERSONNEL' | 'WAREHOUSE_MANAGER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  merchantId?: string;
  warehouseId?: string;
}

// Define what each role can access
export const RolePermissions = {
  ADMIN: {
    orders: ['create', 'read', 'update', 'delete', 'approve'],
    products: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    merchants: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete'],
    payments: ['create', 'read', 'update', 'delete'],
    shipments: ['create', 'read', 'update', 'delete'],
    warehouse: ['create', 'read', 'update', 'delete'],
    deliveries: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
    settings: ['read', 'update'],
    admin: ['read', 'update'],
    audit: ['read'],
    all_data: true, // Can access all data across tenants
  },
  MERCHANT: {
    orders: ['create', 'read', 'update'],
    products: ['read', 'update'], // Merchants can only view and edit, not create products
    customers: ['create', 'read', 'update'],
    invoices: ['create', 'read', 'update'],
    payments: ['read'],
    shipments: ['read', 'update'],
    returns: ['create', 'read', 'update'],
    reports: ['read'],
    settings: ['read', 'update'],
    inventory: ['read'], // Can view where their products are located
    merchant_data_only: true, // Can only access own merchant data
  },
  MERCHANT_STAFF: {
    orders: ['create', 'read', 'update'],
    products: ['read', 'update'],
    customers: ['create', 'read', 'update'],
    invoices: ['read'],
    returns: ['create', 'read', 'update'],
    call_logs: ['create', 'read'],
    merchant_data_only: true, // Can only access own merchant data
  },
  LOGISTICS_PERSONNEL: {
    deliveries: ['read', 'update'],
    shipments: ['read', 'update'],
    orders: ['read', 'update'],
    customers: ['read'],
    call_logs: ['create', 'read'],
    assigned_deliveries_only: true, // Can only see assigned deliveries
  },
  WAREHOUSE_MANAGER: {
    warehouse: ['create', 'read', 'update', 'delete'],
    orders: ['read', 'update'],
    products: ['read', 'update'],
    shipments: ['create', 'read', 'update'],
    returns: ['read', 'update'],
    reports: ['read'],
    warehouse_data_only: true, // Can only access assigned warehouse data
  },
};

/**
 * Check if user has permission for a specific action on a resource
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = RolePermissions[userRole];
  if (!permissions) return false;
  
  const resourcePermissions = permissions[resource as keyof typeof permissions];
  if (Array.isArray(resourcePermissions)) {
    return resourcePermissions.includes(action);
  }
  
  return false;
}

/**
 * Get data filter conditions based on user role and context
 */
export function getDataFilter(user: User, resource: string): Record<string, any> {
  const role = user.role;
  
  switch (role) {
    case 'ADMIN':
      // Admin can see all data
      return {};
      
    case 'MERCHANT':
    case 'MERCHANT_STAFF':
      // Merchants and their staff can only see their own data
      if (!user.merchantId) {
        throw new Error('Merchant ID is required for merchant users');
      }
      
      switch (resource) {
        case 'orders':
          return { merchantId: user.merchantId };
        case 'products':
          return { merchantId: user.merchantId };
        case 'customers':
          return { merchantId: user.merchantId };
        case 'invoices':
          return { merchantId: user.merchantId };
        case 'returns':
          return { merchantId: user.merchantId };
        case 'shipments':
          return { 
            OR: [
              { order: { merchantId: user.merchantId } },
              { merchantId: user.merchantId }
            ]
          };
        default:
          return { merchantId: user.merchantId };
      }
      
    case 'LOGISTICS_PERSONNEL':
      // Logistics personnel see assigned deliveries and related data
      switch (resource) {
        case 'deliveries':
          return { assignedTo: user.id };
        case 'shipments':
          return {
            deliveryAttempts: {
              some: { assignedTo: user.id }
            }
          };
        case 'orders':
          return {
            shipments: {
              some: {
                deliveryAttempts: {
                  some: { assignedTo: user.id }
                }
              }
            }
          };
        default:
          return {};
      }
      
    case 'WAREHOUSE_MANAGER':
      // Warehouse managers see their warehouse data
      if (!user.warehouseId) {
        throw new Error('Warehouse ID is required for warehouse manager users');
      }
      
      switch (resource) {
        case 'warehouse':
        case 'inventory':
          return { warehouseId: user.warehouseId };
        case 'products':
          return {
            inventory: {
              some: { warehouseId: user.warehouseId }
            }
          };
        case 'orders':
          return {
            items: {
              some: {
                product: {
                  inventory: {
                    some: { warehouseId: user.warehouseId }
                  }
                }
              }
            }
          };
        case 'shipments':
          return { warehouseId: user.warehouseId };
        default:
          return { warehouseId: user.warehouseId };
      }
      
    default:
      // Fallback: no access
      return { id: 'no-access' };
  }
}

/**
 * Filter API response data based on user permissions
 */
export function filterResponseData(
  user: User,
  resource: string,
  data: any[]
): any[] {
  const role = user.role;
  
  // Admin can see everything
  if (role === 'ADMIN') {
    return data;
  }
  
  // Apply role-specific filtering
  return data.filter(item => {
    switch (role) {
      case 'MERCHANT':
      case 'MERCHANT_STAFF':
        return item.merchantId === user.merchantId;
        
      case 'LOGISTICS_PERSONNEL':
        if (resource === 'deliveries') {
          return item.assignedTo === user.id;
        }
        if (resource === 'shipments') {
          return item.deliveryAttempts?.some((attempt: any) => attempt.assignedTo === user.id);
        }
        return true;
        
      case 'WAREHOUSE_MANAGER':
        return item.warehouseId === user.warehouseId;
        
      default:
        return false;
    }
  });
}

/**
 * Check if user can access a specific record
 */
export function canAccessRecord(
  user: User,
  record: any,
  resource: string
): boolean {
  const role = user.role;
  
  // Admin can access everything
  if (role === 'ADMIN') {
    return true;
  }
  
  switch (role) {
    case 'MERCHANT':
    case 'MERCHANT_STAFF':
      return record.merchantId === user.merchantId;
      
    case 'LOGISTICS_PERSONNEL':
      if (resource === 'deliveries') {
        return record.assignedTo === user.id;
      }
      return true; // Can view related data
      
    case 'WAREHOUSE_MANAGER':
      return record.warehouseId === user.warehouseId;
      
    default:
      return false;
  }
}

/**
 * Get allowed fields for a user role when creating/updating records
 */
export function getAllowedFields(
  userRole: UserRole,
  resource: string,
  action: 'create' | 'update'
): string[] {
  const baseFields: Record<string, string[]> = {
    orders: ['id', 'customerName', 'items', 'status', 'totalAmount', 'shippingAddress'],
    products: ['id', 'name', 'description', 'price', 'category', 'sku', 'inventory'],
    customers: ['id', 'name', 'email', 'phone', 'address'],
    shipments: ['id', 'orderId', 'trackingNumber', 'status', 'carrierName'],
    deliveries: ['id', 'shipmentId', 'status', 'attemptDate', 'notes'],
  };
  
  const restrictedFields: Record<UserRole, Record<string, string[]>> = {
    ADMIN: {},
    MERCHANT: {
      orders: ['merchantId', 'internalNotes'],
      products: ['merchantId'],
    },
    MERCHANT_STAFF: {
      orders: ['merchantId', 'internalNotes', 'totalAmount'],
      products: ['merchantId', 'price'],
    },
    LOGISTICS_PERSONNEL: {
      deliveries: ['assignedTo'],
      shipments: ['warehouseId'],
    },
    WAREHOUSE_MANAGER: {
      products: ['price'],
      shipments: ['warehouseId'],
    },
  };
  
  const allowedFields = baseFields[resource] || [];
  const restricted = restrictedFields[userRole]?.[resource] || [];
  
  return allowedFields.filter(field => !restricted.includes(field));
}

/**
 * Validate if user can perform bulk operations
 */
export function canPerformBulkOperation(
  userRole: UserRole,
  resource: string,
  operation: string
): boolean {
  // Only admin and certain roles can perform bulk operations
  const allowedRoles: Record<string, UserRole[]> = {
    orders: ['ADMIN', 'MERCHANT'],
    deliveries: ['ADMIN', 'LOGISTICS_PERSONNEL'],
    products: ['ADMIN', 'MERCHANT'],
    shipments: ['ADMIN', 'WAREHOUSE_MANAGER'],
  };
  
  const allowed = allowedRoles[resource] || ['ADMIN'];
  return allowed.includes(userRole);
}

/**
 * Get navigation items based on user role and permissions
 */
export function getAccessibleRoutes(userRole: UserRole): string[] {
  const routePermissions: Record<UserRole, string[]> = {
    ADMIN: [
      '/dashboard',
      '/orders',
      '/products',
      '/customers',
      '/merchants',
      '/invoices',
      '/payments',
      '/returns',
      '/shipments',
      '/warehouse',
      '/deliveries',
      '/users',
      '/staff',
      '/categories',
      '/currencies',
      '/call-logs',
      '/reports',
      '/settings',
      '/admin/settings',
      '/admin/audit-logs',
    ],
    MERCHANT: [
      '/dashboard',
      '/orders',
      '/products',
      '/customers',
      '/invoices',
      '/payments',
      '/returns',
      '/shipments',
      '/reports',
      '/merchant/settings',
    ],
    MERCHANT_STAFF: [
      '/dashboard',
      '/orders',
      '/products',
      '/customers',
      '/invoices',
      '/returns',
      '/call-logs',
    ],
    LOGISTICS_PERSONNEL: [
      '/dashboard',
      '/deliveries',
      '/delivery-attempts',
      '/delivery-attempts/assigned-to-me',
      '/shipments',
      '/orders',
      '/call-logs',
    ],
    WAREHOUSE_MANAGER: [
      '/dashboard',
      '/warehouse',
      '/orders',
      '/products',
      '/shipments',
      '/returns',
      '/reports/inventory',
      '/settings',
    ],
  };
  
  return routePermissions[userRole] || ['/dashboard'];
}

/**
 * Middleware function to check route access
 */
export function checkRouteAccess(userRole: UserRole, pathname: string): boolean {
  const accessibleRoutes = getAccessibleRoutes(userRole);
  
  // Check for exact match first
  if (accessibleRoutes.includes(pathname)) {
    return true;
  }
  
  // Check for partial matches (e.g., /orders/123 matches /orders)
  return accessibleRoutes.some(route => {
    if (route.endsWith('/*')) {
      return pathname.startsWith(route.slice(0, -2));
    }
    return pathname.startsWith(route + '/') || pathname === route;
  });
}