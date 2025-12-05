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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Download,
  Eye,
  Building,
  Users,
  Package,
  Calendar,
  Mail,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Grid3x3,
  List,
  Phone,
  MapPin,
} from "lucide-react";
import { get, patch, del } from "@/lib/api";
import AddMerchantModal from "@/components/admin/AddMerchantModal";
import CreateTierModal from "@/components/admin/CreateTierModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Merchant {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  baseCurrency?: string;
  _count: {
    users: number;
    products: number;
  };
  address?: string;
  phone?: string;
  description?: string;
  category?: string;
}

interface MerchantStats {
  totalMerchants: number;
  activeMerchants: number;
  inactiveMerchants: number;
  newThisMonth: number;
  totalProducts: number;
  totalUsers: number;
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [hasPriceTier, setHasPriceTier] = useState<boolean | null>(null);

  // Utility functions
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  // Check for price tiers on mount
  useEffect(() => {
    async function checkPriceTiers() {
      try {
        const res: any = await get("/api/admin/price-tiers");
        setHasPriceTier(
          Array.isArray(res?.priceTiers) && res.priceTiers.length > 0
        );
      } catch {
        setHasPriceTier(false);
      }
    }
    checkPriceTiers();
  }, []);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
    null
  );
  const [showMerchantDetail, setShowMerchantDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const [merchantDetails, setMerchantDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [statusFilter, page]);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMerchants();
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm, statusFilter, page]);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page.toString());
      params.append("limit", "20");

      const data = (await get(`/api/admin/merchants?${params}`)) as any;
      setMerchants(data?.merchants || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch merchants:", error);
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = (await get("/api/admin/merchants/stats")) as any;
      setStats({
        totalMerchants: data?.totalMerchants || 0,
        activeMerchants: data?.activeMerchants || 0,
        inactiveMerchants: data?.inactiveMerchants || 0,
        newThisMonth: data?.newThisMonth || 0,
        totalProducts: data?.totalProducts || 0,
        totalUsers: data?.totalUsers || 0,
      });
    } catch (error) {
      console.error("Failed to fetch merchant stats:", error);
      setStats({
        totalMerchants: 0,
        activeMerchants: 0,
        inactiveMerchants: 0,
        newThisMonth: 0,
        totalProducts: 0,
        totalUsers: 0,
      });
    }
  };

  const handleViewMerchant = async (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setActiveTab("business");
    setMerchantDetails(null);
    setShowMerchantDetail(true);
    setDetailsLoading(true);

    try {
      const response = (await get(`/api/admin/merchants/${merchant.id}`)) as {
        merchant: any;
      };
      setMerchantDetails(response.merchant);
    } catch (error) {
      console.error("Failed to fetch merchant details:", error);
      toast.error("Failed to load merchant details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVerifyMerchant = async (merchantId: string) => {
    try {
      await patch(`/api/admin/merchants/${merchantId}/verify`, {});
      toast.success("Merchant account verified successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      fetchMerchants();
      fetchStats();
      setShowMerchantDetail(false);
    } catch (error: any) {
      console.error("Failed to verify merchant:", error);
      toast.error(
        error.message ||
          "An unexpected error occurred while verifying the account",
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    }
  };

  const handleSoftDeleteMerchant = async (merchantId: string) => {
    // Show confirmation toast with action buttons
    toast.warn(
      ({ closeToast }) => (
        <div>
          <p className="mb-3">
            Are you sure you want to deactivate this merchant account?
          </p>
          <div className="flex gap-2">
            <button
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              onClick={async () => {
                closeToast();
                try {
                  await del(`/api/admin/merchants/${merchantId}`);
                  toast.success("Merchant account deactivated successfully!", {
                    position: "top-right",
                    autoClose: 3000,
                  });
                  fetchMerchants();
                  fetchStats();
                  setShowMerchantDetail(false);
                } catch (error: any) {
                  console.error("Failed to delete merchant:", error);
                  toast.error(
                    error.message || "Failed to deactivate merchant account",
                    {
                      position: "top-right",
                      autoClose: 5000,
                    }
                  );
                }
              }}
            >
              Yes, Deactivate
            </button>
            <button
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
              onClick={closeToast}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        closeButton: false,
      }
    );
  };

  const handleToggleStatus = async (
    merchantId: string,
    currentStatus: boolean
  ) => {
    try {
      await patch(`/api/admin/merchants/${merchantId}/status`, {
        isActive: !currentStatus,
      });
      const action = !currentStatus ? "activated" : "deactivated";
      toast.success(`Merchant account ${action} successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      fetchMerchants();
      fetchStats();
      setShowMerchantDetail(false);
    } catch (error: any) {
      console.error("Failed to toggle merchant status:", error);
      toast.error(
        error.message ||
          "An unexpected error occurred while updating the status",
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    }
  };

  const handleMerchantAdded = () => {
    fetchMerchants();
    fetchStats();
  };

  if (loading && !merchants.length) {
    return (
      <div className="space-y-6 bg-black min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Merchants Management
          </h1>
          <p className="text-gray-400 mt-1">Loading merchants data...</p>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-black border border-[#f8c017]/20">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Merchants Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor all merchants on the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#2a2a2a] rounded-lg">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className={
                viewMode === "list"
                  ? "bg-[#f8c017] text-black"
                  : "text-gray-300 hover:text-white"
              }
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className={
                viewMode === "grid"
                  ? "bg-[#f8c017] text-black"
                  : "text-gray-300 hover:text-white"
              }
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => {
              if (hasPriceTier) {
                setShowAddMerchant(true);
              } else {
                setShowAddTier(true);
              }
            }}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Merchant
          </Button>
          <Button
            variant="outline"
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Download className="h-4 w-4 mr-2" />
            Export Merchants
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Merchants
            </CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Building className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalMerchants || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active
            </CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.activeMerchants || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Inactive
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.inactiveMerchants || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              New This Month
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.newThisMonth || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Users
            </CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Products
            </CardTitle>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalProducts || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search merchants by name, email, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
              </div>
            </div>
            <div className="min-w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merchants List/Grid */}
      {viewMode === "list" ? (
        <div className="space-y-4">
          {merchants.map((merchant) => (
            <Card
              key={merchant.id}
              className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Merchant Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-lg">
                        {merchant.name}
                      </h3>
                      <Badge
                        className={`flex items-center gap-1 ${
                          merchant.isActive
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {merchant.isActive ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {merchant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Merchant Details */}
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email: {merchant.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">
                          Users: {merchant._count.users}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Package className="h-4 w-4" />
                        <span className="text-sm">
                          Products: {merchant._count.products}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="h-4 w-4 font-bold">$</span>
                        <span className="text-sm">
                          Currency: {merchant.baseCurrency || "USD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          Created: {formatDate(merchant.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {(merchant.description ||
                      merchant.address ||
                      merchant.category) && (
                      <div className="text-sm text-gray-500">
                        {merchant.description && <p>{merchant.description}</p>}
                        {merchant.address && <p>Address: {merchant.address}</p>}
                        {merchant.category && (
                          <p>Category: {merchant.category}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewMerchant(merchant)}
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-gray-500"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <div className="absolute right-0 top-8 hidden group-hover:block w-48 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleVerifyMerchant(merchant.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
                          >
                            ✓ Verify Account
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStatus(merchant.id, merchant.isActive)
                            }
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
                          >
                            {merchant.isActive ? "⏸ Deactivate" : "▶ Activate"}
                          </button>
                          <button
                            onClick={() =>
                              handleSoftDeleteMerchant(merchant.id)
                            }
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#3a3a3a] hover:text-red-300"
                          >
                            🗑 Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {merchants.map((merchant) => (
            <Card
              key={merchant.id}
              className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-white text-lg truncate">
                        {merchant.name}
                      </h3>
                      <Badge
                        className={`flex items-center gap-1 w-fit ${
                          merchant.isActive
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {merchant.isActive ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {merchant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-gray-500 p-2"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <div className="absolute right-0 top-8 hidden group-hover:block w-48 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleVerifyMerchant(merchant.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
                          >
                            ✓ Verify Account
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStatus(merchant.id, merchant.isActive)
                            }
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
                          >
                            {merchant.isActive ? "⏸ Deactivate" : "▶ Activate"}
                          </button>
                          <button
                            onClick={() =>
                              handleSoftDeleteMerchant(merchant.id)
                            }
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#3a3a3a] hover:text-red-300"
                          >
                            🗑 Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-2 bg-[#2a2a2a] rounded">
                      <div className="text-[#f8c017] font-semibold">
                        {merchant._count.users}
                      </div>
                      <div className="text-gray-400">Users</div>
                    </div>
                    <div className="text-center p-2 bg-[#2a2a2a] rounded">
                      <div className="text-[#f8c017] font-semibold">
                        {merchant._count.products}
                      </div>
                      <div className="text-gray-400">Products</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{merchant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="h-3 w-3 shrink-0 font-bold">$</span>
                      <span>{merchant.baseCurrency || "USD"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{formatDate(merchant.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    size="sm"
                    onClick={() => handleViewMerchant(merchant)}
                    className="w-full bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {merchants.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No merchants found</p>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-gray-300">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Merchant Modal */}
      <AddMerchantModal
        isOpen={showAddMerchant}
        onClose={() => setShowAddMerchant(false)}
        onMerchantAdded={handleMerchantAdded}
      />

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <div
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity ${
            showMerchantDetail ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedMerchant.name}
                  </h2>
                  <p className="text-gray-400 mt-1">Merchant Account Details</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMerchantDetail(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              {/* Modal Content with Tabs */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f8c017]"></div>
                    <span className="ml-3 text-gray-400">
                      Loading details...
                    </span>
                  </div>
                ) : (
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-4 bg-[#2a2a2a] border-gray-600">
                      <TabsTrigger
                        value="business"
                        className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black text-gray-300"
                      >
                        Business Info
                      </TabsTrigger>
                      <TabsTrigger
                        value="contact"
                        className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black text-gray-300"
                      >
                        Contact Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="statistics"
                        className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black text-gray-300"
                      >
                        Statistics
                      </TabsTrigger>
                      <TabsTrigger
                        value="activity"
                        className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black text-gray-300"
                      >
                        Activity Log
                      </TabsTrigger>
                    </TabsList>

                    {/* Business Info Tab */}
                    <TabsContent value="business" className="mt-6 space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Business Name
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.name || selectedMerchant.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Base Currency
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.baseCurrency ||
                                selectedMerchant.baseCurrency ||
                                "USD"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Business Description
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.description ||
                                "No description provided"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Status
                            </label>
                            <div className="mt-1">
                              <Badge
                                className={`flex items-center gap-1 w-fit ${
                                  merchantDetails?.isActive ||
                                  selectedMerchant.isActive
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                                }`}
                              >
                                {merchantDetails?.isActive ||
                                selectedMerchant.isActive ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {merchantDetails?.isActive ||
                                selectedMerchant.isActive
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          {/* <div>
                            <label className="text-sm font-medium text-gray-300">
                              Onboarding Status
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.onboardingStatus || "N/A"}
                            </p>
                          </div> */}
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Account Created
                            </label>
                            <p className="text-white mt-1">
                              {formatDate(
                                merchantDetails?.createdAt ||
                                  selectedMerchant.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedMerchant.address && (
                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            Business Address
                          </label>
                          <p className="text-white mt-1">
                            {selectedMerchant.address}
                          </p>
                        </div>
                      )}

                      {selectedMerchant.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            Description
                          </label>
                          <p className="text-white mt-1">
                            {selectedMerchant.description}
                          </p>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="border-t border-gray-700 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4">
                          Quick Actions
                        </h3>
                        <div className="flex gap-3 flex-wrap">
                          <Button
                            onClick={() =>
                              handleVerifyMerchant(selectedMerchant.id)
                            }
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            ✓ Verify Account
                          </Button>
                          <Button
                            onClick={() =>
                              handleToggleStatus(
                                selectedMerchant.id,
                                selectedMerchant.isActive
                              )
                            }
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                          >
                            {selectedMerchant.isActive
                              ? "⏸ Deactivate"
                              : "▶ Activate"}{" "}
                            Account
                          </Button>
                          <Button
                            onClick={() =>
                              handleSoftDeleteMerchant(selectedMerchant.id)
                            }
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          >
                            🗑 Delete Account
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Contact Details Tab */}
                    <TabsContent value="contact" className="mt-6 space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Primary Contact Email
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.contactEmail ||
                                selectedMerchant.email}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Business Phone
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.contactPhone ||
                                selectedMerchant.phone ||
                                "Not provided"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Business Address
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.address || "Not provided"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              City
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.city || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              State/Province
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.state || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              Country
                            </label>
                            <p className="text-white mt-1">
                              {merchantDetails?.country || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Statistics Tab */}
                    <TabsContent value="statistics" className="mt-6 space-y-6">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="bg-[#2a2a2a] border-gray-600">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">
                              Total Orders
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-white">
                              {merchantDetails?.stats?.totalOrders || 0}
                            </div>
                            <div className="text-xs text-gray-400">
                              All time orders
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-[#2a2a2a] border-gray-600">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">
                              Total Revenue
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-white">
                              {merchantDetails?.stats
                                ? formatCurrency(
                                    merchantDetails.stats.totalRevenue,
                                    merchantDetails.baseCurrency
                                  )
                                : formatCurrency(0)}
                            </div>
                            <div className="text-xs text-gray-400">
                              All time revenue
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-[#2a2a2a] border-gray-600">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">
                              Total Products
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-white">
                              {merchantDetails?.stats?.totalProducts ||
                                selectedMerchant._count.products}
                            </div>
                            <div className="text-xs text-gray-400">
                              Active products
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Activity Log Tab */}
                    <TabsContent value="activity" className="mt-6 space-y-6">
                      {merchantDetails?.activityLogs &&
                      merchantDetails.activityLogs.length > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-lg font-medium text-white">
                            Recent Activity
                          </h3>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {merchantDetails.activityLogs.map((log: any) => (
                              <div
                                key={log.id}
                                className="p-3 bg-[#2a2a2a] rounded-lg"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-white font-medium">
                                      {log.action
                                        .replace(/_/g, " ")
                                        .toLowerCase()
                                        .replace(/^\w/, (c: string) =>
                                          c.toUpperCase()
                                        )}
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                      {log.entityType} - {log.entityId}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400">
                            No activity logs found for this merchant.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #f8c017",
          color: "#ffffff",
        }}
      />
      <AddMerchantModal
        isOpen={showAddMerchant}
        onClose={() => setShowAddMerchant(false)}
        onMerchantAdded={handleMerchantAdded}
      />
      <CreateTierModal open={showAddTier} onOpenChange={setShowAddTier} />
    </div>
  );
}
