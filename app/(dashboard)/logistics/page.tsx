'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Route,
  Users,
  BarChart3,
  Navigation,
  Activity,
  Target,
  Fuel,
  Timer,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  Map,
  Phone,
  Star
} from 'lucide-react';
import { 
  DeliveryPerformanceChart,
  RouteEfficiencyChart,
  SystemHealthChart,
  OrdersChart 
} from '@/components/dashboard/charts';
import { LogisticsStats } from '@/types';

export default function LogisticsDashboard() {
  const [stats, setStats] = useState<LogisticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchLogisticsStats();
  }, [timeRange]);

  const fetchLogisticsStats = async () => {
    try {
      const response = await fetch(`/api/logistics/dashboard?range=${timeRange}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch logistics stats:', error);
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
      {/* Enhanced Logistics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logistics Operations Center</h1>
          <p className="text-muted-foreground mt-1">
            Real-time shipment monitoring, route optimization, and delivery management
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <Map className="w-4 h-4 mr-2" />
            Live Map
          </Button>
          <Button variant="outline">
            <Navigation className="w-4 h-4 mr-2" />
            Route Optimizer
          </Button>
          <Button className="gradient-gold text-black shadow-gold">
            <Truck className="w-4 h-4 mr-2" />
            Dispatch Order
          </Button>
        </div>
      </div>

      {/* Real-time Performance Alert */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="flex items-center p-4">
          <Activity className="w-5 h-5 text-primary mr-3" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Outstanding Delivery Performance! 🚛</h3>
            <p className="text-sm text-muted-foreground">
              96.5% on-time delivery rate this week • 15% faster than last month • 2 new regions added
            </p>
          </div>
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-primary border-primary">Next milestone: 97%</Badge>
            <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Logistics Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.activeShipments || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">{stats?.pendingPickups || 0}</span> pending pickup
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.deliveredToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">{stats?.onTimeDeliveryRate || 0}%</span> on-time rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.averageDeliveryTime || 0}h</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">-0.5h</span> vs last week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalDrivers || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">{stats?.regionsServed || 0}</span> regions covered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">87.3%</div>
              <Badge variant="outline" className="text-primary border-primary">Target: 85%</Badge>
            </div>
            <div className="mt-2 bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2" style={{ width: '87.3%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Route Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">94.2%</div>
              <Badge variant="secondary" className="text-xs">Optimized</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-primary">+3.2%</span> improvement this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">4.7/5</div>
              <Badge variant="outline" className="text-primary border-primary text-xs">Excellent</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Based on delivery feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="operations" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
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

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Shipments with Real-time Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Active Shipments
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>Real-time shipment tracking and status updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      id: 'SHP-001', 
                      destination: 'Victoria Island, Lagos', 
                      driver: 'Ahmed Musa', 
                      status: 'in_transit', 
                      eta: '2:30 PM',
                      progress: 75,
                      distance: '12km remaining',
                      priority: 'high'
                    },
                    { 
                      id: 'SHP-002', 
                      destination: 'Wuse 2, Abuja', 
                      driver: 'Blessing Okoro', 
                      status: 'pickup', 
                      eta: '4:00 PM',
                      progress: 25,
                      distance: 'At warehouse',
                      priority: 'medium'
                    },
                    { 
                      id: 'SHP-003', 
                      destination: 'GRA, Port Harcourt', 
                      driver: 'Kemi Adebayo', 
                      status: 'delivered', 
                      eta: 'Completed',
                      progress: 100,
                      distance: 'Delivered',
                      priority: 'low'
                    },
                    { 
                      id: 'SHP-004', 
                      destination: 'Ikeja, Lagos', 
                      driver: 'John Okafor', 
                      status: 'delayed', 
                      eta: '6:15 PM',
                      progress: 60,
                      distance: 'Traffic delay',
                      priority: 'urgent'
                    },
                  ].map((shipment) => (
                    <div key={shipment.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                          <Truck className="w-5 h-5 text-black" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{shipment.id}</p>
                            <Badge 
                              variant={
                                shipment.priority === 'urgent' ? 'destructive' :
                                shipment.priority === 'high' ? 'default' : 'outline'
                              }
                              className="text-xs"
                            >
                              {shipment.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{shipment.destination}</p>
                          <p className="text-xs text-muted-foreground">Driver: {shipment.driver}</p>
                          <p className="text-xs text-primary">{shipment.distance}</p>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${shipment.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            shipment.status === 'delivered' ? 'default' :
                            shipment.status === 'in_transit' ? 'secondary' :
                            shipment.status === 'pickup' ? 'outline' : 'destructive'
                          }
                          className="text-xs mb-1"
                        >
                          {shipment.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{shipment.eta}</p>
                        <Button variant="ghost" size="sm" className="text-xs mt-1">
                          <Phone className="w-3 h-3 mr-1" />
                          Contact
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full">View All Shipments</Button>
                </div>
              </CardContent>
            </Card>

            {/* Route Optimization & Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Route Intelligence</CardTitle>
                <CardDescription>AI-powered optimization and real-time alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      type: 'optimization', 
                      title: 'Route Optimization Available', 
                      description: 'Optimize 3 routes in Lagos for 15% time savings',
                      icon: Route,
                      color: 'text-primary',
                      action: 'Optimize',
                      impact: '15% faster'
                    },
                    { 
                      type: 'alert', 
                      title: 'Traffic Alert', 
                      description: 'Heavy traffic on Third Mainland Bridge affecting 2 shipments',
                      icon: AlertTriangle,
                      color: 'text-yellow-500',
                      action: 'Reroute',
                      impact: '30min delay'
                    },
                    { 
                      type: 'success', 
                      title: 'Delivery Milestone', 
                      description: '12 deliveries completed ahead of schedule today',
                      icon: CheckCircle2,
                      color: 'text-primary',
                      action: 'Review',
                      impact: 'Ahead of target'
                    },
                    { 
                      type: 'maintenance', 
                      title: 'Vehicle Maintenance', 
                      description: 'VAN-007 due for maintenance in 2 days',
                      icon: AlertTriangle,
                      color: 'text-orange-500',
                      action: 'Schedule',
                      impact: 'Preventive'
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <item.icon className={`w-5 h-5 ${item.color} mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{item.title}</p>
                          <Badge variant="outline" className="text-xs">{item.impact}</Badge>
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

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
                <CardDescription>Delivery success rate by region</CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryPerformanceChart />
              </CardContent>
            </Card>

            {/* Route Efficiency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Route Optimization Progress</CardTitle>
                <CardDescription>Weekly efficiency improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <RouteEfficiencyChart />
              </CardContent>
            </Card>

            {/* Performance KPIs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key logistics performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">96.5%</div>
                    <div className="text-sm font-medium">On-Time Delivery</div>
                    <div className="text-xs text-muted-foreground mt-1">Target: 95%</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">2.3h</div>
                    <div className="text-sm font-medium">Avg Delivery Time</div>
                    <div className="text-xs text-muted-foreground mt-1">15% improvement</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">1.2%</div>
                    <div className="text-sm font-medium">Failed Delivery Rate</div>
                    <div className="text-xs text-muted-foreground mt-1">Down from 1.8%</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">4.7★</div>
                    <div className="text-sm font-medium">Customer Rating</div>
                    <div className="text-xs text-muted-foreground mt-1">Delivery satisfaction</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fleet Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Fleet Management</CardTitle>
                <CardDescription>Real-time vehicle tracking and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: 'VAN-001', driver: 'Ahmed Musa', status: 'active', location: 'Victoria Island', fuel: 78, mileage: '12,450km', rating: 4.8 },
                    { id: 'VAN-002', driver: 'Blessing Okoro', status: 'active', location: 'Wuse 2', fuel: 45, mileage: '8,230km', rating: 4.9 },
                    { id: 'VAN-003', driver: 'Kemi Adebayo', status: 'maintenance', location: 'Depot', fuel: 92, mileage: '15,670km', rating: 4.6 },
                    { id: 'VAN-004', driver: 'John Okafor', status: 'active', location: 'Ikeja', fuel: 23, mileage: '9,840km', rating: 4.7 },
                    { id: 'VAN-005', driver: 'Sarah Ibrahim', status: 'offline', location: 'Depot', fuel: 88, mileage: '6,120km', rating: 4.9 },
                  ].map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 gradient-gold rounded-lg flex items-center justify-center shadow-gold">
                          <Truck className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{vehicle.id}</p>
                            <Badge 
                              variant={
                                vehicle.status === 'active' ? 'default' :
                                vehicle.status === 'maintenance' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {vehicle.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Driver: {vehicle.driver}</p>
                          <p className="text-sm text-muted-foreground">Location: {vehicle.location}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < Math.floor(vehicle.rating) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{vehicle.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <Fuel className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{vehicle.fuel}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{vehicle.mileage}</p>
                        <Button variant="ghost" size="sm" className="text-xs mt-1">
                          Track
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fleet Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Fleet Stats</CardTitle>
                <CardDescription>Current fleet overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">24</div>
                    <div className="text-sm text-muted-foreground">Total Vehicles</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Active</span>
                        <span>18 (75%)</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Maintenance</span>
                        <span>3 (12.5%)</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-yellow-500 rounded-full h-2" style={{ width: '12.5%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Offline</span>
                        <span>3 (12.5%)</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-muted-foreground rounded-full h-2" style={{ width: '12.5%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">89.2%</div>
                      <div className="text-sm text-muted-foreground">Fleet Utilization</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operations Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Operational Trends</CardTitle>
                <CardDescription>Weekly performance and delivery trends</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersChart />
              </CardContent>
            </Card>

            {/* Cost Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Logistics cost breakdown and optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-primary">₦850K</div>
                      <div className="text-sm text-muted-foreground">Fuel Costs</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-primary">₦320K</div>
                      <div className="text-sm text-muted-foreground">Maintenance</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-primary">₦180K</div>
                      <div className="text-sm text-muted-foreground">Salaries</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Fuel (63%)</span>
                        <span>₦850,000</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '63%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Maintenance (24%)</span>
                        <span>₦320,000</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-secondary rounded-full h-2" style={{ width: '24%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Salaries (13%)</span>
                        <span>₦180,000</span>
                      </div>
                      <div className="mt-1 bg-muted rounded-full h-2">
                        <div className="bg-muted-foreground rounded-full h-2" style={{ width: '13%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional Coverage */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Regional Coverage & Performance</CardTitle>
                <CardDescription>Delivery zones and regional performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      region: 'Lagos State',
                      deliveries: 1234,
                      onTime: 94.5,
                      avgTime: '2.5h',
                      status: 'excellent',
                      growth: '+12%'
                    },
                    {
                      region: 'Abuja FCT',
                      deliveries: 567,
                      onTime: 91.2,
                      avgTime: '3.1h',
                      status: 'good',
                      growth: '+8%'
                    },
                    {
                      region: 'Rivers State',
                      deliveries: 234,
                      onTime: 87.8,
                      avgTime: '4.2h',
                      status: 'needs_improvement',
                      growth: '+5%'
                    }
                  ].map((region, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">{region.region}</h3>
                        <div className="flex space-x-1">
                          <Badge 
                            variant={
                              region.status === 'excellent' ? 'default' :
                              region.status === 'good' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {region.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-primary">{region.growth}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Deliveries:</span>
                          <span className="font-medium">{region.deliveries}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>On-time rate:</span>
                          <span className="font-medium">{region.onTime}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Avg. time:</span>
                          <span className="font-medium">{region.avgTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Logistics Command Center</CardTitle>
          <CardDescription>Essential logistics management and operational tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Truck className="w-6 h-6" />
              <span className="text-xs">Dispatch</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Route className="w-6 h-6" />
              <span className="text-xs">Route Plan</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <MapPin className="w-6 h-6" />
              <span className="text-xs">Track Orders</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Performance</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Users className="w-6 h-6" />
              <span className="text-xs">Drivers</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Navigation className="w-6 h-6" />
              <span className="text-xs">Live Map</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}