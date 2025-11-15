import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Key, Database, Shield, MoreHorizontal, Plus, Search, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsData {
  settings: Setting[];
  summary: {
    totalSettings: number;
  };
}

async function getSettingsData(): Promise<SettingsData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/settings`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch settings data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching settings data:', error);
    return {
      settings: [],
      summary: {
        totalSettings: 0,
      },
    };
  }
}

// Predefined setting categories for organization
const settingCategories = {
  SYSTEM: {
    label: 'System Configuration',
    icon: Database,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-700',
  },
  SECURITY: {
    label: 'Security Settings',
    icon: Shield,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-700',
  },
  BUSINESS: {
    label: 'Business Rules',
    icon: Settings,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-700',
  },
  NOTIFICATION: {
    label: 'Notifications',
    icon: Key,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-700',
  },
};

function getSettingCategory(key: string) {
  if (key.includes('security') || key.includes('auth') || key.includes('password')) return 'SECURITY';
  if (key.includes('notification') || key.includes('email') || key.includes('sms')) return 'NOTIFICATION';
  if (key.includes('business') || key.includes('payment') || key.includes('rate')) return 'BUSINESS';
  return 'SYSTEM';
}

export default async function AdminSettingsPage() {
  const data = await getSettingsData();

  // Group settings by category
  const categorizedSettings = data.settings.reduce((acc, setting) => {
    const category = getSettingCategory(setting.key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">System Settings</h1>
            <p className="text-gray-400">Manage system-wide configuration and preferences</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add New Setting
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-gradient-gold">Add New Setting</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Create a new system configuration setting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Setting Key</label>
                  <Input
                    placeholder="e.g., max_order_items"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Value</label>
                  <Input
                    placeholder="Setting value"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Description</label>
                  <Textarea
                    placeholder="Describe what this setting controls..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" className="border-gray-600 text-gray-300">
                    Cancel
                  </Button>
                  <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black">
                    Create Setting
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Settings</CardTitle>
              <Settings className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.summary.totalSettings}</div>
            </CardContent>
          </Card>

          {Object.entries(settingCategories).map(([key, category]) => {
            const count = categorizedSettings[key]?.length || 0;
            const Icon = category.icon;
            return (
              <Card key={key} className="bg-gray-900/50 border-gray-800 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">{category.label}</CardTitle>
                  <Icon className={`h-4 w-4 ${category.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${category.color}`}>{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search settings by key or description..."
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings by Category */}
        {Object.entries(categorizedSettings).map(([categoryKey, settings]) => {
          const category = settingCategories[categoryKey as keyof typeof settingCategories];
          const Icon = category.icon;
          
          return (
            <Card key={categoryKey} className="bg-gray-900/50 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient-gold">
                  <Icon className={`h-5 w-5 ${category.color}`} />
                  {category.label}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {settings.length} configuration{settings.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gradient-gold">Setting Key</TableHead>
                        <TableHead className="text-gradient-gold">Value</TableHead>
                        <TableHead className="text-gradient-gold">Description</TableHead>
                        <TableHead className="text-gradient-gold">Last Updated</TableHead>
                        <TableHead className="text-gradient-gold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settings.map((setting) => (
                        <TableRow key={setting.id} className="border-gray-700">
                          <TableCell className="text-white">
                            <div className="font-mono text-sm">{setting.key}</div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="max-w-xs">
                              {setting.value.length > 50 ? (
                                <div>
                                  <div className="font-mono text-sm">
                                    {setting.value.substring(0, 50)}...
                                  </div>
                                  <Badge variant="outline" className="mt-1 text-xs border-gray-600">
                                    {setting.value.length} chars
                                  </Badge>
                                </div>
                              ) : (
                                <div className="font-mono text-sm">{setting.value}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="max-w-md text-sm">
                              {setting.description || 
                                <span className="text-gray-500 italic">No description</span>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {new Date(setting.updatedAt).toLocaleDateString()}
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
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Value
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  View Full Value
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  Edit Description
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem className="text-red-400 hover:bg-gray-700">
                                  Delete Setting
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
          );
        })}

        {/* If no settings exist */}
        {data.settings.length === 0 && (
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <Settings className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-300">No settings configured</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Get started by creating your first system setting.
                </p>
                <Button className="mt-4 bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Setting
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}