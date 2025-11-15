'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  User,
  TrendingUp,
  Target,
  Calendar,
  Star,
  MessageCircle,
  FileText,
  Award,
  Activity,
  BarChart3,
  Users,
  Timer,
  Truck,
  MapPin,
  Phone,
  Filter,
  Search,
  Download,
  RefreshCw,
  Bell,
  Zap
} from 'lucide-react';
import { 
  SalesChart,
  OrdersChart,
  SystemHealthChart 
} from '@/components/dashboard/charts';
import { StaffStats } from '@/types';

export default function StaffDashboard() {
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchStaffStats();
  }, [timeRange]);

  const fetchStaffStats = async () => {
    try {
      const response = await fetch(`/api/staff/dashboard?range=${timeRange}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch staff stats:', error);
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
      {/* Enhanced Staff Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Operations Hub</h1>
          <p className="text-muted-foreground mt-1">
            Task management, performance tracking, and team coordination
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Team Chat
          </Button>
          <Button className="gradient-gold text-black shadow-gold">
            <Package className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Staff Performance Alert */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="flex items-center p-4">
          <Award className="w-5 h-5 text-primary mr-3" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Excellent Team Performance! 🌟</h3>
            <p className="text-sm text-muted-foreground">
              98.2% task completion rate this week • 15% above target • 3 staff members earned performance bonus
            </p>
          </div>
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-primary border-primary">Top performer: Sarah Johnson</Badge>
            <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Staff Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.activeTasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">{stats?.urgentTasks || 0}</span> urgent
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.completedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">{stats?.completionRate || 0}%</span> completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.averageResponseTime || 0}m</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">-5m</span> vs last week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.teamRating || 0}/5</div>
            <p className="text-xs text-muted-foreground">
              Customer satisfaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">142%</div>
              <Badge variant="outline" className="text-primary border-primary">Above target</Badge>
            </div>
            <div className="mt-2 bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2" style={{ width: '100%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">96.8%</div>
              <Badge variant="secondary" className="text-xs">Excellent</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-primary">+2.1%</span> improvement this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">94.5%</div>
              <Badge variant="outline" className="text-primary border-primary text-xs">Target: 90%</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Consistently above target</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
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

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Tasks with Priority Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  My Active Tasks
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Current assigned tasks and their priorities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      id: 'TSK-001', 
                      title: 'Process bulk order shipment', 
                      customer: 'TechHub Lagos', 
                      priority: 'urgent', 
                      deadline: '2:00 PM today',
                      progress: 85,
                      type: 'order_processing',
                      estimatedTime: '15 min'
                    },
                    { 
                      id: 'TSK-002', 
                      title: 'Customer support inquiry', 
                      customer: 'Fashion Store Abuja', 
                      priority: 'high', 
                      deadline: '5:00 PM today',
                      progress: 60,
                      type: 'customer_support',
                      estimatedTime: '30 min'
                    },
                    { 
                      id: 'TSK-003', 
                      title: 'Quality check pending items', 
                      customer: 'Electronics Plus', 
                      priority: 'medium', 
                      deadline: 'Tomorrow 10:00 AM',
                      progress: 25,
                      type: 'quality_check',
                      estimatedTime: '45 min'
                    },
                    { 
                      id: 'TSK-004', 
                      title: 'Update inventory tracking', 
                      customer: 'Internal', 
                      priority: 'low', 
                      deadline: 'This week',
                      progress: 10,
                      type: 'inventory',
                      estimatedTime: '60 min'
                    },
                  ].map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                          <Package className="w-5 h-5 text-black" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{task.title}</p>
                            <Badge 
                              variant={
                                task.priority === 'urgent' ? 'destructive' :
                                task.priority === 'high' ? 'default' : 
                                task.priority === 'medium' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Customer: {task.customer}</p>
                          <p className="text-xs text-muted-foreground">Deadline: {task.deadline}</p>
                          <p className="text-xs text-primary">Est. time: {task.estimatedTime}</p>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs mb-2">
                          {task.progress}% complete
                        </Badge>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" className="text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Update
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full">View All Tasks</Button>
                </div>
              </CardContent>
            </Card>

            {/* Task Categories & Workload */}
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
                <CardDescription>Current workload by category and type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">12</div>
                      <div className="text-sm text-muted-foreground">Order Processing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">7</div>
                      <div className="text-sm text-muted-foreground">Customer Support</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">5</div>
                      <div className="text-sm text-muted-foreground">Quality Check</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">3</div>
                      <div className="text-sm text-muted-foreground">Inventory</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Order Processing (44%)</span>
                        <span>12 tasks</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '44%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Customer Support (26%)</span>
                        <span>7 tasks</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-secondary rounded-full h-2" style={{ width: '26%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quality Check (18%)</span>
                        <span>5 tasks</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-accent rounded-full h-2" style={{ width: '18%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Inventory (12%)</span>
                        <span>3 tasks</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-muted-foreground rounded-full h-2" style={{ width: '12%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">27</div>
                      <div className="text-sm text-muted-foreground">Total Active Tasks</div>
                      <Badge variant="outline" className="mt-2">Manageable workload</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Weekly performance and productivity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart />
              </CardContent>
            </Card>

            {/* Task Completion Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Rate</CardTitle>
                <CardDescription>Daily task completion progress</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersChart />
              </CardContent>
            </Card>

            {/* Personal KPIs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personal Key Performance Indicators</CardTitle>
                <CardDescription>Your individual performance metrics and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">98.2%</div>
                    <div className="text-sm font-medium">Task Completion</div>
                    <div className="text-xs text-muted-foreground mt-1">Target: 95%</div>
                    <Badge variant="outline" className="mt-2 text-primary border-primary">Exceeding</Badge>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">4.8★</div>
                    <div className="text-sm font-medium">Customer Rating</div>
                    <div className="text-xs text-muted-foreground mt-1">Based on feedback</div>
                    <Badge variant="outline" className="mt-2 text-primary border-primary">Excellent</Badge>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">8.5m</div>
                    <div className="text-sm font-medium">Avg Response Time</div>
                    <div className="text-xs text-muted-foreground mt-1">25% faster</div>
                    <Badge variant="outline" className="mt-2 text-primary border-primary">Outstanding</Badge>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">127%</div>
                    <div className="text-sm font-medium">Productivity Index</div>
                    <div className="text-xs text-muted-foreground mt-1">Above expectations</div>
                    <Badge variant="outline" className="mt-2 text-primary border-primary">Top Performer</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Members & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Team Status</CardTitle>
                <CardDescription>Current team availability and workload</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Sarah Johnson', role: 'Senior Staff', status: 'available', tasks: 8, rating: 4.9, location: 'Lagos Office' },
                    { name: 'Michael Chen', role: 'Staff Member', status: 'busy', tasks: 12, rating: 4.7, location: 'Abuja Office' },
                    { name: 'Fatima Abdul', role: 'Staff Member', status: 'available', tasks: 6, rating: 4.8, location: 'Lagos Office' },
                    { name: 'David Okon', role: 'Junior Staff', status: 'break', tasks: 4, rating: 4.5, location: 'PH Office' },
                    { name: 'Grace Eze', role: 'Staff Member', status: 'available', tasks: 9, rating: 4.9, location: 'Lagos Office' },
                  ].map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                          <User className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{member.name}</p>
                            <Badge 
                              variant={
                                member.status === 'available' ? 'default' :
                                member.status === 'busy' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {member.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{member.role} • {member.location}</p>
                          <p className="text-xs text-muted-foreground">{member.tasks} active tasks</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < Math.floor(member.rating) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{member.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="text-xs">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Summary</CardTitle>
                <CardDescription>Overall team metrics and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">5</div>
                      <div className="text-sm text-muted-foreground">Team Members</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">4.7★</div>
                      <div className="text-sm text-muted-foreground">Avg Rating</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">39 tasks</div>
                      <div className="text-sm text-muted-foreground">Total Active</div>
                    </div>
                    
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">156 tasks</div>
                      <div className="text-sm text-muted-foreground">Completed This Week</div>
                    </div>
                    
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">96.8%</div>
                      <div className="text-sm text-muted-foreground">Team Efficiency</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity Analytics</CardTitle>
                <CardDescription>Detailed productivity and efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <SystemHealthChart />
              </CardContent>
            </Card>

            {/* Time Management Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Time Management</CardTitle>
                <CardDescription>Task duration and efficiency analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-primary">6.5h</div>
                      <div className="text-sm text-muted-foreground">Avg Daily Work</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-primary">15.2m</div>
                      <div className="text-sm text-muted-foreground">Avg Task Time</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Order Processing (45%)</span>
                        <span>2.9h daily</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Customer Support (30%)</span>
                        <span>1.95h daily</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-secondary rounded-full h-2" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quality Control (15%)</span>
                        <span>0.97h daily</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-accent rounded-full h-2" style={{ width: '15%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Administration (10%)</span>
                        <span>0.65h daily</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div className="bg-muted-foreground rounded-full h-2" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Development */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Skills Development & Training</CardTitle>
                <CardDescription>Professional development and skill enhancement progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Customer Service</h3>
                      <Badge variant="default" className="text-xs">Expert</Badge>
                    </div>
                    <div className="bg-muted rounded-full h-2 mb-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: '95%' }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground">95% proficiency • Advanced certification</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Order Processing</h3>
                      <Badge variant="secondary" className="text-xs">Advanced</Badge>
                    </div>
                    <div className="bg-muted rounded-full h-2 mb-2">
                      <div className="bg-secondary rounded-full h-2" style={{ width: '88%' }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground">88% proficiency • Certification in progress</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Quality Control</h3>
                      <Badge variant="outline" className="text-xs">Intermediate</Badge>
                    </div>
                    <div className="bg-muted rounded-full h-2 mb-2">
                      <div className="bg-accent rounded-full h-2" style={{ width: '72%' }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground">72% proficiency • Training recommended</p>
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
          <CardTitle>Staff Tools & Actions</CardTitle>
          <CardDescription>Essential tools and quick actions for daily operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Package className="w-6 h-6" />
              <span className="text-xs">New Task</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-xs">Complete</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">Support</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <FileText className="w-6 h-6" />
              <span className="text-xs">Reports</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Users className="w-6 h-6" />
              <span className="text-xs">Team Chat</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}