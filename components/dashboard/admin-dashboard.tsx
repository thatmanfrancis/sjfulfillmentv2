'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, Package, ShoppingCart, Users, TrendingUp, Truck, 
  DollarSign, AlertCircle, CheckCircle, Clock, Building, 
  Star, Activity, Shield, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { get } from '@/lib/api';
import { 
  RevenueChart, 
  SalesChart, 
  CategoryChart, 
  UserGrowthChart,
  SystemHealthChart,
  DailyRevenueChart 
} from './charts';

interface AdminStats {
  totalUsers: number;
  totalMerchants: number;
  totalProducts: number;
  totalOrders: number;
  totalShipments: number;
  monthlyRevenue: number;
  pendingOrders: number;
  activeShipments: number;
  newSignups: number;
  systemHealth: {
    uptime: number;
    performance: number;
    security: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'order' | 'user' | 'merchant' | 'shipment' | 'system';
    message: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;
  topMerchants: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
    rating: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

interface ChartData {
  revenue: any[];
  sales: any[];
  userGrowth: any[];
  categories: any[];
  dailyRevenue: any[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real data from your APIs
      const [statsResponse, chartsResponse] = await Promise.all([
        get('/api/admin/stats'),
        get('/api/admin/charts')
      ]);

      if (statsResponse) {
        setStats(statsResponse as any);
      }
      
      if (chartsResponse) {
        setChartData(chartsResponse as any);
      }
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string, status: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'merchant':
        return <Building className="h-4 w-4" />;
      case 'shipment':
        return <Truck className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'text-[#f8c017] bg-[#f8c017]/10 border-[#f8c017]/20';
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-black p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">Loading platform analytics...</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-[#2a2a2a] border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
                  <div className="h-5 w-5 bg-gray-600 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-600 rounded w-20 animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-16 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">Platform overview and management</p>
            </div>
          </div>
          
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error Loading Dashboard
              </CardTitle>
              <CardDescription className="text-red-300">
                {error}. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button 
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-[#f8c017] text-black rounded-md hover:bg-[#f8c017]/90 transition-colors font-medium"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300 text-lg">
              Complete platform overview and key performance indicators
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1.5">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              System Healthy
            </Badge>
            <Badge className="bg-[#f8c017]/20 text-[#f8c017] border-[#f8c017]/30 px-3 py-1.5">
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Users */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <Users className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats?.totalUsers?.toLocaleString() || '0'}</div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">+{stats?.newSignups || 0}</span> this month
              </p>
            </CardContent>
          </Card>

          {/* Total Merchants */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Active Merchants</CardTitle>
              <div className="p-3 bg-gray-600/50 rounded-xl">
                <Building className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats?.totalMerchants?.toLocaleString() || '0'}</div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">+8%</span> from last month
              </p>
            </CardContent>
          </Card>

          {/* Total Products */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Total Products</CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <Package className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats?.totalProducts?.toLocaleString() || '0'}</div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">+15%</span> from last month
              </p>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Monthly Revenue</CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency(stats?.monthlyRevenue || 0)}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">+27%</span> from last month
              </p>
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="bg-linear-to-brfrom-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-orange-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Pending Orders</CardTitle>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Clock className="h-5 w-5 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats?.pendingOrders?.toLocaleString() || '0'}</div>
              <p className="text-sm text-orange-300">
                Require attention
              </p>
            </CardContent>
          </Card>

          {/* Active Shipments */}
          <Card className="bg-linear-to-brfrom-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Active Shipments</CardTitle>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Truck className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats?.activeShipments?.toLocaleString() || '0'}</div>
              <p className="text-sm text-blue-300">
                In transit
              </p>
            </CardContent>
          </Card>

          {/* System Performance */}
          <Card className="bg-linear-to-brfrom-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-emerald-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">System Health</CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats?.systemHealth?.performance || 98}%</div>
              <p className="text-sm text-emerald-300">
                Uptime: {stats?.systemHealth?.uptime || 99.9}%
              </p>
            </CardContent>
          </Card>

          {/* Platform Rating */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Platform Rating</CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <Star className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">4.8</div>
              <p className="text-sm text-[#f8c017]">
                Based on merchant feedback
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Chart */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#f8c017]" />
                Revenue Overview
              </CardTitle>
              <CardDescription className="text-gray-400">Monthly revenue trends and performance</CardDescription>
            </CardHeader>
            <CardContent className="bg-[#1f1f1f] rounded-lg p-6">
              <RevenueChart data={chartData?.revenue} />
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#f8c017]" />
                User Growth
              </CardTitle>
              <CardDescription className="text-gray-400">Platform user acquisition metrics</CardDescription>
            </CardHeader>
            <CardContent className="bg-[#1f1f1f] rounded-lg p-6">
              <UserGrowthChart data={chartData?.userGrowth} />
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-[#f8c017]" />
                Product Categories
              </CardTitle>
              <CardDescription className="text-gray-400">Revenue distribution by category</CardDescription>
            </CardHeader>
            <CardContent className="bg-[#1f1f1f] rounded-lg p-6">
              <CategoryChart data={chartData?.categories} />
            </CardContent>
          </Card>

          {/* Daily Revenue */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#f8c017]" />
                Daily Performance
              </CardTitle>
              <CardDescription className="text-gray-400">This week vs last week comparison</CardDescription>
            </CardHeader>
            <CardContent className="bg-[#1f1f1f] rounded-lg p-6">
              <DailyRevenueChart data={chartData?.dailyRevenue} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Activity and Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Recent Activity */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#f8c017]" />
                Recent Platform Activity
              </CardTitle>
              <CardDescription className="text-gray-400">Latest events and transactions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {stats?.recentActivity?.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start gap-4 p-4 rounded-lg bg-[#1f1f1f] border border-gray-700 hover:border-[#f8c017]/30 transition-colors">
                    <div className={`p-2.5 rounded-full border ${getStatusColor(activity.status)}`}>
                      {getActivityIcon(activity.type, activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {activity.type}
                    </Badge>
                  </div>
                )) || (
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No recent activity</p>
                    <p className="text-sm">Activity will appear here as it happens</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Merchants & Quick Actions */}
          <div className="space-y-6">
            {/* Top Merchants */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#f8c017]" />
                  Top Performers
                </CardTitle>
                <CardDescription className="text-gray-400">Best merchants this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topMerchants?.slice(0, 3).map((merchant, index) => (
                    <div key={merchant.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#1f1f1f] border border-gray-700 hover:border-[#f8c017]/30 transition-colors">
                      <div className="w-10 h-10 bg-linear-to-r from-[#f8c017] to-[#f8c017]/80 text-black rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{merchant.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(merchant.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-[#f8c017] fill-current" />
                          <span className="text-xs font-medium text-white">{merchant.rating}</span>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-6 text-gray-500">
                      <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">Common admin tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button className="w-full text-left p-4 rounded-lg bg-linear-to-r from-[#f8c017]/20 to-[#f8c017]/10 hover:from-[#f8c017]/30 hover:to-[#f8c017]/20 border border-[#f8c017]/30 transition-all duration-300 group">
                    <div className="font-medium text-white group-hover:text-[#f8c017]">Review Applications</div>
                    <div className="text-sm text-gray-400">Pending merchant approvals</div>
                  </button>
                  <button className="w-full text-left p-4 rounded-lg bg-[#1f1f1f] hover:bg-[#2f2f2f] border border-gray-700 hover:border-gray-600 transition-all duration-300 group">
                    <div className="font-medium text-white group-hover:text-[#f8c017]">Generate Report</div>
                    <div className="text-sm text-gray-400">Monthly platform analytics</div>
                  </button>
                  <button className="w-full text-left p-4 rounded-lg bg-[#1f1f1f] hover:bg-[#2f2f2f] border border-gray-700 hover:border-gray-600 transition-all duration-300 group">
                    <div className="font-medium text-white group-hover:text-[#f8c017]">System Health</div>
                    <div className="text-sm text-gray-400">Monitor platform status</div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}