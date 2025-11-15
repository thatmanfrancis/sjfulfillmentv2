'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  UserCheck
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  { name: 'Shipments', href: '/shipments', icon: Truck },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Invoices', href: '/invoices', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Merchants', href: '/admin/merchants', icon: UserCheck },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-gold rounded-lg flex items-center justify-center shadow-gold">
              <span className="text-black font-bold text-sm">SJ</span>
            </div>
            <span className="font-bold text-xl text-sidebar-foreground">SJFulfillment</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {/* Main Navigation */}
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-gold border-r-2 border-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary'
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

          {/* Admin Section */}
          {!collapsed && (
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </h3>
              <div className="mt-1 space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-gold border-r-2 border-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'shrink-0 h-5 w-5 mr-3',
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        )}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* User info at bottom */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 gradient-gold rounded-full flex items-center justify-center shadow-gold">
              <span className="text-xs font-medium text-black">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                John Doe
              </p>
              <p className="text-xs text-muted-foreground truncate">
                john@business.com
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}