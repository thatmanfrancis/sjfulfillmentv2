import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, AlertCircle, Info, CheckCircle, X, MoreHorizontal, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  readAt?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface NotificationsData {
  notifications: Notification[];
  summary: {
    totalNotifications: number;
    unreadCount: number;
    criticalCount: number;
    todayCount: number;
  };
}

async function getNotificationsData(): Promise<NotificationsData> {
  try {
    // For now, generate mock data since notification API might not be fully implemented
    const mockNotifications: Notification[] = [
      {
        id: '1',
        userId: 'user1',
        type: 'ORDER_STATUS',
        title: 'Order Status Update',
        message: 'Order #12345 has been shipped successfully',
        isRead: false,
        entityType: 'ORDER',
        entityId: 'order-123',
        createdAt: new Date().toISOString(),
        user: {
          id: 'user1',
          firstName: 'John',
          lastName: 'Merchant',
          email: 'john@merchant.com',
          role: 'MERCHANT',
        },
      },
      {
        id: '2',
        userId: 'user2',
        type: 'INVENTORY_ALERT',
        title: 'Low Stock Alert',
        message: 'Product "Premium Widget" is running low on stock (5 units remaining)',
        isRead: false,
        entityType: 'PRODUCT',
        entityId: 'product-456',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        user: {
          id: 'user2',
          firstName: 'Jane',
          lastName: 'Manager',
          email: 'jane@warehouse.com',
          role: 'LOGISTICS',
        },
      },
      {
        id: '3',
        userId: 'user3',
        type: 'INVOICE_DUE',
        title: 'Invoice Due Soon',
        message: 'Invoice INV-2024-001 is due in 3 days ($2,450.00)',
        isRead: true,
        entityType: 'INVOICE',
        entityId: 'invoice-789',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        readAt: new Date(Date.now() - 3600000).toISOString(),
        user: {
          id: 'user3',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@system.com',
          role: 'ADMIN',
        },
      },
      {
        id: '4',
        userId: 'user4',
        type: 'SYSTEM_UPDATE',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2-4 AM EST',
        isRead: false,
        entityType: 'SYSTEM',
        entityId: 'maintenance-001',
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        user: {
          id: 'user4',
          firstName: 'System',
          lastName: 'Admin',
          email: 'system@admin.com',
          role: 'ADMIN',
        },
      },
    ];

    const unreadCount = mockNotifications.filter(n => !n.isRead).length;
    const criticalCount = mockNotifications.filter(n => n.type === 'INVENTORY_ALERT' || n.type === 'INVOICE_DUE').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = mockNotifications.filter(n => new Date(n.createdAt) >= today).length;

    return {
      notifications: mockNotifications,
      summary: {
        totalNotifications: mockNotifications.length,
        unreadCount,
        criticalCount,
        todayCount,
      },
    };
  } catch (error) {
    console.error('Error fetching notifications data:', error);
    return {
      notifications: [],
      summary: {
        totalNotifications: 0,
        unreadCount: 0,
        criticalCount: 0,
        todayCount: 0,
      },
    };
  }
}

const typeIcons = {
  ORDER_STATUS: CheckCircle,
  INVENTORY_ALERT: AlertCircle,
  INVOICE_DUE: Mail,
  SYSTEM_UPDATE: Info,
  USER_ACTION: Bell,
};

const typeColors = {
  ORDER_STATUS: 'text-green-400',
  INVENTORY_ALERT: 'text-yellow-400',
  INVOICE_DUE: 'text-red-400',
  SYSTEM_UPDATE: 'text-blue-400',
  USER_ACTION: 'text-purple-400',
};

const typeLabels = {
  ORDER_STATUS: 'Order Update',
  INVENTORY_ALERT: 'Inventory Alert',
  INVOICE_DUE: 'Invoice Due',
  SYSTEM_UPDATE: 'System Update',
  USER_ACTION: 'User Action',
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMins}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}

export default async function NotificationsPage() {
  const data = await getNotificationsData();

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Notification Center</h1>
            <p className="text-gray-400">Monitor system alerts and user notifications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Filter className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
            <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
              <Bell className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.summary.totalNotifications}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Unread</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{data.summary.unreadCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Critical Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{data.summary.criticalCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.summary.todayCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">Filter Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notifications..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  <SelectItem value="ORDER_STATUS" className="text-white">Order Updates</SelectItem>
                  <SelectItem value="INVENTORY_ALERT" className="text-white">Inventory Alerts</SelectItem>
                  <SelectItem value="INVOICE_DUE" className="text-white">Invoice Due</SelectItem>
                  <SelectItem value="SYSTEM_UPDATE" className="text-white">System Updates</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="unread" className="text-white">Unread</SelectItem>
                  <SelectItem value="read" className="text-white">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Table */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">All Notifications</CardTitle>
            <CardDescription className="text-gray-400">
              System-wide notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gradient-gold">Status</TableHead>
                    <TableHead className="text-gradient-gold">Type</TableHead>
                    <TableHead className="text-gradient-gold">Message</TableHead>
                    <TableHead className="text-gradient-gold">User</TableHead>
                    <TableHead className="text-gradient-gold">Time</TableHead>
                    <TableHead className="text-gradient-gold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.notifications.map((notification) => {
                    const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
                    const iconColor = typeColors[notification.type as keyof typeof typeColors] || 'text-gray-400';
                    
                    return (
                      <TableRow 
                        key={notification.id} 
                        className={`border-gray-700 ${!notification.isRead ? 'bg-blue-900/10' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <Badge 
                              variant={notification.isRead ? "secondary" : "default"}
                              className={notification.isRead ? "bg-gray-600" : "bg-blue-600"}
                            >
                              {notification.isRead ? 'Read' : 'Unread'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${iconColor}`} />
                            <span className="text-sm">
                              {typeLabels[notification.type as keyof typeof typeLabels] || notification.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div>
                            <div className={`font-medium ${!notification.isRead ? 'text-white' : ''}`}>
                              {notification.title}
                            </div>
                            <div className="text-sm text-gray-400 max-w-md">
                              {notification.message}
                            </div>
                            {notification.entityType && (
                              <div className="text-xs text-gray-500 mt-1">
                                Related to: {notification.entityType}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {notification.user ? (
                            <div>
                              <div className="font-medium text-sm">
                                {notification.user.firstName} {notification.user.lastName}
                              </div>
                              <div className="text-xs text-gray-400">{notification.user.role}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">System</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm">
                          <div>
                            <div>{getTimeAgo(notification.createdAt)}</div>
                            {notification.readAt && (
                              <div className="text-xs text-gray-500">
                                Read {getTimeAgo(notification.readAt)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-800"
                              >
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-800">
                                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                                <DropdownMenuLabel className="text-gradient-gold">Actions</DropdownMenuLabel>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  {notification.isRead ? 'Mark as Unread' : 'Mark as Read'}
                                </DropdownMenuItem>
                                {notification.entityType && (
                                  <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                    Go to {notification.entityType}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem className="text-red-400 hover:bg-gray-700">
                                  <X className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* If no notifications exist */}
        {data.notifications.length === 0 && (
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-300">No notifications</h3>
                <p className="mt-2 text-sm text-gray-400">
                  You're all caught up! No new notifications to display.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}