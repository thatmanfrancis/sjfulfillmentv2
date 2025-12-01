"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  DollarSign,
  Calendar,
  Building,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { get, patch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Invoice {
  id: string;
  merchantId: string;
  merchantName?: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  totalDue: number;
  status:
    | "PENDING"
    | "PAID"
    | "OVERDUE"
    | "CANCELLED"
    | "PROCESSING"
    | "ISSUED"
    | "DRAFT";
  paymentDate?: string;
  amountPaid?: number;
  fulfillmentFees?: number;
  storageCharges?: number;
  receivingFees?: number;
  otherFees?: number;
  Business?: { id: string; name: string };
  createdAt: string;
  currency?: string;
  orderId?: string;
  priceTierBreakdown?: any;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  thisMonthRevenue: number;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [searchTerm, statusFilter, page]);

  const fetchStats = async () => {
    try {
      const data = (await get("/api/admin/invoices/stats")) as any;
      setStats({
        totalInvoices: data?.totalInvoices || 0,
        totalAmount: data?.totalAmount || 0,
        paidAmount: data?.paidAmount || 0,
        pendingAmount: data?.pendingAmount || 0,
        overdueAmount: data?.overdueAmount || 0,
        thisMonthRevenue: data?.thisMonthRevenue || 0,
      });
    } catch (error) {
      console.error("Failed to fetch invoice stats:", error);
      setStats({
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        thisMonthRevenue: 0,
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page.toString());
      params.append("limit", "20");

      const data = (await get(`/api/admin/invoices?${params}`)) as any;
      setInvoices(data?.invoices || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          icon: <Clock className="h-3 w-3" />,
          label: "Pending",
        };
      case "PROCESSING":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Processing",
        };
      case "PAID":
        return {
          color: "bg-emerald-100 text-emerald-700 border-emerald-200",
          icon: <CheckCircle className="h-3 w-3" />,
          label: "Paid",
        };
      case "OVERDUE":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Overdue",
        };
      case "CANCELLED":
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <XCircle className="h-3 w-3" />,
          label: "Cancelled",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <Clock className="h-3 w-3" />,
          label: status,
        };
    }
  };

  const formatCurrency = (amount: number, currency: string = "NGN") => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedInvoice) return;
    await patch(`/api/admin/invoices`, {
      invoiceId: selectedInvoice.id,
      status,
    });
    setShowModal(false);
    fetchInvoices();
  };

  if (!loading && !invoices.length) {
    return (
      <div className="min-h-screen bg-black p-8 space-y-6">
        <Card className="bg-black border border-[#f8c017]/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-[#222] text-[#f8c017]">
                    <th className="p-2">Invoice ID</th>
                    <th className="p-2">Merchant</th>
                    <th className="p-2">Billing Period</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Total Due</th>
                    <th className="p-2">Amount Paid</th>
                    <th className="p-2">Payment Date</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8} className="py-8">
                      <div className="w-full max-w-3xl mx-auto border-2 border-[#f08c17] rounded-lg bg-[#181818] flex flex-col justify-center items-center py-8 px-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-10 w-10 text-[#f8c017] mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 17v-2a4 4 0 118 0v2M9 17h6M9 17v2a2 2 0 002 2h2a2 2 0 002-2v-2M7 9a4 4 0 018 0v2a4 4 0 01-8 0V9z"
                          />
                        </svg>
                        <span className="font-semibold text-lg text-[#f8c017]">
                          No invoices found
                        </span>
                        <span className="text-gray-400">
                          Invoices you create or receive will appear here.
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 space-y-6">
      <Card className="bg-black border border-[#f8c017]/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-[#222] text-[#f8c017]">
                  <th className="p-2">Invoice ID</th>
                  <th className="p-2">Merchant</th>
                  <th className="p-2">Billing Period</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Total Due</th>
                  <th className="p-2">Amount Paid</th>
                  <th className="p-2">Payment Date</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#f8c017]/10">
                    <td className="p-2 text-white font-mono flex items-center gap-2">
                      <span>{inv.id.slice(0, 10)}</span>
                      <button
                        className="text-gray-400 hover:text-[#f8c017]"
                        title="Copy Invoice ID"
                        onClick={() => navigator.clipboard.writeText(inv.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="p-2 text-white">
                      {inv.Business?.name || inv.merchantName || "Unknown"}
                    </td>
                    <td className="p-2 text-white">{inv.billingPeriod}</td>
                    <td className="p-2">
                      <Badge
                        className={`border ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-yellow-100 text-yellow-700 border-yellow-200"
                        }`}
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-white">{inv.totalDue}</td>
                    <td className="p-2 text-white">
                      {typeof inv.amountPaid === "number"
                        ? inv.amountPaid
                        : "-"}
                    </td>
                    <td className="p-2 text-white">{inv.paymentDate || "-"}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        className="bg-[#f8c017] text-black"
                        onClick={() => handleSelectInvoice(inv)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#222] border-[#f8c017]/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#f8c017]">Invoice</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo and merchant details */}
              <div className="flex flex-col items-start gap-2 min-w-[180px]">
                <img src="/logo.png" alt="Logo" className="h-12 mb-2" />
                <div className="text-lg font-bold text-[#f8c017]">
                  {selectedInvoice.Business?.name ||
                    selectedInvoice.merchantName ||
                    "Unknown"}
                </div>
                <div className="text-gray-400 text-sm">
                  Invoice Period: {selectedInvoice.billingPeriod}
                </div>
                <div className="text-gray-400 text-sm">
                  Invoice Date: {formatDate(selectedInvoice.issueDate)}
                </div>
                <div className="text-gray-400 text-sm">
                  Due Date: {formatDate(selectedInvoice.dueDate)}
                </div>
              </div>
              {/* Invoice details */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Invoice ID:</span>
                  <span className="font-mono text-yellow-400">
                    {selectedInvoice.id.slice(0, 10)}
                  </span>
                  <button
                    className="text-gray-400 hover:text-[#f8c017]"
                    title="Copy Invoice ID"
                    onClick={() =>
                      navigator.clipboard.writeText(selectedInvoice.id)
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Status:</span>
                  <Badge
                    className={`border ${
                      selectedInvoice.status === "PAID"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-yellow-100 text-yellow-700 border-yellow-200"
                    }`}
                  >
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Total Due:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(selectedInvoice.totalDue)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {selectedInvoice.currency || "NGN"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Amount Paid:</span>
                  <span className="font-bold text-white">
                    {typeof selectedInvoice.amountPaid === "number"
                      ? formatCurrency(selectedInvoice.amountPaid)
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Payment Date:</span>
                  <span className="text-white">
                    {selectedInvoice.paymentDate || "-"}
                  </span>
                </div>
                {/* Order/Shipment details */}
                <div className="mt-4">
                  <div className="text-[#f8c017] font-bold mb-1">
                    Order/Shipment Details
                  </div>
                  <div className="text-gray-400 text-sm">
                    Order ID:{" "}
                    <span className="font-mono text-yellow-400">
                      {selectedInvoice.orderId?.slice(0, 10) || "-"}
                    </span>
                  </div>
                  {/* Add tracking number, products, etc. if available */}
                  {/* Example: <div className="text-gray-400 text-sm">Tracking: {selectedInvoice.trackingNumber || '-'}</div> */}
                </div>
                {/* Price tier breakdown and cost/amount */}
                <div className="mt-4">
                  <div className="text-[#f8c017] font-bold mb-1">Breakdown</div>
                  <div className="text-gray-400 text-sm">Price Tier:</div>
                  {Array.isArray(selectedInvoice.priceTierBreakdown) &&
                  selectedInvoice.priceTierBreakdown.length > 0 ? (
                    <ul className="text-gray-300 text-xs pl-4">
                      {selectedInvoice.priceTierBreakdown.map(
                        (item: any, idx: number) => (
                          <li key={idx} className="mb-1">
                            <span className="font-mono text-yellow-400">
                              {item.sku}
                            </span>{" "}
                            —{" "}
                            <span className="font-bold text-white">
                              {item.productName}
                            </span>{" "}
                            | Qty: {item.quantity} | Rate: {item.amount}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <div className="text-gray-400 text-sm">-</div>
                  )}
                  <div className="text-gray-400 text-sm">
                    Cost/Amount: {selectedInvoice.totalDue}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    className="bg-emerald-600 text-white"
                    onClick={() => handleStatusUpdate("PAID")}
                  >
                    Mark as Paid
                  </Button>
                  <Button
                    className="bg-yellow-600 text-white"
                    onClick={() => handleStatusUpdate("OVERDUE")}
                  >
                    Mark as Overdue
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#f8c017] text-[#f8c017]"
              onClick={() => setShowModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
