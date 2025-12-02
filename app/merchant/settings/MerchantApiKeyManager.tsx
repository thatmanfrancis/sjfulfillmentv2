"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MerchantApiKey {
  id: string;
  apiKey: string;
  name: string;
  isRevoked: boolean;
}

export function MerchantApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<MerchantApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function fetchKeys() {
    setLoading(true);
    try {
      const res: any = await fetch("/api/merchant/merchant-api-key");
      const data = await res.json();
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      setError("Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function createKey() {
    if (!newKeyName) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/merchant/merchant-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setNewKeyName("");
        await fetchKeys();
      } else {
        setError(data.error || "Failed to create API key");
      }
    } catch (err) {
      setError("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: any) {
    setError("");
    try {
      await fetch("/api/merchant/merchant-api-key", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchKeys();
    } catch (err) {
      setError("Failed to revoke API key");
    }
  }

  return (
    <Card className="border border-[#f08c17] bg-card shadow-sm mt-8">
      <CardHeader>
        <CardTitle>Merchant API Keys</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="API Key Name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="border border-[#f08c17] rounded px-3 py-2 bg-background text-foreground"
            disabled={creating}
          />
          <Button onClick={createKey} disabled={creating || !newKeyName}>
            {creating ? "Creating..." : "Create API Key"}
          </Button>
        </div>
        {error && <div className="text-red-400 mb-2 text-sm">{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-muted-foreground">No API keys found.</div>
        ) : (
          <table className="w-full text-sm border border-[#f08c17] rounded-lg overflow-hidden">
            <thead>
              <tr>
                <th className="p-2 whitespace-nowrap">Name</th>
                <th className="p-2 whitespace-nowrap">Key</th>
                <th className="p-2 whitespace-nowrap">Status</th>
                <th className="p-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-b border-[#f08c17]">
                  <td className="p-2 text-white whitespace-nowrap">
                    {key.name}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {key.apiKey}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {key.isRevoked ? "Revoked" : "Active"}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {!key.isRevoked && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => revokeKey(key.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
