'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Warehouse, 
  BarChart3, 
  FileText, 
  Settings, 
  User,
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

const merchantStaffNavigation = [
  { name: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/merchant/products', icon: Package },
  { name: 'Orders', href: '/merchant/orders', icon: ShoppingCart },
  { name: 'Inventory', href: '/merchant/inventory', icon: Warehouse },
  { name: 'Analytics', href: '/merchant/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/merchant/reports', icon: FileText },
  { name: 'Settings', href: '/merchant/settings', icon: Settings },
];

export function MerchantStaffSidebar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Mock user data - replace with actual API call
      const mockUser: UserProfile = {
        id: '1',
        firstName: 'Jane',
        lastName: 'Staff',
        email: 'jane@merchant.com',
        role: 'MERCHANT_STAFF',
        business: {
          id: '1',
          name: 'John\'s Store',
          type: 'e-commerce'
        }
      };
      setUser(mockUser);
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
          <div className="flex items-center space-x-3 group-data-[collapsible=icon]:justify-center">
            <div className="w-10 h-10 bg-linear-to-r from-[#f8c017] to-[#ffd700] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-lg">SJ</span>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <span className="font-bold text-xl text-white block">
                SJFulfillment
              </span>
              <span className="text-sm text-gray-400">
                Staff Portal
              </span>
            </div>
          </div>
          <SidebarTrigger className="text-white hover:bg-gray-800 hover:text-[#f8c017] transition-colors duration-200 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="p-4 pt-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-sm font-medium mb-4 group-data-[collapsible=icon]:sr-only">
            Staff Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 group-data-[collapsible=icon]:space-y-1">
              {merchantStaffNavigation.map((item) => {
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
            {user?.business && !loading && (
              <p className="text-xs text-gray-500 truncate">
                {user.business.name} • Staff
              </p>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}