'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, Users, UserCheck, UserX, Mail, Building, 
  Calendar, Activity, Plus, Filter, MoreHorizontal,
  Eye, Shield, Clock, Grid3x3, List, Download,
  KeyRound, UserMinus, UserPlus
} from 'lucide-react';
import { get, patch } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  business?: {
    id: string;
    name: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
}

interface UserStats {
  totalUsers: number;
  roleDistribution: Array<{ role: string; _count: { role: number } }>;
  verifiedUsers: number;
}

interface DetailedUser extends User {
  businessStats?: {
    totalOrders: number;
    totalProducts: number;
    pendingOrders: number;
  };
  logisticsStats?: {
    assignedWarehouses: number;
    activeOrders: number;
    completedDeliveries: number;
  };
  auditLogs?: Array<{
    id: string;
    entityType: string;
    action: string;
    timestamp: string;
    details: any;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<DetailedUser | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1); // Reset to first page when searching
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const response = await get(`/api/admin/users?${params}`);
      const data = response as { users: any[], summary: any, pagination: { totalPages: number } };
      setUsers(data.users || []);
      setStats(data.summary);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      setUpdating(userId);
      const response = await patch('/api/admin/users', { userId, action }) as any;
      
      if (response.success) {
        toast.success(response.message || `User ${action} completed successfully`);
        await fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Action failed');
      }
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.message || 'Failed to perform action. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    setLoadingDetails(true);
    
    try {
      const details = await get(`/api/admin/users/${user.id}`) as DetailedUser;
      setUserDetails(details);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast.error('Failed to load user details');
      setUserDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUser(null);
    setUserDetails(null);
    setLoadingDetails(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'text-red-400 border-red-400/20 bg-red-400/5';
      case 'MERCHANT':
        return 'text-blue-400 border-blue-400/20 bg-blue-400/5';
      case 'MERCHANT_STAFF':
        return 'text-purple-400 border-purple-400/20 bg-purple-400/5';
      case 'LOGISTICS':
        return 'text-green-400 border-green-400/20 bg-green-400/5';
      default:
        return 'text-gray-400 border-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !users.length) {
    return (
      <div className="space-y-6 p-6 bg-black min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f8c017] mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">
            Manage platform users, roles, and permissions
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-400 focus:border-[#f8c017] focus:ring-[#f8c017]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-700 rounded-lg bg-[#1a1a1a]">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-none ${viewMode === 'grid' 
                ? 'bg-[#f8c017] text-black hover:bg-[#f8c017]/90' 
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none ${viewMode === 'list' 
                ? 'bg-[#f8c017] text-black hover:bg-[#f8c017]/90' 
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Users className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Verified Users</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.verifiedUsers || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Admin Users</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.roleDistribution?.find(r => r.role === 'ADMIN')?._count?.role || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Merchants</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.roleDistribution?.find(r => r.role === 'MERCHANT')?._count?.role || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((user) => (
            <Card key={user.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all group">
              <CardContent className="p-6 space-y-4">
                {/* User Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#f8c017]/10 rounded-full flex items-center justify-center">
                        <span className="text-[#f8c017] font-semibold text-lg">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg group-hover:text-[#f8c017] transition-colors">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    {user.isVerified ? (
                      <Badge className="text-green-400 border-green-400/20 bg-green-400/5">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="text-red-400 border-red-400/20 bg-red-400/5">
                        <UserX className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-2 text-sm">
                  {user.business && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Building className="h-4 w-4 shrink-0" />
                      <span className="truncate">{user.business.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">Joined: {formatDate(user.createdAt)}</span>
                  </div>
                  {user.lastLoginAt && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Activity className="h-4 w-4 shrink-0" />
                      <span className="truncate">Last: {formatDate(user.lastLoginAt)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017] h-8 px-3"
                      onClick={() => handleViewUser(user)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:border-gray-500 h-8 w-8 p-0"
                          disabled={updating === user.id}
                        >
                          {updating === user.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent"></div>
                          ) : (
                            <MoreHorizontal className="h-3 w-3" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1a] border-gray-700">
                        {user.isVerified ? (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'unverify')}
                            className="text-red-400 hover:bg-red-400/10"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unverify User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'verify')}
                            className="text-green-400 hover:bg-green-400/10"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Verify User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleUserAction(user.id, 'resetPassword')}
                          className="text-[#f8c017] hover:bg-[#f8c017]/10"
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem 
                          onClick={() => handleViewUser(user)}
                          className="text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // List View  
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* User Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-12 h-12 bg-[#f8c017]/10 rounded-full flex items-center justify-center">
                        <span className="text-[#f8c017] font-semibold text-lg">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg hover:text-[#f8c017] transition-colors cursor-pointer">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                      {user.isVerified ? (
                        <Badge className="text-green-400 border-green-400/20 bg-green-400/5">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="text-red-400 border-red-400/20 bg-red-400/5">
                          <UserX className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>

                    {/* User Details */}
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {user.business && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Building className="h-4 w-4" />
                          <span className="text-sm">Business: {user.business.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Joined: {formatDate(user.createdAt)}</span>
                      </div>
                      {user.lastLoginAt && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Activity className="h-4 w-4" />
                          <span className="text-sm">Last Login: {formatDate(user.lastLoginAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                      onClick={() => handleViewUser(user)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:border-gray-500"
                          disabled={updating === user.id}
                        >
                          {updating === user.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border border-gray-400 border-t-transparent"></div>
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1a] border-gray-700">
                        {user.isVerified ? (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'unverify')}
                            className="text-red-400 hover:bg-red-400/10"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unverify User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'verify')}
                            className="text-green-400 hover:bg-green-400/10"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Verify User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleUserAction(user.id, 'resetPassword')}
                          className="text-[#f8c017] hover:bg-[#f8c017]/10"
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem 
                          onClick={() => handleViewUser(user)}
                          className="text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-gray-300">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Next
          </Button>
        </div>
      )}

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={closeUserDetails}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Eye className="h-5 w-5 text-[#f8c017]" />
              User Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedUser && `Detailed information for ${selectedUser.firstName} ${selectedUser.lastName}`}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f8c017]"></div>
              <span className="ml-3 text-gray-400">Loading user details...</span>
            </div>
          ) : userDetails ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 bg-[#2a2a2a]">
                <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="business" className="text-gray-300 data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
                  Business
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-gray-300 data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-gray-300 data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-[#2a2a2a] border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white">{userDetails.firstName} {userDetails.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{userDetails.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Role:</span>
                        <Badge className={getRoleColor(userDetails.role)}>
                          {userDetails.role}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        {userDetails.isVerified ? (
                          <Badge className="text-green-400 border-green-400/20 bg-green-400/5">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="text-red-400 border-red-400/20 bg-red-400/5">
                            <UserX className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Joined:</span>
                        <span className="text-white">{formatDate(userDetails.createdAt)}</span>
                      </div>
                      {userDetails.lastLoginAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Login:</span>
                          <span className="text-white">{formatDate(userDetails.lastLoginAt)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-[#2a2a2a] border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">Role Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {userDetails.businessStats && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Orders:</span>
                            <span className="text-white">{userDetails.businessStats.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Products:</span>
                            <span className="text-white">{userDetails.businessStats.totalProducts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pending Orders:</span>
                            <span className="text-white">{userDetails.businessStats.pendingOrders}</span>
                          </div>
                        </>
                      )}
                      {userDetails.logisticsStats && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Assigned Warehouses:</span>
                            <span className="text-white">{userDetails.logisticsStats.assignedWarehouses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Active Orders:</span>
                            <span className="text-white">{userDetails.logisticsStats.activeOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Completed Deliveries:</span>
                            <span className="text-white">{userDetails.logisticsStats.completedDeliveries}</span>
                          </div>
                        </>
                      )}
                      {!userDetails.businessStats && !userDetails.logisticsStats && (
                        <div className="text-gray-400 text-center py-4">
                          No role-specific statistics available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-4">
                {userDetails.business ? (
                  <Card className="bg-[#2a2a2a] border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">Business Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Business Name:</span>
                        <span className="text-white">{userDetails.business.name}</span>
                      </div>
                      {userDetails.business.contactPhone && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Phone:</span>
                          <span className="text-white">{userDetails.business.contactPhone}</span>
                        </div>
                      )}
                      {userDetails.business.address && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Address:</span>
                          <span className="text-white">{userDetails.business.address}</span>
                        </div>
                      )}
                      {userDetails.business.city && userDetails.business.state && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Location:</span>
                          <span className="text-white">{userDetails.business.city}, {userDetails.business.state}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    <Building className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    No business information available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                {userDetails.auditLogs && userDetails.auditLogs.length > 0 ? (
                  <div className="space-y-3">
                    {userDetails.auditLogs.map((log, index) => (
                      <Card key={log.id} className="bg-[#2a2a2a] border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[#f8c017] border-[#f8c017]/20">
                                  {log.action}
                                </Badge>
                                <span className="text-gray-400 text-sm">{log.entityType}</span>
                              </div>
                              <div className="text-white text-sm">
                                {JSON.stringify(log.details, null, 2)}
                              </div>
                            </div>
                            <span className="text-gray-400 text-xs">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    No recent activity found
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="grid gap-4">
                  <Card className="bg-[#2a2a2a] border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">User Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {userDetails.isVerified ? (
                        <Button 
                          onClick={() => {
                            handleUserAction(userDetails.id, 'unverify');
                            closeUserDetails();
                          }}
                          variant="destructive"
                          className="w-full"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unverify User
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            handleUserAction(userDetails.id, 'verify');
                            closeUserDetails();
                          }}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Verify User
                        </Button>
                      )}
                      <Button 
                        onClick={() => {
                          handleUserAction(userDetails.id, 'resetPassword');
                          closeUserDetails();
                        }}
                        className="w-full bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Failed to load user details</p>
              <Button 
                onClick={closeUserDetails}
                variant="outline"
                className="mt-4 border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}