import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, BarChart3, TrendingUp, Download, Calendar, Filter, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Report {
  id: string;
  name: string;
  type: string;
  description: string;
  lastGenerated?: string;
  generatedBy?: string;
  format: string;
  size?: string;
}

interface ReportsData {
  availableReports: Report[];
  recentReports: Report[];
  categories: string[];
}

async function getReportsData(): Promise<ReportsData> {
  // Mock data for reports since API might not be fully implemented
  const availableReports: Report[] = [
    {
      id: '1',
      name: 'Sales Performance Report',
      type: 'SALES',
      description: 'Comprehensive sales analysis with revenue, order trends, and merchant performance',
      format: 'PDF',
    },
    {
      id: '2',
      name: 'Inventory Status Report',
      type: 'INVENTORY',
      description: 'Current stock levels, low stock alerts, and inventory valuation',
      format: 'Excel',
    },
    {
      id: '3',
      name: 'Merchant Activity Report',
      type: 'MERCHANT',
      description: 'Merchant usage statistics, billing summaries, and account status',
      format: 'PDF',
    },
    {
      id: '4',
      name: 'Financial Summary Report',
      type: 'FINANCIAL',
      description: 'Revenue breakdown, expenses, and profitability analysis',
      format: 'Excel',
    },
    {
      id: '5',
      name: 'Operational Metrics Report',
      type: 'OPERATIONS',
      description: 'Fulfillment times, shipping performance, and operational KPIs',
      format: 'PDF',
    },
    {
      id: '6',
      name: 'Customer Analytics Report',
      type: 'CUSTOMER',
      description: 'Customer behavior, order patterns, and satisfaction metrics',
      format: 'Excel',
    },
  ];

  const recentReports: Report[] = [
    {
      id: 'r1',
      name: 'Monthly Sales Report - March 2024',
      type: 'SALES',
      description: 'Sales performance for March 2024',
      lastGenerated: '2024-04-01T08:00:00Z',
      generatedBy: 'Admin User',
      format: 'PDF',
      size: '2.4 MB',
    },
    {
      id: 'r2',
      name: 'Inventory Status - Weekly',
      type: 'INVENTORY',
      description: 'Weekly inventory status report',
      lastGenerated: '2024-03-29T10:30:00Z',
      generatedBy: 'System',
      format: 'Excel',
      size: '1.8 MB',
    },
    {
      id: 'r3',
      name: 'Q1 Financial Summary',
      type: 'FINANCIAL',
      description: 'First quarter financial summary',
      lastGenerated: '2024-03-31T16:45:00Z',
      generatedBy: 'Finance Team',
      format: 'PDF',
      size: '3.2 MB',
    },
  ];

  const categories = ['SALES', 'INVENTORY', 'FINANCIAL', 'MERCHANT', 'OPERATIONS', 'CUSTOMER'];

  return {
    availableReports,
    recentReports,
    categories,
  };
}

const reportTypeColors = {
  SALES: 'bg-green-600 hover:bg-green-600',
  INVENTORY: 'bg-blue-600 hover:bg-blue-600',
  FINANCIAL: 'bg-purple-600 hover:bg-purple-600',
  MERCHANT: 'bg-orange-600 hover:bg-orange-600',
  OPERATIONS: 'bg-indigo-600 hover:bg-indigo-600',
  CUSTOMER: 'bg-pink-600 hover:bg-pink-600',
};

const reportTypeLabels = {
  SALES: 'Sales',
  INVENTORY: 'Inventory',
  FINANCIAL: 'Financial',
  MERCHANT: 'Merchant',
  OPERATIONS: 'Operations',
  CUSTOMER: 'Customer',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ReportsPage() {
  const data = await getReportsData();

  // Group reports by category
  const reportsByCategory = data.availableReports.reduce((acc, report) => {
    if (!acc[report.type]) acc[report.type] = [];
    acc[report.type].push(report);
    return acc;
  }, {} as Record<string, Report[]>);

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Reports & Analytics</h1>
            <p className="text-gray-400">Generate and download comprehensive business reports</p>
          </div>
          <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Available Reports</CardTitle>
              <FileText className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.availableReports.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Recent Downloads</CardTitle>
              <Download className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.recentReports.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Categories</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{data.categories.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Scheduled Reports</CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">3</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">Quick Report Generation</CardTitle>
            <CardDescription className="text-gray-400">
              Generate common reports with predefined parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Report Type</label>
                <Select>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {data.categories.map((category) => (
                      <SelectItem key={category} value={category} className="text-white">
                        {reportTypeLabels[category as keyof typeof reportTypeLabels]} Reports
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Date Range</label>
                <Select>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="last-7-days" className="text-white">Last 7 Days</SelectItem>
                    <SelectItem value="last-30-days" className="text-white">Last 30 Days</SelectItem>
                    <SelectItem value="last-quarter" className="text-white">Last Quarter</SelectItem>
                    <SelectItem value="last-year" className="text-white">Last Year</SelectItem>
                    <SelectItem value="custom" className="text-white">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Format</label>
                <div className="flex gap-2">
                  <Button className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Generate PDF
                  </Button>
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">Recent Reports</CardTitle>
            <CardDescription className="text-gray-400">
              Recently generated reports available for download
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-700 rounded">
                      <FileText className="h-5 w-5 text-gradient-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{report.name}</h3>
                      <p className="text-sm text-gray-400">{report.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="default" 
                          className={reportTypeColors[report.type as keyof typeof reportTypeColors]}
                        >
                          {reportTypeLabels[report.type as keyof typeof reportTypeLabels]}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Generated by {report.generatedBy} • {formatDate(report.lastGenerated!)} • {report.size}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-600 text-gray-300">
                      {report.format}
                    </Badge>
                    <Button size="sm" className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Available Reports by Category */}
        {Object.entries(reportsByCategory).map(([category, reports]) => (
          <Card key={category} className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-gold">
                <BarChart3 className="h-5 w-5" />
                {reportTypeLabels[category as keyof typeof reportTypeLabels]} Reports
              </CardTitle>
              <CardDescription className="text-gray-400">
                {reports.length} available report{reports.length !== 1 ? 's' : ''} in this category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-medium text-white">{report.name}</h3>
                        <p className="text-sm text-gray-400">{report.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="default" 
                            className={reportTypeColors[report.type as keyof typeof reportTypeColors]}
                          >
                            {reportTypeLabels[report.type as keyof typeof reportTypeLabels]}
                          </Badge>
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            {report.format}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button size="sm" className="bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                          <Filter className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}