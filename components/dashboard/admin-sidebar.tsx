'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Bell,
  CreditCard,
  Truck,
  UserCheck,
  User,
  ChevronLeft,
  LogOut
} from 'lucide-react';
import { get } from '@/lib/api';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

export function AdminSidebar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const pathname = usePathname();

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

  const handleLogout = async () => {
    setIsLogoutDialogOpen(false);
    
    try {
      // Call logout API to clear session
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    
    // Clear any stored tokens/session data
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    // Redirect to login
    window.location.href = '/auth/login';
  };

  return (
    <Sidebar collapsible="icon" className="bg-[#1a1a1a] border-r border-gray-800">
      {/* Header */}
      <SidebarHeader className="border-b border-gray-800 p-6 group-data-[collapsible=icon]:p-4">
        <div className="flex items-center justify-between">
          {/* <div className="flex items-center space-x-3 group-data-[collapsible=icon]:justify-center">
            <div className="w-10 h-10 bg-linear-to-r from-[#f8c017] to-[#ffd700] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-lg">SJ</span>
            </div>
            <span className="font-bold text-xl text-white group-data-[collapsible=icon]:hidden">
              SJFulfillment
            </span>
          </div> */}

            <Image src="/sjflogo.png" alt="SJFulfillment Logo" width={100} height={100} />
          {/* Always show trigger, but style differently when collapsed */}
          <SidebarTrigger className="text-white hover:bg-gray-800 hover:text-[#f8c017] transition-colors duration-200 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-2 group-data-[collapsible=icon]:right-2 group-data-[collapsible=icon]:z-10" />
        </div>
        {/* Additional trigger for collapsed state - positioned at bottom of logo area */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center mt-2">
          <SidebarTrigger className="text-white hover:bg-gray-800 hover:text-[#f8c017] transition-colors duration-200 p-1 rounded" />
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="p-4 pt-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-sm font-medium mb-4 group-data-[collapsible=icon]:sr-only">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 group-data-[collapsible=icon]:space-y-1">
              {user && getNavigationForRole(user.role).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={`
                        h-12 text-base font-medium rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-[#f8c017]/10 text-[#f8c017] border border-[#f8c017]/20 shadow-sm' 
                          : 'text-gray-300 hover:text-white hover:bg-gray-800/50 hover:border-gray-700'
                        }
                      `}
                    >
                      <Link href={item.href} className="flex items-center gap-4 px-4">
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:sr-only">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                  <DialogTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Logout"
                      className="h-12 text-base font-medium rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4 px-4">
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:sr-only">Logout</span>
                      </div>
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Confirm Logout</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Are you sure you want to logout? You will need to sign in again to access your account.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsLogoutDialogOpen(false)}
                        className="border-gray-600 text-white hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleLogout}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Logout
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-gray-800 p-6 group-data-[collapsible=icon]:p-4">
        <div className="flex items-center space-x-3 group-data-[collapsible=icon]:justify-center">
          {user?.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={`${user.firstName} ${user.lastName}`}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-gray-300" />
            </div>
          )}
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-base font-medium text-white truncate">
              {loading ? 'Loading...' : user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {loading ? '...' : user?.email || 'user@example.com'}
            </p>
            {user?.role && !loading && (
              <p className="text-xs text-gray-500 truncate capitalize">
                {user.role.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}