"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LogisticsPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
}

interface EditLogisticsModalProps {
  open: boolean;
  onClose: () => void;
  person: LogisticsPerson | null;
  onUpdated: () => void;
}

export default function EditLogisticsModal({ open, onClose, person, onUpdated }: EditLogisticsModalProps) {
  const [form, setForm] = useState({
    firstName: person?.firstName || "",
    lastName: person?.lastName || "",
    email: person?.email || "",
    phone: person?.phone || "",
    status: person?.status || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update form when person changes
  useEffect(() => {
    if (person) {
      setForm({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        status: person.status,
      });
    }
  }, [person]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/logistics/${person?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !person) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#232323] rounded-lg p-8 max-w-lg w-full border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Logistics Person</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" required />
          <Input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" required />
          <Input name="email" value={form.email} onChange={handleChange} placeholder="Email" required type="email" />
          <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" required />
          <Input name="status" value={form.status} onChange={handleChange} placeholder="Status" required />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" onClick={onClose} className="bg-gray-700 text-white">Cancel</Button>
            <Button type="submit" className="bg-[#f8c017] text-black" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
