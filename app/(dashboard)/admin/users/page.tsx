import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Shield, Building2, Calendar, Mail, Phone, MoreHorizontal, Search } from 'lucide-react';
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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  business?: {
    id: string;
    name: string;
    contactPhone?: string;
  };
}

interface UsersData {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalUsers: number;
    roleDistribution: Array<{ role: string; _count: { role: number } }>;
    activeUsers: number;
  };
}

async function getUsersData(): Promise<UsersData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/users`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching users data:', error);
    return {
      users: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      summary: {
        totalUsers: 0,
        roleDistribution: [],
        activeUsers: 0,
      },
    };
  }
}

const roleColors = {
  ADMIN: 'bg-purple-600 hover:bg-purple-600',
  MERCHANT: 'bg-blue-600 hover:bg-blue-600',
  MERCHANT_STAFF: 'bg-green-600 hover:bg-green-600',
  LOGISTICS: 'bg-orange-600 hover:bg-orange-600',
};

const roleLabels = {
  ADMIN: 'Administrator',
  MERCHANT: 'Merchant',
  MERCHANT_STAFF: 'Merchant Staff',
  LOGISTICS: 'Logistics',
};

export default async function AdminUsersPage() {
  const data = await getUsersData();

  // Calculate role stats for display
  const roleStats = data.summary.roleDistribution.reduce((acc, item) => {
    acc[item.role] = item._count.role;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">User Management</h1>
            <p className="text-gray-400">Manage all platform users and their permissions</p>
          </div>
          <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
            <UserPlus className="w-4 h-4 mr-2" />
            Add New User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.summary.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Active Users</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.summary.activeUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Admins</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{roleStats.ADMIN || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Merchants</CardTitle>
              <Building2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{roleStats.MERCHANT || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Staff</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{roleStats.MERCHANT_STAFF || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Logistics</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{roleStats.LOGISTICS || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">Filter Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Roles</SelectItem>
                  <SelectItem value="ADMIN" className="text-white">Administrators</SelectItem>
                  <SelectItem value="MERCHANT" className="text-white">Merchants</SelectItem>
                  <SelectItem value="MERCHANT_STAFF" className="text-white">Merchant Staff</SelectItem>
                  <SelectItem value="LOGISTICS" className="text-white">Logistics</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="active" className="text-white">Active</SelectItem>
                  <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
                  <SelectItem value="verified" className="text-white">Verified</SelectItem>
                  <SelectItem value="unverified" className="text-white">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">All Users</CardTitle>
            <CardDescription className="text-gray-400">
              Comprehensive list of all platform users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gradient-gold">User</TableHead>
                    <TableHead className="text-gradient-gold">Contact</TableHead>
                    <TableHead className="text-gradient-gold">Role</TableHead>
                    <TableHead className="text-gradient-gold">Business</TableHead>
                    <TableHead className="text-gradient-gold">Status</TableHead>
                    <TableHead className="text-gradient-gold">Last Login</TableHead>
                    <TableHead className="text-gradient-gold">Joined</TableHead>
                    <TableHead className="text-gradient-gold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.id} className="border-gray-700">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-400">ID: {user.id.slice(0, 8)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{user.email}</span>
                          </div>
                          {user.business?.contactPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{user.business.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="default" 
                          className={roleColors[user.role as keyof typeof roleColors]}
                        >
                          {roleLabels[user.role as keyof typeof roleLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {user.business ? (
                          <div>
                            <div className="font-medium text-sm">{user.business.name}</div>
                            <div className="text-xs text-gray-400">ID: {user.business.id.slice(0, 8)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">No business</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge 
                            variant={user.isVerified ? "default" : "secondary"}
                            className={user.isVerified 
                              ? "bg-green-600 hover:bg-green-600" 
                              : "bg-yellow-600 hover:bg-yellow-600"
                            }
                          >
                            {user.isVerified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {user.lastLoginAt 
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-800">
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            <DropdownMenuLabel className="text-gradient-gold">Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem className="text-blue-400 hover:bg-gray-700">
                              {user.isVerified ? 'Unverify Account' : 'Verify Account'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400 hover:bg-gray-700">
                              Suspend User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} users
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={data.pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={data.pagination.page >= data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}