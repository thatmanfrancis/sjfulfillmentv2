import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Calendar, AlertCircle, Download, MoreHorizontal, Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface Invoice {
  id: string;
  merchantId: string;
  invoiceNumber: string;
  billingPeriod: string;
  status: string;
  totalDue: number;
  storageCharges?: number;
  fulfillmentFees?: number;
  receivingFees?: number;
  otherFees?: number;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  merchant?: {
    id: string;
    name: string;
    contactEmail: string;
  };
}

interface InvoicesData {
  invoices: Invoice[];
  summary: {
    totalInvoices: number;
    totalDue: number;
    totalPaid: number;
    overdue: number;
    pending: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function getInvoicesData(): Promise<InvoicesData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoices data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching invoices data:', error);
    return {
      invoices: [],
      summary: {
        totalInvoices: 0,
        totalDue: 0,
        totalPaid: 0,
        overdue: 0,
        pending: 0,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

const statusColors = {
  DRAFT: 'bg-gray-600 hover:bg-gray-600',
  SENT: 'bg-blue-600 hover:bg-blue-600',
  PAID: 'bg-green-600 hover:bg-green-600',
  OVERDUE: 'bg-red-600 hover:bg-red-600',
  CANCELLED: 'bg-gray-500 hover:bg-gray-500',
};

const statusLabels = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

function isOverdue(dueDate: string, status: string): boolean {
  return status !== 'PAID' && new Date(dueDate) < new Date();
}

export default async function InvoicesPage() {
  const data = await getInvoicesData();

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-gold">Invoice Management</h1>
            <p className="text-gray-400">Track and manage billing for all merchant services</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-black shadow-gold font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-brand-gold">Create New Invoice</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Generate a new invoice for a merchant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Merchant</Label>
                    <Select>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select merchant" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="merchant1" className="text-white">ABC Corp</SelectItem>
                        <SelectItem value="merchant2" className="text-white">XYZ Ltd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Billing Period</Label>
                    <Input placeholder="e.g., 2024-11" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Due Date</Label>
                    <Input type="date" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Total Amount</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Storage Charges</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Fulfillment Fees</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea placeholder="Invoice description..." className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" className="border-gray-600 text-gray-300">
                    Cancel
                  </Button>
                  <Button className="gradient-gold text-black">
                    Create Invoice
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data.summary.totalInvoices}</div>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Due</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                ${data.summary.totalDue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ${data.summary.totalPaid.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{data.summary.overdue}</div>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{data.summary.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
          <CardHeader>
            <CardTitle className="text-brand-gold">Filter Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by invoice number or merchant..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="DRAFT" className="text-white">Draft</SelectItem>
                  <SelectItem value="SENT" className="text-white">Sent</SelectItem>
                  <SelectItem value="PAID" className="text-white">Paid</SelectItem>
                  <SelectItem value="OVERDUE" className="text-white">Overdue</SelectItem>
                  <SelectItem value="CANCELLED" className="text-white">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Billing period" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Periods</SelectItem>
                  <SelectItem value="2024-01" className="text-white">January 2024</SelectItem>
                  <SelectItem value="2024-02" className="text-white">February 2024</SelectItem>
                  <SelectItem value="2024-03" className="text-white">March 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
          <CardHeader>
            <CardTitle className="text-brand-gold">All Invoices</CardTitle>
            <CardDescription className="text-gray-400">
              Complete list of merchant billing and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-brand-gold">Invoice</TableHead>
                    <TableHead className="text-brand-gold">Merchant</TableHead>
                    <TableHead className="text-brand-gold">Period</TableHead>
                    <TableHead className="text-brand-gold">Status</TableHead>
                    <TableHead className="text-brand-gold">Amount</TableHead>
                    <TableHead className="text-brand-gold">Issued</TableHead>
                    <TableHead className="text-brand-gold">Due Date</TableHead>
                    <TableHead className="text-brand-gold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.map((invoice) => {
                    const overdueStatus = isOverdue(invoice.dueDate, invoice.status);
                    const displayStatus = overdueStatus ? 'OVERDUE' : invoice.status;
                    
                    return (
                      <TableRow key={invoice.id} className="border-gray-700">
                        <TableCell className="text-white">
                          <div>
                            <div className="font-medium">{invoice.invoiceNumber}</div>
                            <div className="text-sm text-gray-400">ID: {invoice.id.slice(0, 8)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          {invoice.merchant ? (
                            <div>
                              <div className="font-medium text-sm">{invoice.merchant.name}</div>
                              <div className="text-xs text-gray-400">{invoice.merchant.contactEmail}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 font-mono">
                          {invoice.billingPeriod}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="default" 
                            className={statusColors[displayStatus as keyof typeof statusColors]}
                          >
                            {statusLabels[displayStatus as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-brand-gold font-medium">
                          ${invoice.totalDue.toLocaleString()}
                          {(invoice.storageCharges || invoice.fulfillmentFees || invoice.receivingFees || invoice.otherFees) && (
                            <div className="text-xs text-gray-400 space-y-0">
                              {invoice.storageCharges && <div>Storage: ${invoice.storageCharges}</div>}
                              {invoice.fulfillmentFees && <div>Fulfillment: ${invoice.fulfillmentFees}</div>}
                              {invoice.receivingFees && <div>Receiving: ${invoice.receivingFees}</div>}
                              {invoice.otherFees && <div>Other: ${invoice.otherFees}</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm">
                          {new Date(invoice.issuedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className={`text-sm ${overdueStatus ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                          {overdueStatus && (
                            <div className="text-xs text-red-500">
                              {Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-800"
                            >
                              <Download className="h-4 w-4 text-gray-400" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-800">
                                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                                <DropdownMenuLabel className="text-brand-gold">Actions</DropdownMenuLabel>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem className="text-gray-300 hover:bg-gray-700" onSelect={(e) => e.preventDefault()}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Invoice
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <DialogContent className="bg-gray-900 border-gray-800 text-white">
                                    <DialogHeader>
                                      <DialogTitle className="text-brand-gold">Edit Invoice</DialogTitle>
                                      <DialogDescription className="text-gray-400">
                                        Update invoice details for {invoice.invoiceNumber}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-gray-300">Status</Label>
                                        <Select defaultValue={invoice.status}>
                                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-gray-800 border-gray-700">
                                            <SelectItem value="DRAFT" className="text-white">Draft</SelectItem>
                                            <SelectItem value="SENT" className="text-white">Sent</SelectItem>
                                            <SelectItem value="PAID" className="text-white">Paid</SelectItem>
                                            <SelectItem value="OVERDUE" className="text-white">Overdue</SelectItem>
                                            <SelectItem value="CANCELLED" className="text-white">Cancelled</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-gray-300">Total Amount</Label>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          defaultValue={invoice.totalDue} 
                                          className="bg-gray-800 border-gray-700 text-white" 
                                        />
                                      </div>
                                      <div className="flex justify-end space-x-2">
                                        <Button variant="outline" className="border-gray-600 text-gray-300">Cancel</Button>
                                        <Button className="gradient-gold text-black">Update Invoice</Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem className="text-blue-400 hover:bg-gray-700">
                                  Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-400 hover:bg-gray-700">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancel Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* If no invoices exist */}
        {data.invoices.length === 0 && (
          <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-white">No invoices found</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Start billing merchants by creating your first invoice.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-4 gradient-gold text-black shadow-gold font-semibold">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-brand-gold">Create Your First Invoice</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Get started by creating your first invoice for a merchant.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Merchant</Label>
                        <Select>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select merchant" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="merchant1" className="text-white">ABC Corp</SelectItem>
                            <SelectItem value="merchant2" className="text-white">XYZ Ltd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">Billing Period</Label>
                          <Input placeholder="e.g., 2024-11" className="bg-gray-800 border-gray-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Total Amount</Label>
                          <Input type="number" step="0.01" placeholder="0.00" className="bg-gray-800 border-gray-700 text-white" />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" className="border-gray-600 text-gray-300">
                          Cancel
                        </Button>
                        <Button className="gradient-gold text-black">
                          Create Invoice
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} invoices
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