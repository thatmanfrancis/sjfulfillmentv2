"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { authClient } from "@/lib/auth-client";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
// using native fetch to avoid adding axios dependency

export default function LogisticsSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [coverage, setCoverage] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(4);
  const [active, setActive] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalOpen(true);
  };
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/logistics/profile');
        if (res.ok && res.data?.profile) {
          const p = res.data.profile;
          setProfile(p);
          setCoverage((p.coverageStates || []).join(", "));
          setCapacity(p.capacity ?? 4);
          setActive(p.active ?? true);
          setFirstName(p.user?.firstName || "");
          setLastName(p.user?.lastName || "");
          setPhone(p.user?.phone || "");
          setAvatarUrl(p.user?.avatarUrl || "");
        } else {
          console.error('Failed to load profile', res.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // mark client mount to avoid server-side image proxying
    setMounted(true);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const coverageStates = coverage.split(",").map((s) => s.trim()).filter(Boolean);

      // For logistics personnel, if coverage already exists, don't send coverageStates or capacity (server enforces)
      const isLogistics = user?.role === "LOGISTICS_PERSONNEL";
      const payload: any = { active, firstName, lastName, phone, avatarUrl };

      if (!isLogistics) {
        payload.coverageStates = coverageStates;
        payload.capacity = capacity;
      } else {
        // allow initial set only when profile missing or empty
        if (!profile || !profile.coverageStates || profile.coverageStates.length === 0) {
          payload.coverageStates = coverageStates;
        }
        // capacity is read-only for logistics personnel
      }

      const res = await api.put('/api/logistics/profile', payload);
      if (res.ok && res.data?.profile) {
        setProfile(res.data.profile);
      } else {
        throw new Error(res.error || 'Failed to save profile');
      }
      showModal('Saved', 'Profile saved');
    } catch (err) {
      console.error(err);
      showModal('Save failed', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

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

  const coverageSet = profile?.coverageStates && profile.coverageStates.length > 0;
  const isLogistics = user?.role === "LOGISTICS_PERSONNEL";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logistics Settings</h1>
          <p className="text-gray-400">Manage logistics profile, coverage and availability</p>
        </div>
        <div className="h-10 w-10">
          <Image src="/sjf.png" alt="SJF" width={40} height={40} />
        </div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Avatar panel */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-[5px] overflow-hidden bg-gray-700">
                {mounted && avatarUrl ? (
                  // render remote avatar only on client to avoid SSR image proxy timeouts
                  // eslint-disable-next-line @next/next/no-img-element
                  <Image width={100} height={100} src={avatarUrl} alt="avatar" className="w-full h-full object-cover block" onError={() => setAvatarUrl("")} loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gray-600" />
                )}
              </div>

              {/* edit overlay */}
              <div className="absolute -right-2 -bottom-2 flex space-x-2">
                <label className="inline-flex items-center justify-center w-8 h-8 bg-gray-800 border border-gray-600 rounded-md cursor-pointer hover:bg-gray-700" title="Change avatar">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        showModal('Invalid file', 'Please select an image file');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        showModal('File too large', 'Image must be less than 5MB');
                        return;
                      }
                        try {
                          setUploadingAvatar(true);
                          const formData = new FormData();
                          formData.append("avatar", file);

                          const token = authClient.getAccessToken();
                          const headers: Record<string, string> = {};
                          if (token) headers["Authorization"] = `Bearer ${token}`;

                          const res = await fetch("/api/users/me/avatar", {
                            method: "PATCH",
                            headers,
                            body: formData,
                          });

                          const data = await res.json();
                          if (!res.ok) {
                            console.error("Avatar upload failed", data);
                            showModal('Upload failed', data?.error || 'Failed to upload avatar');
                          } else {
                            const url = data?.user?.avatarUrl || data?.url || "";
                            if (url) setAvatarUrl(url);
                            showModal('Upload successful', 'Avatar uploaded successfully');
                          }
                        } catch (err) {
                        console.error(err);
                        showModal('Upload failed', 'Failed to upload avatar');
                      } finally {
                          setUploadingAvatar(false);
                        }
                    }}
                  />
                  {/* pen icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 20h9" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                  </svg>
                </label>

                {mounted && avatarUrl && (
                  <>
                    <button
                      className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center text-white hover:opacity-90"
                      title="Remove avatar"
                      onClick={() => setConfirmOpen(true)}
                    >
                      {removingAvatar ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12a9 9 0 0118 0" />
                        </svg>
                      ) : (
                        '×'
                      )}
                    </button>

                    <ConfirmModal
                      open={confirmOpen}
                      title="Remove avatar?"
                      message="Are you sure you want to remove your avatar?"
                      onCancel={() => setConfirmOpen(false)}
                      onConfirm={async () => {
                        setConfirmOpen(false);
                        // Call server endpoint to remove avatar instead of only clearing local state
                        try {
                          setRemovingAvatar(true);
                          const token = authClient.getAccessToken();
                          const headers: Record<string, string> = {};
                          if (token) headers['Authorization'] = `Bearer ${token}`;

                          const res = await fetch('/api/users/me/avatar', {
                            method: 'DELETE',
                            headers,
                          });

                          const data = await res.json();
                          if (!res.ok) {
                            console.error('Failed to remove avatar', data);
                            showModal('Remove failed', data?.error || 'Failed to remove avatar');
                          } else {
                            // Update local state to reflect server-side deletion
                            setAvatarUrl('');
                            // Also update profile object if present
                            setProfile((prev: any) => prev ? { ...prev, user: { ...prev.user, avatarUrl: null } } : prev);
                          }
                        } catch (err) {
                          console.error(err);
                          showModal('Remove failed', 'Failed to remove avatar');
                        } finally {
                          setRemovingAvatar(false);
                        }
                      }}
                    />
                  </>
                )}
              </div>

            </div>

            <div className="mt-4 text-sm text-gray-400 text-center md:text-left">
              <div className="font-medium text-white">{firstName} {lastName}</div>
              <div className="text-gray-500">{phone}</div>
            </div>
          </div>

          {/* Right: Form fields (span 2 cols) */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Coverage area (states, comma separated)</label>
                <input
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  disabled={isLogistics && coverageSet}
                  placeholder={isLogistics && coverageSet ? "Coverage already set — contact admin to change" : "e.g. Lagos, Abuja"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Capacity</label>
                <input type="number" value={capacity} readOnly className="w-32 px-3 py-2 bg-black border border-gray-600 rounded-lg text-gray-300" />
                {isLogistics && <p className="text-xs text-gray-500">Capacity is read-only. Contact admin to change.</p>}
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-sm text-gray-300">Active</label>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#f08c17]" />
              </div>
            </div>

            <div className="mt-6">
              <button onClick={save} disabled={saving} className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="sm">
        <div>
          <p className="text-gray-200">{modalMessage}</p>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setModalOpen(false)} className="px-3 py-1 bg-[#f08c17] rounded-md text-black font-medium">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
