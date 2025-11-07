"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  ownedMerchants: {
    businessName: string;
  }[];
  merchantStaff: {
    merchant: {
      businessName: string;
    };
  }[];
}

interface StaffResponse {
  staff: Staff[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CreateStaffForm {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password: string;
}

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStaffForm>({
    firstName: "",
    lastName: "",
    email: "",
    role: "MERCHANT_STAFF",
    password: "",
  });

  const fetchStaff = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (roleFilter && roleFilter !== "ALL") {
        params.append("role", roleFilter);
      }

      const response = await api.get(`/api/staff?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch staff");
      }

      const data: StaffResponse = response.data;
      setStaff(data.staff);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [roleFilter]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/staff", createForm);

      if (!response.ok) {
        throw new Error(response.error || "Failed to create staff member");
      }

      setShowCreateModal(false);
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "MERCHANT_STAFF",
        password: "",
      });
      fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff member");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-900 text-purple-300";
      case "MERCHANT":
        return "bg-blue-900 text-blue-300";
      case "MERCHANT_STAFF":
        return "bg-green-900 text-green-300";
      case "LOGISTICS":
        return "bg-orange-900 text-orange-300";
      case "WAREHOUSE":
        return "bg-yellow-900 text-yellow-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-900 text-green-300";
      case "INACTIVE":
        return "bg-red-900 text-red-300";
      case "SUSPENDED":
        return "bg-yellow-900 text-yellow-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStaffMerchant = (staff: Staff) => {
    if (staff.ownedMerchants.length > 0) {
      return staff.ownedMerchants[0].businessName;
    }
    if (staff.merchantStaff.length > 0) {
      return staff.merchantStaff[0].merchant.businessName;
    }
    return "No merchant assigned";
  };

  const filteredStaff = staff.filter((member) =>
    searchTerm === "" ||
    member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-gray-400">Manage team members and their access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
        >
          Add Staff Member
        </button>
      </div>

      {/* Filters */}
      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MERCHANT">Merchant</option>
              <option value="MERCHANT_STAFF">Merchant Staff</option>
              <option value="LOGISTICS">Logistics</option>
              <option value="WAREHOUSE">Warehouse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Merchant</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Last Login</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No staff members found
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {member.emailVerifiedAt ? "Verified" : "Unverified"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-300">{member.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {member.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-300">{getStaffMerchant(member)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-300">{formatDate(member.lastLoginAt)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-gray-400 hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchStaff(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => fetchStaff(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add Staff Member</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="MERCHANT_STAFF">Merchant Staff</option>
                  <option value="LOGISTICS">Logistics</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  {user?.role === "ADMIN" && (
                    <>
                      <option value="MERCHANT">Merchant</option>
                      <option value="ADMIN">Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}