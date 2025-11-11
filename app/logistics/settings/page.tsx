"use client";

import { useEffect, useState } from "react";
// using native fetch to avoid adding axios dependency

export default function LogisticsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [coverage, setCoverage] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(4);
  const [active, setActive] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/logistics/profile');
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          const p = data.profile;
          setCoverage((p.coverageStates || []).join(", "));
          setCapacity(p.capacity ?? 4);
          setActive(p.active ?? true);
          setFirstName(p.user?.firstName || "");
          setLastName(p.user?.lastName || "");
          setPhone(p.user?.phone || "");
          setAvatarUrl(p.user?.avatarUrl || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const coverageStates = coverage.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/logistics/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coverageStates, capacity, active, firstName, lastName, phone, avatarUrl }) });
      const data = await res.json();
      setProfile(data.profile);
      alert('Profile saved');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Logistics Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm">First name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        </div>
        <div>
          <label className="block text-sm">Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        </div>
        <div>
          <label className="block text-sm">Avatar URL</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        </div>
        <div>
          <label className="block text-sm">Coverage states (comma separated)</label>
          <input value={coverage} onChange={(e) => setCoverage(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        </div>
        <div>
          <label className="block text-sm">Capacity</label>
          <input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value || '4'))} className="w-32 p-2 rounded bg-gray-800" />
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm">Active</label>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </div>

        <div>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f08c17] text-black rounded">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
