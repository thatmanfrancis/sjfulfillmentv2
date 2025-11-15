import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Package, Building2, MoreHorizontal, Plus, Search } from 'lucide-react';
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

interface PricingTier {
  id: string;
  merchantId?: string;
  serviceType: string;
  baseRate: number;
  negotiatedRate: number;
  rateUnit: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id: string;
    name: string;
  };
}

interface PricingTiersData {
  pricingTiers: PricingTier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalTiers: number;
    systemWideTiers: number;
    merchantSpecificTiers: number;
    serviceTypes: string[];
  };
}

async function getPricingTiersData(): Promise<PricingTiersData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/pricing-tiers`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch pricing tiers data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching pricing tiers data:', error);
    return {
      pricingTiers: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      summary: {
        totalTiers: 0,
        systemWideTiers: 0,
        merchantSpecificTiers: 0,
        serviceTypes: [],
      },
    };
  }
}

const serviceTypeLabels = {
  'WAREHOUSING_MONTHLY': 'Monthly Warehousing',
  'FULFILLMENT_PER_ORDER': 'Order Fulfillment',
  'SHIPPING_DOMESTIC': 'Domestic Shipping',
  'SHIPPING_INTERNATIONAL': 'International Shipping',
  'STORAGE_PER_UNIT': 'Unit Storage',
  'HANDLING_FEE': 'Handling Fee',
  'PACKAGING_FEE': 'Packaging Fee',
};

const rateUnitLabels = {
  'PER_UNIT_MONTH': 'Per Unit/Month',
  'PER_ORDER': 'Per Order',
  'PER_SHIPMENT': 'Per Shipment',
  'PER_UNIT': 'Per Unit',
  'PERCENTAGE': 'Percentage',
  'FLAT_RATE': 'Flat Rate',
};

export default async function AdminPricingTiersPage() {
  const data = await getPricingTiersData();

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Pricing Tiers Management</h1>
            <p className="text-gray-400">Manage service pricing for all merchants and system defaults</p>
          </div>
          <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Add New Pricing Tier
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Pricing Tiers</CardTitle>
              <DollarSign className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.summary.totalTiers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">System-Wide</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{data.summary.systemWideTiers}</div>
              <p className="text-xs text-gray-400">Default rates</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Merchant-Specific</CardTitle>
              <Building2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.summary.merchantSpecificTiers}</div>
              <p className="text-xs text-gray-400">Custom rates</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Service Types</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{data.summary.serviceTypes.length}</div>
              <p className="text-xs text-gray-400">Different services</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">Filter Pricing Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by service type or merchant..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  <SelectItem value="system" className="text-white">System-Wide</SelectItem>
                  <SelectItem value="merchant" className="text-white">Merchant-Specific</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Service type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Services</SelectItem>
                  {data.summary.serviceTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-white">
                      {serviceTypeLabels[type as keyof typeof serviceTypeLabels] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers Table */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">All Pricing Tiers</CardTitle>
            <CardDescription className="text-gray-400">
              Comprehensive list of all pricing configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gradient-gold">Service Type</TableHead>
                    <TableHead className="text-gradient-gold">Merchant</TableHead>
                    <TableHead className="text-gradient-gold">Base Rate</TableHead>
                    <TableHead className="text-gradient-gold">Negotiated Rate</TableHead>
                    <TableHead className="text-gradient-gold">Rate Unit</TableHead>
                    <TableHead className="text-gradient-gold">Currency</TableHead>
                    <TableHead className="text-gradient-gold">Created</TableHead>
                    <TableHead className="text-gradient-gold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pricingTiers.map((tier) => (
                    <TableRow key={tier.id} className="border-gray-700">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">
                            {serviceTypeLabels[tier.serviceType as keyof typeof serviceTypeLabels] || tier.serviceType}
                          </div>
                          <div className="text-sm text-gray-400">{tier.serviceType}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {tier.merchant ? (
                          <div>
                            <div className="font-medium text-sm">{tier.merchant.name}</div>
                            <div className="text-xs text-gray-400">ID: {tier.merchant.id.slice(0, 8)}</div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-blue-500 text-blue-400">
                            System-Wide
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="font-mono">
                          {tier.currency} {tier.baseRate.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-gradient-gold font-mono font-medium">
                        {tier.currency} {tier.negotiatedRate.toFixed(2)}
                        {tier.negotiatedRate < tier.baseRate && (
                          <Badge variant="secondary" className="ml-2 bg-green-600 text-white text-xs">
                            -{(((tier.baseRate - tier.negotiatedRate) / tier.baseRate) * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {rateUnitLabels[tier.rateUnit as keyof typeof rateUnitLabels] || tier.rateUnit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <Badge variant="outline" className="border-gradient-gold text-gradient-gold">
                          {tier.currency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {new Date(tier.createdAt).toLocaleDateString()}
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
                              Edit Pricing
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                              Duplicate Tier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem className="text-red-400 hover:bg-gray-700">
                              Delete Tier
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
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} pricing tiers
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