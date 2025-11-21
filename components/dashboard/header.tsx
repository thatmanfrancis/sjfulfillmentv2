
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  Plus
} from 'lucide-react';
import { get, post } from '@/lib/api';

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

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
    fetchNotifications();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await get<{success: boolean; user: UserProfile}>('/api/auth/me');
      setUser(response.user);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      // Don't set loading to false here if it's an auth error - let redirect handle it
      if (error?.status === 401) {
        return; // Redirect will happen automatically from api.ts
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await get<NotificationResponse>('/api/notifications?limit=5');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      // Silently fail for notifications on auth errors
      if (error?.status === 401) {
        return;
      }
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: [notificationId],
          markAsRead: true
        })
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    // Helper function to get appropriate icon for notification type
    const iconClass = "w-3 h-3";
    switch (type) {
      case 'ORDER_CREATED':
      case 'ORDER_STATUS_UPDATED':
        return <div className={`${iconClass} bg-blue-400 rounded-full`}></div>;
      case 'STOCK_LOW':
      case 'STOCK_ALERT':
        return <div className={`${iconClass} bg-red-400 rounded-full`}></div>;
      case 'PAYMENT_RECEIVED':
        return <div className={`${iconClass} bg-green-400 rounded-full`}></div>;
      default:
        return <div className={`${iconClass} bg-brand-gold rounded-full`}></div>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        document.cookie = 'session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const [showOrderModal, setShowOrderModal] = useState(false);

  const handleNewOrder = () => {
    setShowOrderModal(true);
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-brand-black border-b border-brand-black/20 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gold" />
            <Input
              type="search"
              placeholder="Search orders, products, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 bg-brand-black/40 border-brand-black/20 text-white placeholder-gray-400 hover:border-brand-gold/50 focus:border-brand-gold"
            />
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <Button 
            size="sm" 
            onClick={handleNewOrder}
            className="hidden md:flex gradient-gold text-black hover:shadow-gold-lg font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative hover:bg-brand-black/40 hover:border-brand-gold/20 border border-transparent">
                <Bell className="h-5 w-5 text-brand-gold" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-brand-gold text-black font-bold"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 shadow-lg text-gray-900">
              <DropdownMenuLabel className="text-brand-gold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="border-brand-black/20" />
              <div className="space-y-2 p-2 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notification.title || notification.message.slice(0, 30)}...
                        </p>
                        <p className="text-xs text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <DropdownMenuSeparator className="border-gray-200" />
              <DropdownMenuItem className="w-full justify-center text-blue-600 hover:bg-gray-50">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3 hover:bg-brand-black/40 text-white">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                    <span className="text-black text-sm font-medium">
                      {loading ? '...' : user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
                    </span>
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">
                    {loading ? 'Loading...' : user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {loading ? '...' : user?.role || 'User'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuLabel className="text-blue-600">
                {user?.business?.name || 'My Account'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="border-gray-200" />
              <DropdownMenuItem 
                onClick={handleProfile}
                className="text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
              >
                <User className="mr-2 h-4 w-4 text-blue-600" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSettings}
                className="text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
              >
                <Settings className="mr-2 h-4 w-4 text-blue-600" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="border-gray-200" />
              <DropdownMenuItem 
                onClick={handleLogoutClick}
                className="text-red-600 hover:bg-red-50 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* New Order Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create New Order</DialogTitle>
            <DialogDescription className="text-gray-600">
              Fill in the order details below to create a new order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Customer Name</Label>
                <Input 
                  placeholder="Enter customer name"
                  className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <Label className="text-gray-700">Customer Phone</Label>
                <Input 
                  placeholder="Enter phone number"
                  className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Customer Address</Label>
              <Textarea 
                placeholder="Enter delivery address"
                className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Total Amount</Label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <Label className="text-gray-700">Status</Label>
                <Select>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="AWAITING_ALLOC">Awaiting Allocation</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowOrderModal(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // TODO: Implement order creation
                setShowOrderModal(false);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Confirm Logout</DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowLogoutConfirm(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowLogoutConfirm(false);
                handleLogout();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}