import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, DollarSign, Mail, Phone, Globe, MoreHorizontal } from 'lucide-react';
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

interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  type: string;
  isActive: boolean;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  createdAt: string;
  lastOrderAt?: string;
}

interface MerchantsData {
  businesses: Business[];
  stats: {
    totalBusinesses: number;
    activeBusinesses: number;
    inactiveBusinesses: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalOrders: number;
  };
}

async function getMerchantsData(): Promise<MerchantsData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/merchants`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch merchants data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching merchants data:', error);
    // Fallback data
    return {
      businesses: [],
      stats: {
        totalBusinesses: 0,
        activeBusinesses: 0,
        inactiveBusinesses: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0,
      },
    };
  }
}

export default async function AdminMerchantsPage() {
  const data = await getMerchantsData();

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Merchant Management</h1>
            <p className="text-gray-400">Manage and monitor all merchant businesses</p>
          </div>
          <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
            Add New Merchant
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Merchants</CardTitle>
              <Building2 className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.stats.totalBusinesses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Active</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.stats.activeBusinesses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Inactive</CardTitle>
              <Users className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{data.stats.inactiveBusinesses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">
                ${data.stats.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Avg Order Value</CardTitle>
              <DollarSign className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">
                ${data.stats.averageOrderValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.stats.totalOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Merchants Table */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">All Merchants</CardTitle>
            <CardDescription className="text-gray-400">
              Comprehensive list of all merchant businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gradient-gold">Business</TableHead>
                    <TableHead className="text-gradient-gold">Contact</TableHead>
                    <TableHead className="text-gradient-gold">Type</TableHead>
                    <TableHead className="text-gradient-gold">Status</TableHead>
                    <TableHead className="text-gradient-gold">Orders</TableHead>
                    <TableHead className="text-gradient-gold">Revenue</TableHead>
                    <TableHead className="text-gradient-gold">Users</TableHead>
                    <TableHead className="text-gradient-gold">Last Order</TableHead>
                    <TableHead className="text-gradient-gold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.businesses.map((business) => (
                    <TableRow key={business.id} className="border-gray-700">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">{business.name}</div>
                          <div className="text-sm text-gray-400">ID: {business.id.slice(0, 8)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{business.email}</span>
                          </div>
                          {business.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{business.phone}</span>
                            </div>
                          )}
                          {business.website && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span className="text-xs">{business.website}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <Badge variant="outline" className="border-gradient-gold text-gradient-gold">
                          {business.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={business.isActive ? "default" : "secondary"}
                          className={business.isActive 
                            ? "bg-green-600 hover:bg-green-600" 
                            : "bg-red-600 hover:bg-red-600"
                          }
                        >
                          {business.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{business.totalOrders}</TableCell>
                      <TableCell className="text-gradient-gold font-medium">
                        ${business.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-gray-300">{business.totalUsers}</TableCell>
                      <TableCell className="text-gray-300">
                        {business.lastOrderAt 
                          ? new Date(business.lastOrderAt).toLocaleDateString()
                          : 'No orders'}
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                              Edit Business
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem 
                              className={business.isActive 
                                ? "text-red-400 hover:bg-gray-700" 
                                : "text-green-400 hover:bg-gray-700"
                              }
                            >
                              {business.isActive ? 'Deactivate' : 'Activate'}
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
      </div>
    </div>
  );
}