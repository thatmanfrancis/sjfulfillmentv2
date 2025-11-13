"use client";

import React, { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    type: string;
    readAt?: string | null;
    createdAt: string;
    merchant?: { id: string; businessName?: string } | null;
};

const TABS: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "info", label: "Info" },
    { id: "warning", label: "Warning" },
    { id: "error", label: "Error" },
    { id: "unread", label: "Unread" },
];

export default function NotificationsPage() {
    const [tab, setTab] = useState<string>("all");
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (tab !== "all" && tab !== "unread") params.set("type", tab.toUpperCase());
            if (tab === "unread") params.set("unreadOnly", "true");
            params.set("limit", "50");

            // Pass remember token in headers so server can authenticate long-lived sessions
            const accessToken = authClient.getAccessToken();
            const rememberToken = authClient.getRefreshToken();
            const headers: Record<string, string> = {};
            if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
            if (rememberToken) headers["x-remember-token"] = rememberToken;

            const res = await fetch(`/api/users/me/notifications?${params.toString()}`, { headers });
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setItems(data.notifications || []);
            setUnreadCount(data.unreadCount ?? 0);
        } catch (err) {
            console.error("Load notifications error:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    async function markRead(id: string) {
        try {
            const accessToken = authClient.getAccessToken();
            const rememberToken = authClient.getRefreshToken();
            const headers: Record<string, string> = {};
            if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
            if (rememberToken) headers["x-remember-token"] = rememberToken;

            const res = await fetch(`/api/users/me/notifications/${id}/read`, { method: "PUT", headers });
            if (!res.ok) throw new Error("failed");
            // update locally
            setItems((cur) => cur.map((c) => (c.id === id ? { ...c, readAt: new Date().toISOString() } : c)));
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (err) {
            console.error("Mark read error", err);
        }
    }

    async function markAllRead() {
        try {
            const accessToken = authClient.getAccessToken();
            const rememberToken = authClient.getRefreshToken();
            const headers: Record<string, string> = {};
            if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
            if (rememberToken) headers["x-remember-token"] = rememberToken;

            const res = await fetch(`/api/users/me/notifications/read-all`, { method: "PUT", headers });
            if (!res.ok) throw new Error("failed");
            // update local state
            setItems((cur) => cur.map((c) => ({ ...c, readAt: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Mark all read error", err);
        }
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-white">Notifications</h1>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-300">Unread: {unreadCount}</div>
                    <button
                        className="px-3 py-1 bg-gray-800 text-gray-200 rounded"
                        onClick={() => { setTab("unread"); }}
                    >
                        Show Unread
                    </button>
                    <button
                        className="px-3 py-1 bg-[#f08c17] text-black rounded"
                        onClick={markAllRead}
                    >
                        Mark all read
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-3 py-2 rounded ${t.id === tab ? "bg-[#f08c17] text-black" : "bg-gray-800 text-gray-300"}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-gray-900 rounded p-4">
                {loading ? (
                    <div className="animate-pulse text-gray-400">Loading notifications…</div>
                ) : items.length === 0 ? (
                    <div className="text-gray-400">No notifications</div>
                ) : (
                    <ul className="space-y-3">
                        {items.map((n) => (
                            <li key={n.id} className="p-3 bg-gray-800 rounded flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <strong className="text-white">{n.title}</strong>
                                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                                        {n.merchant && <span className="text-sm text-gray-300">• {n.merchant.businessName}</span>}
                                        {!n.readAt && <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-600 text-black rounded">UNREAD</span>}
                                    </div>
                                    <div className="text-gray-300 mt-1">{n.body}</div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {!n.readAt && (
                                        <button onClick={() => markRead(n.id)} className="px-2 py-1 bg-[#f08c17] rounded text-black text-sm">Mark read</button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
