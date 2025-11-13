"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function LogisticsEditPage() {
  const router = useRouter();
  const { id } = useParams() as { id?: string };
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("");

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
      const u = res.data?.user;
      setUser(u);
      setFirstName(u.firstName || "");
      setLastName(u.lastName || "");
      setStatus(u.status || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Only status update endpoint exists for admin/users/[id] (PUT). If we need to update names,
      // there isn't an admin endpoint yet — for now update status only.
      const res = await api.put(`/api/admin/users/${id}`, { status });
      if (!res.ok) throw new Error(res.error || "Failed to save");
      router.push(`/logistics/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-300">Loading…</div>;
  if (error) return <div className="p-6 text-red-300">Error: {error}</div>;
  if (!user) return <div className="p-6 text-gray-300">No user found</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit {user.firstName} {user.lastName}</h1>
          <p className="text-gray-400">Edit logistics staff account</p>
        </div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm text-gray-400">First name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400">Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white">
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="BANNED">BANNED</option>
          </select>
        </div>

        {error && <div className="text-red-300">{error}</div>}

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="bg-[#f08c17] px-4 py-2 rounded text-black">{saving ? 'Saving…' : 'Save'}</button>
          <button onClick={() => window.history.back()} className="px-4 py-2 rounded border border-gray-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}
