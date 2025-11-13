"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminLogisticsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        role: "LOGISTICS_PERSONNEL",
      });
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`/api/staff?${params}`);
      if (!res.ok) throw new Error(res.error || "Failed to fetch logistics users");

      const data = res.data || {};
      const staff = Array.isArray(data.staff) ? data.staff : [];
      setUsers(staff);
      setTotalPages(typeof data.pagination?.totalPages === 'number' ? data.pagination.totalPages : 1);
      setTotalCount(typeof data.pagination?.total === 'number' ? data.pagination.total : staff.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logistics Personnel</h1>
          <p className="text-gray-400">Manage logistics staff accounts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/logistics/create")}
            className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
          >
            ➕ Invite Logistics
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">{error}</div>}

      <div className="flex gap-4 items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-md px-3 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        />
      </div>

      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No logistics personnel found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{u.firstName} {u.lastName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button onClick={() => router.push(`/logistics/${u.id}`)} className="text-blue-400 hover:text-blue-300 p-1" title="View">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => router.push(`/logistics/${u.id}/edit`)} className="text-[#f08c17] hover:text-orange-500 p-1" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalCount}
        onPageChange={(p) => setCurrentPage(p)}
      />
    </div>
  );
}
