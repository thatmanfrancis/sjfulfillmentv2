'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Warehouse, 
  BarChart3, 
  FileText, 
  Settings, 
  Users, 
  ChevronLeft,
  ChevronRight,
  Bell,
  CreditCard,
  Truck,
  UserCheck,
  User
} from 'lucide-react';
import { get } from '@/lib/api';
import { useSidebar } from '@/lib/sidebar-context';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profileImage?: string;
  business?: {
    id: string;
    name: string;
    type: string;
  };
}

// Role-specific navigation
const getNavigationForRole = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Merchants', href: '/admin/merchants', icon: UserCheck },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Shipments', href: '/admin/shipments', icon: Truck },
        { name: 'Logistics', href: '/admin/logistics', icon: Truck },
        { name: 'Invoices', href: '/admin/invoices', icon: CreditCard },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Warehouses', href: '/admin/warehouses', icon: Warehouse },
        { name: 'Price Tiers', href: '/admin/price-tiers', icon: CreditCard },
        { name: 'Notifications', href: '/admin/notifications', icon: Bell },
        { name: 'Reports', href: '/admin/reports', icon: FileText },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ];
    case 'MERCHANT':
      return [
        { name: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard },
        { name: 'Products', href: '/merchant/products', icon: Package },
        { name: 'Orders', href: '/merchant/orders', icon: ShoppingCart },
        { name: 'Inventory', href: '/merchant/inventory', icon: Warehouse },
        { name: 'Analytics', href: '/merchant/analytics', icon: BarChart3 },
        { name: 'Invoices', href: '/merchant/invoices', icon: CreditCard },
        { name: 'Reports', href: '/merchant/reports', icon: FileText },
        { name: 'Staff', href: '/merchant/staff', icon: Users },
        { name: 'Settings', href: '/merchant/settings', icon: Settings },
      ];
    case 'LOGISTICS':
      return [
        { name: 'Dashboard', href: '/logistics/dashboard', icon: LayoutDashboard },
        { name: 'Shipments', href: '/logistics/shipments', icon: Truck },
        { name: 'Orders', href: '/logistics/orders', icon: ShoppingCart },
        { name: 'Analytics', href: '/logistics/analytics', icon: BarChart3 },
        { name: 'Warehouses', href: '/logistics/warehouses', icon: Warehouse },
        { name: 'Reports', href: '/logistics/reports', icon: FileText },
        { name: 'Settings', href: '/logistics/settings', icon: Settings },
      ];
    default:
      return [];
  }
};

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await get<{ unreadCount: number }>('/api/notifications?limit=0');
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await get<{success: boolean; user: UserProfile} | UserProfile>('/api/auth/me');
      // Handle both wrapped and unwrapped responses
      if ('user' in response && 'success' in response) {
        setUser(response.user);
      } else {
        setUser(response as UserProfile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border smooth-transition fixed left-0 top-0 z-40 overflow-hidden transform-gpu',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + Notification Bell */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border relative">
        <div className="flex items-center space-x-2">
          {!collapsed && (
            <>
              {/* <div className="w-8 h-8 gradient-gold rounded-lg flex items-center justify-center shadow-gold">
                <span className="text-black font-bold text-sm">SJ</span>
              </div>
              <span className="font-bold text-xl text-sidebar-foreground">SJFulfillment</span> */}
              <Image src="/sjflogo.png" alt="SJFulfillment Logo" width={100} height={100} />
            </>
          )}
        </div>
        {/* Notification Bell Icon */}
        {/* <div className="relative mr-2">
          <Button variant="ghost" size="icon" className="relative p-0 h-8 w-8" asChild>
            <Link href="/merchant/notifications">
              <Bell className="h-5 w-5 text-brand-gold" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs bg-brand-gold text-black font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </Button>
        </div> */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-300 ease-in-out hover:scale-110 transform-gpu"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4 overflow-y-auto h-0">
        <nav className="space-y-1 px-2">
          {/* Role-based Navigation */}
          {user && getNavigationForRole(user.role).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out transform-gpu',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-gold border-r-2 border-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary hover:scale-105'
                )}
              >
                <item.icon
                  className={cn(
                    'shrink-0 h-5 w-5',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                    collapsed ? 'mr-0' : 'mr-3'
                  )}
                />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User info at bottom */}
      <div className="border-t border-sidebar-border p-4 shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            {user?.profileImage ? (
              <img 
                src={user.profileImage} 
                alt={`${user.firstName} ${user.lastName}`}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {loading ? 'Loading...' : user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {loading ? '...' : user?.email || 'user@example.com'}
              </p>
              {user?.role && !loading && (
                <p className="text-xs text-muted-foreground/70 truncate capitalize">
                  {user.role.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}