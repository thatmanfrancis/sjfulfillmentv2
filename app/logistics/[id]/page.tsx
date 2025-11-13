"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function LogisticsDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id?: string };
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error(res.error || "Failed to fetch user");
      setUser(res.data?.user || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-300">Loading…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-300">Error: {error}</div>;
  }

  if (!user) {
    return <div className="p-6 text-gray-300">No user data</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/logistics/${id}/edit`)} className="bg-[#f08c17] text-black px-4 py-2 rounded-lg" title="Edit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg text-white mb-2">Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div>
            <div className="text-sm text-gray-400">Role</div>
            <div className="text-white">{user.role}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Status</div>
            <div className="text-white">{user.status}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Merchant</div>
            <div className="text-white">{user.merchant?.businessName || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Joined</div>
            <div className="text-white">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
