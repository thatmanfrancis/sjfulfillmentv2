'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, DollarSign, Plus, Edit, Trash2, Package, TrendingUp, Users, Activity } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  discountPercentage: number;
  minimumOrderQuantity: number;
  maximumOrderQuantity?: number;
  features: string[];
  status: 'active' | 'inactive' | 'draft';
  applicableRegions: string[];
  validFrom: string;
  validTo?: string;
  createdAt: string;
}

export default function AdminPriceTiersPage() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchPricingTiers();
  }, []);

  const fetchPricingTiers = async () => {
    try {
      // Mock data - replace with actual API call
      const mockTiers: PricingTier[] = [
        {
          id: '1',
          name: 'Basic',
          description: 'Standard pricing for small businesses',
          basePrice: 2.99,
          discountPercentage: 0,
          minimumOrderQuantity: 1,
          maximumOrderQuantity: 99,
          features: ['Standard shipping', 'Basic tracking', 'Email support'],
          status: 'active',
          applicableRegions: ['US', 'CA'],
          validFrom: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Business',
          description: 'Discounted rates for medium volume orders',
          basePrice: 2.99,
          discountPercentage: 15,
          minimumOrderQuantity: 100,
          maximumOrderQuantity: 999,
          features: ['Priority shipping', 'Advanced tracking', 'Phone support', 'Bulk discounts'],
          status: 'active',
          applicableRegions: ['US', 'CA', 'MX'],
          validFrom: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '3',
          name: 'Enterprise',
          description: 'Best rates for high volume merchants',
          basePrice: 2.99,
          discountPercentage: 25,
          minimumOrderQuantity: 1000,
          features: ['Express shipping', 'Real-time tracking', 'Dedicated support', 'Custom pricing', 'SLA guarantee'],
          status: 'active',
          applicableRegions: ['US', 'CA', 'MX', 'EU'],
          validFrom: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '4',
          name: 'Holiday Special',
          description: 'Limited time promotional pricing',
          basePrice: 2.99,
          discountPercentage: 20,
          minimumOrderQuantity: 50,
          maximumOrderQuantity: 500,
          features: ['Standard shipping', 'Holiday tracking', 'Seasonal support'],
          status: 'inactive',
          applicableRegions: ['US'],
          validFrom: '2023-11-01T00:00:00Z',
          validTo: '2024-01-15T23:59:59Z',
          createdAt: '2023-10-15T00:00:00Z'
        },
        {
          id: '5',
          name: 'Premium Plus',
          description: 'New tier with enhanced features',
          basePrice: 2.49,
          discountPercentage: 30,
          minimumOrderQuantity: 2000,
          features: ['Same-day shipping', 'Premium tracking', '24/7 support', 'White-label options'],
          status: 'draft',
          applicableRegions: ['US', 'CA'],
          validFrom: '2024-03-01T00:00:00Z',
          createdAt: '2024-01-10T00:00:00Z'
        }
      ];
      setPricingTiers(mockTiers);
    } catch (error) {
      console.error('Failed to fetch pricing tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTiers = pricingTiers.filter(tier => {
    const matchesSearch = tier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tier.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || tier.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateDiscountedPrice = (basePrice: number, discount: number) => {
    return basePrice * (1 - discount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Price Tiers</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Price Tiers</h1>
          <p className="text-muted-foreground">
            Manage pricing structures and discount tiers for merchants.
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Tier
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pricing tiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTiers.map((tier) => {
          const discountedPrice = calculateDiscountedPrice(tier.basePrice, tier.discountPercentage);
          
          return (
            <Card key={tier.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <Badge className={getStatusColor(tier.status)}>
                    {tier.status}
                  </Badge>
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div className="flex items-baseline gap-2">
                        {tier.discountPercentage > 0 ? (
                          <>
                            <span className="text-2xl font-bold text-primary">
                              ${discountedPrice.toFixed(2)}
                            </span>
                            <span className="text-lg text-muted-foreground line-through">
                              ${tier.basePrice.toFixed(2)}
                            </span>
                            <Badge className="bg-green-100 text-green-800">
                              -{tier.discountPercentage}%
                            </Badge>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-primary">
                            ${tier.basePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Quantity */}
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Min Order: <span className="text-foreground font-medium">{tier.minimumOrderQuantity}</span>
                    </p>
                    {tier.maximumOrderQuantity && (
                      <p className="text-muted-foreground">
                        Max Order: <span className="text-foreground font-medium">{tier.maximumOrderQuantity}</span>
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Features:</p>
                    <ul className="space-y-1">
                      {tier.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          {feature}
                        </li>
                      ))}
                      {tier.features.length > 3 && (
                        <li className="text-sm text-muted-foreground">
                          +{tier.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Regions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Regions:</p>
                    <div className="flex flex-wrap gap-1">
                      {tier.applicableRegions.map((region) => (
                        <Badge key={region} variant="outline" className="text-xs">
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Validity */}
                  <div className="text-sm text-muted-foreground">
                    <p>Valid from: {formatDate(tier.validFrom)}</p>
                    {tier.validTo && (
                      <p>Valid until: {formatDate(tier.validTo)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    {tier.status === 'draft' && (
                      <Button size="sm">
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTiers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No pricing tiers found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first pricing tier to get started.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}