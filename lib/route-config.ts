// Centralized route access control configuration
export interface RouteConfig {
  path: string;
  allowedRoles: string[];
  name: string;
  description?: string;
}

// Define all routes and their allowed roles
export const ROUTE_CONFIG: RouteConfig[] = [
  // Role-specific dashboard routes
  {
    path: '/admin/dashboard',
    allowedRoles: ['ADMIN'],
    name: 'Admin Dashboard',
    description: 'Admin overview dashboard'
  },
  {
    path: '/merchant/dashboard',
    allowedRoles: ['MERCHANT'],
    name: 'Merchant Dashboard',
    description: 'Merchant overview dashboard'
  },
  {
    path: '/logistics/dashboard',
    allowedRoles: ['LOGISTICS'],
    name: 'Logistics Dashboard',
    description: 'Logistics overview dashboard'
  },

  // Admin-only routes
  {
    path: '/admin',
    allowedRoles: ['ADMIN'],
    name: 'Admin Panel',
    description: 'Admin section access'
  },
  {
    path: '/admin/users',
    allowedRoles: ['ADMIN'],
    name: 'User Management',
    description: 'Manage system users'
  },
  {
    path: '/admin/merchants',
    allowedRoles: ['ADMIN'],
    name: 'Merchant Management',
    description: 'Manage merchants and businesses'
  },
  {
    path: '/admin/warehouses',
    allowedRoles: ['ADMIN'],
    name: 'Warehouse Management',
    description: 'Manage warehouses and inventory locations'
  },
  {
    path: '/admin/settings',
    allowedRoles: ['ADMIN'],
    name: 'System Settings',
    description: 'Configure system settings'
  },
  {
    path: '/admin/pricing-tiers',
    allowedRoles: ['ADMIN'],
    name: 'Pricing Tiers',
    description: 'Manage pricing tiers'
  },

  // Logistics routes
  {
    path: '/admin/logistics',
    allowedRoles: ['ADMIN', 'LOGISTICS'],
    name: 'Logistics Management',
    description: 'Manage logistics and deliveries'
  },

  // Merchant routes
  {
    path: '/orders',
    allowedRoles: ['ADMIN', 'LOGISTICS', 'MERCHANT'],
    name: 'Orders',
    description: 'View and manage orders'
  },
  {
    path: '/products',
    allowedRoles: ['MERCHANT'],
    name: 'Products',
    description: 'Manage products'
  },
  {
    path: '/warehouses',
    allowedRoles: ['ADMIN'],
    name: 'Warehouses',
    description: 'Warehouse overview'
  },

  // Profile routes (accessible to all authenticated users)
  {
    path: '/profile',
    allowedRoles: ['ADMIN', 'LOGISTICS', 'MERCHANT'],
    name: 'Profile',
    description: 'User profile settings'
  }
];

// Helper function to check if user role can access a route
export function canAccessRoute(userRole: string, routePath: string): boolean {
  const route = ROUTE_CONFIG.find(r => 
    routePath === r.path || routePath.startsWith(r.path + '/')
  );
  
  if (!route) {
    // If route not defined, allow access (for public routes)
    return true;
  }
  
  return route.allowedRoles.includes(userRole);
}

// Get routes accessible by user role
export function getRoutesForRole(userRole: string): RouteConfig[] {
  return ROUTE_CONFIG.filter(route => route.allowedRoles.includes(userRole));
}

// Get route config by path
export function getRouteConfig(routePath: string): RouteConfig | undefined {
  return ROUTE_CONFIG.find(r => 
    routePath === r.path || routePath.startsWith(r.path + '/')
  );
}

// Helper function to get the appropriate dashboard route for a user role
export function getRoleBasedDashboard(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'MERCHANT':
      return '/merchant/dashboard';
    case 'LOGISTICS':
      return '/logistics/dashboard';
    default:
      return '/auth/login';
  }
}