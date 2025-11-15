'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  BarChart3,
  Activity,
  Shield,
  Database,
  Server,
  Settings,
  Download,
  RefreshCw,
  Eye,
  UserPlus,
  Filter,
  Search
} from 'lucide-react';
import { 
  UserGrowthChart,
  SystemHealthChart,
  RevenueChart,
  SalesChart 
} from '@/components/dashboard/charts';
import { AdminStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAdminStats();
  }, [timeRange]);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`/api/admin/dashboard?range=${timeRange}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Administration</h1>
          <p className="text-muted-foreground mt-1">
            Complete platform oversight and management controls
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Reports
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            System Settings
          </Button>
          <Button className="gradient-gold text-black shadow-gold">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="flex items-center p-4">
          <CheckCircle2 className="w-5 h-5 text-primary mr-3" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">All Systems Operational 🚀</h3>
            <p className="text-sm text-muted-foreground">
              Platform performance: 99.8% uptime • API response time: 145ms • Last backup: 15 minutes ago
            </p>
          </div>
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-primary border-primary">CPU: 45%</Badge>
            <Badge variant="outline" className="text-primary border-primary">Memory: 62%</Badge>
            <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Admin Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-gold">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalBusinesses || 0}</div>
            <p className="text-xs text-gray-400">
              <span className="text-brand-gold">+{Math.floor(Math.random() * 5) + 1}</span> new this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-gold">Total Users</CardTitle>
            <Users className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-400">
              <span className="text-brand-gold">+{Math.floor(Math.random() * 15) + 5}</span> new this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-gold">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₦{(stats?.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-400">
              <span className="text-brand-gold">+{stats?.monthlyGrowth || 0}%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-gold">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-gold">99.8%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">Excellent</span> performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{stats?.activeBusinesses || 0}</div>
              <Badge variant="outline" className="text-primary border-primary">
                {((stats?.activeBusinesses || 0) / (stats?.totalBusinesses || 1) * 100).toFixed(1)}% Active
              </Badge>
            </div>
            <div className="mt-2 bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2" 
                   style={{ width: `${(stats?.activeBusinesses || 0) / (stats?.totalBusinesses || 1) * 100}%` }}>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{stats?.pendingApprovals || 0}</div>
              <Badge variant={stats?.pendingApprovals && stats.pendingApprovals > 10 ? "destructive" : "secondary"} className="text-xs">
                {stats?.pendingApprovals && stats.pendingApprovals > 10 ? "High" : "Normal"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Business registrations pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">₦{(stats?.platformRevenue || 0).toLocaleString()}</div>
              <Badge variant="outline" className="text-primary border-primary text-xs">Commission</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Monthly platform earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setTimeRange('7d')} 
                    className={timeRange === '7d' ? 'bg-primary text-primary-foreground' : ''}>
              7D
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('30d')} 
                    className={timeRange === '30d' ? 'bg-primary text-primary-foreground' : ''}>
              30D
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('90d')} 
                    className={timeRange === '90d' ? 'bg-primary text-primary-foreground' : ''}>
              90D
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-brand-gold">
                  Platform Growth
                  <Button variant="ghost" size="sm" className="text-brand-gold hover:bg-brand-gold/10" onClick={fetchAdminStats}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-gray-300">User and business registration trends</CardDescription>
              </CardHeader>
              <CardContent>
                <UserGrowthChart data={stats?.charts?.userGrowth} />
              </CardContent>
            </Card>

            {/* Revenue Trend */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="text-brand-gold">Revenue Analytics</CardTitle>
                <CardDescription className="text-gray-300">Platform revenue and commission tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={stats?.charts?.revenue} />
              </CardContent>
            </Card>

            {/* Pending Business Approvals */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Business Approvals</CardTitle>
                <CardDescription>New business registrations awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'TechCorp Nigeria Ltd', type: 'E-commerce', submitted: '2 hours ago', risk: 'low', revenue: '₦2.5M projected' },
                    { name: 'Mega Retail Solutions', type: 'Retail', submitted: '1 day ago', risk: 'medium', revenue: '₦1.8M projected' },
                    { name: 'QuickShip Logistics', type: 'Manufacturing', submitted: '2 days ago', risk: 'low', revenue: '₦3.2M projected' },
                    { name: 'Urban Fashion Hub', type: 'Fashion', submitted: '3 days ago', risk: 'high', revenue: '₦900K projected' },
                  ].map((business, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                          <Building2 className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{business.name}</p>
                          <p className="text-xs text-muted-foreground">{business.type} • {business.submitted}</p>
                          <p className="text-xs text-primary">{business.revenue}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={business.risk === 'low' ? 'default' : business.risk === 'medium' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {business.risk} risk
                        </Badge>
                        <Button size="sm" variant="outline">Review</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full">View All Pending Approvals</Button>
                </div>
              </CardContent>
            </Card>

            {/* System Alerts & Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>System Monitoring</CardTitle>
                <CardDescription>Critical system notifications and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      type: 'success', 
                      title: 'Backup Completed', 
                      description: 'Daily system backup completed successfully',
                      icon: CheckCircle2,
                      color: 'text-primary',
                      action: 'View',
                      time: '5 min ago'
                    },
                    { 
                      type: 'warning', 
                      title: 'High API Load', 
                      description: 'API response time increased to 180ms (threshold: 200ms)',
                      icon: AlertTriangle,
                      color: 'text-yellow-500',
                      action: 'Monitor',
                      time: '12 min ago'
                    },
                    { 
                      type: 'info', 
                      title: 'Scheduled Maintenance', 
                      description: 'Database optimization scheduled in 2 hours',
                      icon: Clock,
                      color: 'text-blue-500',
                      action: 'Details',
                      time: '1 hour ago'
                    },
                    { 
                      type: 'success', 
                      title: 'Security Scan', 
                      description: 'Weekly security scan completed - No threats found',
                      icon: Shield,
                      color: 'text-primary',
                      action: 'Report',
                      time: '3 hours ago'
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <item.icon className={`w-5 h-5 ${item.color} mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{item.title}</p>
                          <span className="text-xs text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        {item.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="businesses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Business Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performing Businesses</CardTitle>
                <CardDescription>Highest revenue generating businesses this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'TechHub Electronics', revenue: 12500000, orders: 456, growth: '+28%', tier: 'Premium', category: 'Electronics' },
                    { name: 'Fashion Forward', revenue: 8900000, orders: 342, growth: '+22%', tier: 'Standard', category: 'Fashion' },
                    { name: 'Home Essentials', revenue: 7200000, orders: 289, growth: '+18%', tier: 'Premium', category: 'Home & Garden' },
                    { name: 'Sports Center', revenue: 5600000, orders: 198, growth: '+15%', tier: 'Standard', category: 'Sports' },
                    { name: 'Book Paradise', revenue: 3400000, orders: 156, growth: '+12%', tier: 'Basic', category: 'Books' },
                  ].map((business, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 gradient-gold rounded-lg flex items-center justify-center shadow-gold">
                          <span className="text-black font-bold text-lg">{index + 1}</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{business.name}</p>
                            <Badge variant={business.tier === 'Premium' ? 'default' : business.tier === 'Standard' ? 'secondary' : 'outline'} 
                                   className="text-xs">
                              {business.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{business.category} • {business.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₦{business.revenue.toLocaleString()}</p>
                        <p className="text-sm text-primary">{business.growth}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Business Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Business Categories</CardTitle>
                <CardDescription>Distribution by business type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'E-commerce', count: 145, percentage: 42, color: 'bg-primary' },
                    { category: 'Retail', count: 98, percentage: 28, color: 'bg-secondary' },
                    { category: 'Manufacturing', count: 65, percentage: 19, color: 'bg-muted' },
                    { category: 'Services', count: 38, percentage: 11, color: 'bg-accent' },
                  ].map((cat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.category}</span>
                        <span className="text-muted-foreground">{cat.count} ({cat.percentage}%)</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className={`${cat.color} rounded-full h-2 transition-all duration-300`} 
                             style={{ width: `${cat.percentage}%` }}>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Chart */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="text-brand-gold">System Performance</CardTitle>
                <CardDescription className="text-gray-300">Real-time system health monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <SystemHealthChart data={stats?.charts?.systemHealth} />
              </CardContent>
            </Card>

            {/* System Stats */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system status and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">99.8%</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">145ms</div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Database Health</span>
                        <span className="text-primary">Excellent</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '95%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Storage Usage</span>
                        <span>68% (2.1TB/3TB)</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Active Connections</span>
                        <span>1,247 / 2,000</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '62%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Usage</CardTitle>
                <CardDescription>API calls and feature usage analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart data={stats?.charts?.sales} />
              </CardContent>
            </Card>

            {/* Revenue Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Commission and subscription revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-primary">₦2.8M</div>
                      <div className="text-sm text-muted-foreground">Transaction Fees</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-primary">₦1.2M</div>
                      <div className="text-sm text-muted-foreground">Subscriptions</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-primary">₦456K</div>
                      <div className="text-sm text-muted-foreground">Premium Features</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Transaction Commission (2.5%)</span>
                        <span>₦2,847,320</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Monthly Subscriptions</span>
                        <span>₦1,245,000</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '28%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Premium Features</span>
                        <span>₦456,780</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '7%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative Actions</CardTitle>
          <CardDescription>Essential system management and oversight tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Building2 className="w-6 h-6" />
              <span className="text-xs">Manage Businesses</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Users className="w-6 h-6" />
              <span className="text-xs">User Management</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">System Reports</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Settings className="w-6 h-6" />
              <span className="text-xs">Platform Settings</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Database className="w-6 h-6" />
              <span className="text-xs">Database Admin</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Shield className="w-6 h-6" />
              <span className="text-xs">Security Center</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}