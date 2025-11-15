'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Truck,
  BarChart3,
  Plus,
  Eye,
  Target,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  RevenueChart, 
  SalesChart, 
  CategoryChart, 
  OrdersChart, 
  DailyRevenueChart 
} from '@/components/dashboard/charts';
import { MerchantStats } from '@/types';
export default function MerchantDashboard() {
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchMerchantStats();
  }, [timeRange]);

  const fetchMerchantStats = async () => {
    try {
      const response = await fetch(`/api/merchant/dashboard?range=${timeRange}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch merchant stats:', error);
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
      {/* Enhanced Merchant Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">Merchant Dashboard</h1>
          <p className="text-gray-300 mt-1">
            Comprehensive business analytics and operations management
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" className="text-brand-gold border-brand-gold hover:bg-brand-gold/10">
            <Calendar className="w-4 h-4 mr-2" />
            {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Button>
          <Button variant="outline" size="sm" className="text-brand-gold border-brand-gold hover:bg-brand-gold/10">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="text-brand-gold border-brand-gold hover:bg-brand-gold/10">
            <Eye className="w-4 h-4 mr-2" />
            View Storefront
          </Button>
          <Button className="gradient-gold text-black shadow-gold hover:shadow-gold-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Performance Alert */}
      <Card className="border-l-4 border-l-brand-gold bg-gradient-black shadow-gold">
        <CardContent className="flex items-center p-4">
          <TrendingUp className="w-5 h-5 text-brand-gold mr-3" />
          <div className="flex-1">
            <h3 className="font-semibold text-brand-gold">Outstanding Performance! 📈</h3>
            <p className="text-sm text-gray-300">
              Your sales are up 23% this week. Revenue target for this month: 85% completed.
            </p>
          </div>
          <Button variant="outline" size="sm" className="text-brand-gold border-brand-gold hover:bg-brand-gold hover:text-brand-black">
            View Details
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₦{(stats?.monthlyRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              <span className="text-primary">+{stats?.growthRate || 0}%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              <span className="text-primary">+{Math.floor(Math.random() * 20) + 5}</span> this week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₦{(stats?.averageOrderValue || 25500).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowDownRight className="h-3 w-3 text-destructive mr-1" />
              <span className="text-destructive">-2.5%</span> vs last week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{(stats?.customerSatisfaction || 4.8).toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              <span className="text-primary">Excellent</span> rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{(stats?.conversionRate || 3.2).toFixed(1)}%</div>
              <Badge variant="outline" className="text-primary border-primary">Industry Avg: 2.8%</Badge>
            </div>
            <div className="mt-2 bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2" style={{ width: `${(stats?.conversionRate || 3.2) * 10}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
              <Badge variant="destructive" className="text-xs">{stats?.lowStockItems || 0} Low Stock</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-primary">+{Math.floor(Math.random() * 8) + 2}</span> added this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{stats?.activeCustomers || 0}</div>
              <Badge variant="secondary" className="text-xs">Growing</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-primary">+{Math.floor(Math.random() * 15) + 5}</span> new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
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
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-brand-gold">
                  Revenue Trend
                  <Button variant="ghost" size="sm" className="text-brand-gold hover:bg-brand-gold/10" onClick={fetchMerchantStats}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-gray-300">Monthly revenue performance and growth</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={stats?.charts?.revenue} />
              </CardContent>
            </Card>

            {/* Sales Performance */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="text-brand-gold">Sales Performance</CardTitle>
                <CardDescription className="text-gray-300">Monthly sales volume and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart data={stats?.charts?.sales} />
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: '#ORD-001', customer: 'John Doe', amount: 45000, status: 'delivered', items: 3, time: '2 hours ago', rating: 5 },
                    { id: '#ORD-002', customer: 'Jane Smith', amount: 32000, status: 'shipped', items: 2, time: '4 hours ago', rating: null },
                    { id: '#ORD-003', customer: 'Mike Johnson', amount: 67500, status: 'processing', items: 5, time: '6 hours ago', rating: null },
                    { id: '#ORD-004', customer: 'Sarah Wilson', amount: 23000, status: 'pending', items: 1, time: '8 hours ago', rating: null },
                  ].map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                          <ShoppingCart className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.customer}</p>
                          <p className="text-xs text-muted-foreground">{order.id} • {order.items} items</p>
                          {order.rating && (
                            <div className="flex items-center space-x-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < order.rating! ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₦{order.amount.toLocaleString()}</p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'shipped' ? 'secondary' :
                              order.status === 'processing' ? 'outline' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{order.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full">View All Orders</Button>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Alerts & Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Business Insights</CardTitle>
                <CardDescription>Actionable insights and opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      type: 'opportunity', 
                      title: 'High Demand Product', 
                      description: 'Wireless Earbuds are trending +150% this week',
                      icon: TrendingUp,
                      color: 'text-primary',
                      action: 'Restock',
                      priority: 'high'
                    },
                    { 
                      type: 'alert', 
                      title: 'Low Stock Alert', 
                      description: 'iPhone 14 Pro - Only 5 units left',
                      icon: AlertCircle,
                      color: 'text-destructive',
                      action: 'Order Now',
                      priority: 'urgent'
                    },
                    { 
                      type: 'info', 
                      title: 'Customer Feedback', 
                      description: 'New positive review for Samsung Galaxy S24',
                      icon: Star,
                      color: 'text-primary',
                      action: 'View',
                      priority: 'low'
                    },
                    { 
                      type: 'success', 
                      title: 'Stock Received', 
                      description: 'MacBook Air M2 - 25 units added to inventory',
                      icon: CheckCircle2,
                      color: 'text-primary',
                      action: 'Confirm',
                      priority: 'medium'
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <item.icon className={`w-5 h-5 ${item.color} mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{item.title}</p>
                          <Badge 
                            variant={
                              item.priority === 'urgent' ? 'destructive' :
                              item.priority === 'high' ? 'default' : 'outline'
                            }
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="text-brand-gold">Sales by Category</CardTitle>
                <CardDescription className="text-gray-300">Product category performance breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart data={stats?.charts?.categories} />
              </CardContent>
            </Card>

            {/* Daily Revenue Comparison */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="text-brand-gold">Daily Revenue Comparison</CardTitle>
                <CardDescription className="text-gray-300">Current week vs previous week</CardDescription>
              </CardHeader>
              <CardContent>
                <DailyRevenueChart data={stats?.charts?.dailyRevenue} />
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Best selling products this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'iPhone 14 Pro', sales: 45, revenue: 1350000, growth: '+23%', image: '📱' },
                    { name: 'Samsung Galaxy S24', sales: 38, revenue: 1140000, growth: '+18%', image: '📱' },
                    { name: 'MacBook Air M2', sales: 22, revenue: 1100000, growth: '+31%', image: '💻' },
                    { name: 'AirPods Pro', sales: 67, revenue: 805000, growth: '+45%', image: '🎧' },
                    { name: 'iPad Air', sales: 28, revenue: 784000, growth: '+12%', image: '📱' },
                  ].map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{product.image}</div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sales} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₦{product.revenue.toLocaleString()}</p>
                        <p className="text-sm text-primary">{product.growth}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Performance */}
            <Card className="border-brand-black/20 bg-gradient-black shadow-gold">
              <CardHeader>
                <CardTitle className="text-brand-gold">Weekly Performance</CardTitle>
                <CardDescription className="text-gray-300">Orders processed vs delivery success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersChart data={stats?.charts?.orders} />
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
                <CardDescription>Essential business metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Order Fulfillment Rate</span>
                      <span>96.8%</span>
                    </div>
                    <div className="mt-2 bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: '96.8%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Customer Retention</span>
                      <span>84.2%</span>
                    </div>
                    <div className="mt-2 bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: '84.2%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Return Rate</span>
                      <span>2.1%</span>
                    </div>
                    <div className="mt-2 bg-muted rounded-full h-2">
                      <div className="bg-destructive rounded-full h-2" style={{ width: '2.1%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Inventory Turnover</span>
                      <span>78.5%</span>
                    </div>
                    <div className="mt-2 bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: '78.5%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Streamline your daily business operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Package className="w-6 h-6" />
              <span className="text-xs">Add Product</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <ShoppingCart className="w-6 h-6" />
              <span className="text-xs">Process Orders</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Sales Report</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Truck className="w-6 h-6" />
              <span className="text-xs">Track Shipments</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Users className="w-6 h-6" />
              <span className="text-xs">Customer Support</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Activity className="w-6 h-6" />
              <span className="text-xs">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}