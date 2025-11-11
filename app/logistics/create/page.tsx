"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function CreateLogisticsPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const body: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role: "LOGISTICS_PERSONNEL",
      };

      if (password) body.password = password;

      const res = await api.post(`/api/staff`, body);

      if (!res.ok) {
        throw new Error(res.error || "Failed to create logistics personnel");
      }

      setSuccess("Logistics personnel created. A verification email has been sent.");
      // Optionally navigate back to users list
      setTimeout(() => router.push("/users"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invite Logistics Personnel</h1>
          <p className="text-gray-400">Create a logistics user and send verification email.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">{error}</div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700 text-green-300 px-4 py-3 rounded">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-black border border-gray-700 rounded-lg p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Temporary password (optional)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave empty to use OTP"
            className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
          >
            {loading ? "Creating…" : "Create & Send Verification"}
          </button>
          <button type="button" onClick={() => router.push('/users')} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
        </div>
      </form>
    </div>
  );
}
