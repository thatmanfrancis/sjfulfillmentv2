import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, RefreshCw, Trash2, Key } from "lucide-react";

interface ApiKeyManagerProps {
  adminId?: string;
}

export function ApiKeyManager({ adminId }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (adminId) {
      fetchMerchantApiKey();
    } else {
      fetchAdminApiKey();
    }
  }, [adminId]);

  const fetchMerchantApiKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admin-api-key?adminId=${adminId}`);
      const data = await res.json();
      if (data.apiKey) {
        setApiKey(data.apiKey);
      } else {
        setApiKey("");
      }
    } catch (err) {
      setError("Failed to fetch API key");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminApiKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admin-api-key`);
      const data = await res.json();
      if (data.apiKey) {
        setApiKey(data.apiKey);
      } else {
        setApiKey("");
      }
    } catch (err) {
      setError("Failed to fetch API key");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      let res, data;
      if (adminId) {
        res = await fetch(`/api/admin/admin-api-key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId })
        });
        data = await res.json();
      } else {
        res = await fetch(`/api/admin/admin-api-key`, {
          method: "POST"
        });
        data = await res.json();
      }
      if (data.apiKey) {
        setApiKey(data.apiKey);
      } else {
        setError(data.message || "Failed to create API key");
      }
    } catch (err) {
      setError("Failed to create API key");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admin-api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if ((data.apiKey && !data.error) || (data.success && data.apiKey)) {
        setApiKey(data.apiKey);
        setError(null);
      } else {
        setError(data.message || data.error || "Failed to regenerate API key");
      }
    } catch (err) {
      setError("Failed to regenerate API key");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admin-api-key?adminId=${adminId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setApiKey("");
      } else {
        setError(data.message || "Failed to delete API key");
      }
    } catch (err) {
      setError("Failed to delete API key");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy API key");
    }
  };

  return (
    <Card className="bg-[#1a1a1a] border-gray-700 mb-6">
      <CardContent className="py-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-[#f8c017]" />
          <h3 className="font-medium text-white">Merchant API Key</h3>
          <Badge variant="outline" className="border-[#f8c017]/30 text-[#f8c017] ml-2">Always Visible</Badge>
        </div>
        {error && (
          <div className="text-red-400 mb-2 text-sm">{error}</div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-gray-300">API Key:</Label>
          <Input
            value={apiKey}
            readOnly
            className="bg-[#232323] border-gray-700 text-white font-mono"
            style={{ width: "350px" }}
          />
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={!apiKey} className="border-gray-600">
            {copied ? <Copy className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {!apiKey && (
            <Button onClick={handleCreate} disabled={loading} className="bg-[#f8c017] text-black">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create API Key"}
            </Button>
          )}
          {apiKey && (
            <Button onClick={handleRegenerate} disabled={loading} className="bg-[#f8c017] text-black">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Regenerate
            </Button>
          )}
          {apiKey && (
            <Button onClick={handleDelete} disabled={loading} className="bg-red-600 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}