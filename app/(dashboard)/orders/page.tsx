'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  Plus,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Star,
  TrendingUp,
  DollarSign,
  PackageCheck,
  Timer,
  ShoppingBag,
  FileText,
  Copy,
  Send,
  Zap,
  Settings,
  CreditCard,
  MapIcon,
  Target
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, User as UserType } from '@/types';

interface OrderActionModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  currentUser: UserType | null;
}

// Comprehensive Order Action Modal Component
function OrderActionModal({ order, isOpen, onClose, onUpdate, currentUser }: OrderActionModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setTrackingNumber(order.trackingNumber || '');
    }
  }, [order]);

  const handleStatusUpdate = async () => {
    if (!order || !newStatus) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          note: statusNote,
          updatedBy: currentUser?.id,
        }),
      });

      if (response.ok) {
        onUpdate();
        setStatusNote('');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomerMessage = async () => {
    if (!order) return;

    try {
      await fetch(`/api/orders/${order.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: customerNote,
          fromUser: currentUser?.id,
        }),
      });
      setCustomerNote('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-primary" />
            <span>Order {order.orderNumber} - Quick Actions</span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive order management center for admin and logistics teams
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          {/* Order Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{order.customer?.name || order.customerName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{order.customer?.email || order.customerEmail || 'No email'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{order.customer?.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {typeof order.shippingAddress === 'string' 
                        ? order.shippingAddress 
                        : `${order.shippingAddress?.street || ''} ${order.shippingAddress?.city || ''}`.trim() || 'No address'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">₦{order.totalAmount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium">{order.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="capitalize">
                      {order.status.toLowerCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Status Management Tab */}
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Update Order Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-status">New Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="SHIPPED">Shipped</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tracking-number">Tracking Number</Label>
                    <Input
                      id="tracking-number"
                      value={trackingNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status-note">Update Note</Label>
                  <Textarea
                    id="status-note"
                    value={statusNote}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStatusNote(e.target.value)}
                    placeholder="Add a note about this status update..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleStatusUpdate} 
                  disabled={updating || !newStatus}
                  className="w-full gradient-gold text-black shadow-gold"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PackageCheck className="w-4 h-4" />
                  <span>Order Items ({order.items?.length || 0})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                            <div className="text-sm text-muted-foreground">{item.product?.sku || 'No SKU'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₦{item.unitPrice?.toLocaleString() || '0'}</TableCell>
                        <TableCell>₦{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="w-4 h-4" />
                  <span>Shipment Tracking</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tracking Number</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="font-mono bg-muted px-2 py-1 rounded">
                        {order.trackingNumber || 'Not assigned'}
                      </span>
                      {order.trackingNumber && (
                        <Button variant="ghost" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Label>Carrier</Label>
                    <div className="mt-1">
                      <Badge variant="outline">TBD</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Shipping Timeline</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm">Order Placed - {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    {order.status !== 'PENDING' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Processing Started</span>
                      </div>
                    )}
                    {order.status === 'SHIPPED' || order.status === 'DELIVERED' ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Package Shipped</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-sm text-muted-foreground">Package Shipped</span>
                      </div>
                    )}
                    {order.status === 'DELIVERED' ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Delivered</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-sm text-muted-foreground">Delivered</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Customer Communication</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer-message">Send Message to Customer</Label>
                  <Textarea
                    id="customer-message"
                    value={customerNote}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomerNote(e.target.value)}
                    placeholder="Type your message to the customer..."
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleCustomerMessage}
                    disabled={!customerNote.trim()}
                    className="gradient-gold text-black shadow-gold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Customer
                  </Button>
                  <Button variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <Label>Quick Actions</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Invoice
                    </Button>
                    <Button variant="outline" size="sm">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Process Refund
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate Order
                    </Button>
                    <Button variant="outline" size="sm">
                      <Target className="w-4 h-4 mr-2" />
                      Mark Priority
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Orders Page Component
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchCurrentUser();
  }, [statusFilter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter !== 'all' ? statusFilter : '',
      });

      const response = await fetch(`/api/orders?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'PROCESSING': return <Package className="w-4 h-4" />;
      case 'SHIPPED': return <Truck className="w-4 h-4" />;
      case 'DELIVERED': return <CheckCircle2 className="w-4 h-4" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'PROCESSING': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'SHIPPED': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'DELIVERED': return 'text-green-600 bg-green-50 border-green-200';
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  };

  const handleOrderAction = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const canManageOrders = currentUser?.role === 'ADMIN' || currentUser?.role === 'LOGISTICS';

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
    <>
      <div className="min-h-screen bg-brand-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Orders Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-gold">Orders Management</h1>
            <p className="text-gray-400 mt-1">
              Comprehensive order tracking, processing, and fulfillment management
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filter
            </Button>
            <Button className="gradient-gold text-black shadow-gold font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

        {/* Orders Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{orderStats.total}</div>
              <p className="text-xs text-gray-400">All time</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{orderStats.pending}</div>
              <p className="text-xs text-gray-400">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Processing</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{orderStats.processing}</div>
              <p className="text-xs text-gray-400">Being prepared</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Shipped</CardTitle>
              <Truck className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{orderStats.shipped}</div>
              <p className="text-xs text-gray-400">In transit</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Delivered</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{orderStats.delivered}</div>
              <p className="text-xs text-gray-400">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{orderStats.cancelled}</div>
              <p className="text-xs text-gray-400">Cancelled orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search orders by ID, customer name..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  <Filter className="w-4 h-4 mr-2" />
                  Status: {statusFilter === 'all' ? 'All' : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="text-white hover:bg-gray-700">All Orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('PENDING')} className="text-white hover:bg-gray-700">Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('PROCESSING')} className="text-white hover:bg-gray-700">Processing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('SHIPPED')} className="text-white hover:bg-gray-700">Shipped</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('DELIVERED')} className="text-white hover:bg-gray-700">Delivered</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('CANCELLED')} className="text-white hover:bg-gray-700">Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Orders Table */}
        <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
          <CardHeader>
            <CardTitle className="text-brand-gold">Orders List</CardTitle>
            <CardDescription className="text-gray-400">
              Manage and track all customer orders
              {canManageOrders && (
                <span className="text-brand-gold"> • Click on any order for advanced actions</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-brand-gold">Order ID</TableHead>
                  <TableHead className="text-brand-gold">Customer</TableHead>
                  <TableHead className="text-brand-gold">Products</TableHead>
                  <TableHead className="text-brand-gold">Amount</TableHead>
                  <TableHead className="text-brand-gold">Status</TableHead>
                  <TableHead className="text-brand-gold">Date</TableHead>
                  <TableHead className="text-brand-gold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow className="border-gray-700">
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className={`border-gray-700 hover:bg-gray-800/50 ${canManageOrders ? 'cursor-pointer' : ''}`}
                      onClick={() => canManageOrders && handleOrderAction(order)}
                    >
                      <TableCell className="font-medium text-white">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 gradient-gold rounded-full flex items-center justify-center shadow-gold">
                            <User className="w-4 h-4 text-black" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-white">{order.customer?.name || order.customerName || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{order.customer?.email || order.customerEmail || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <PackageCheck className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">{order.items?.length || 0} items</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-brand-gold">₦{order.totalAmount?.toLocaleString() || '0'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(order.status)} flex items-center space-x-1`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.toLowerCase()}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          {canManageOrders ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOrderAction(order)}
                              className="gradient-gold text-black shadow-gold hover:scale-105 transition-transform"
                            >
                              <Zap className="w-4 h-4 mr-1" />
                              Quick Actions
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Contact Customer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Order Action Modal */}
      <OrderActionModal
        order={selectedOrder}
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onUpdate={fetchOrders}
        currentUser={currentUser}
      />
        </div>
      </div>
    </>
  );
}