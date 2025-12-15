import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectContent } from "@/components/ui/select";
import { post } from "@/lib/api";

const USER_FIELDS = [
  { label: "ID", value: "id" },
  { label: "Email", value: "email" },
  { label: "First Name", value: "firstName" },
  { label: "Last Name", value: "lastName" },
  { label: "Role", value: "role" },
  { label: "Verified", value: "isVerified" },
  { label: "Created At", value: "createdAt" },
  // Add more fields as needed
];

const EXPORT_FORMATS = [
  { label: "CSV", value: "csv" },
  { label: "Excel", value: "xlsx" },
  { label: "JSON", value: "json" },
];

export function ExportUsersModal({ open, onClose }) {
  const [format, setFormat] = useState("csv");
  const [fields, setFields] = useState(USER_FIELDS.map((f) => f.value));
  const [filters, setFilters] = useState({
    role: "",
    isVerified: "",
    dateFrom: "",
    dateTo: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleFieldToggle = (field) => {
    setFields(
      fields.includes(field)
        ? fields.filter((f) => f !== field)
        : [...fields, field]
    );
  };

  const handleExport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDownloadUrl("");
    try {
      const { url } = await post("/api/admin/users/export", {
        format,
        fields,
        filters,
      });
      setDownloadUrl(url);
    } catch (err) {
      setError(err.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Users</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleExport} className="space-y-4">
          <div>
            <label className="font-medium">Export Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectContent>
                {EXPORT_FORMATS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-medium">Fields to Export</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {USER_FIELDS.map((field) => (
                <label key={field.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={fields.includes(field.value)}
                    onCheckedChange={() => handleFieldToggle(field.value)}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="font-medium">Filters (optional)</label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Role"
                value={filters.role}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, role: e.target.value }))
                }
              />
              <Input
                placeholder="Verified (true/false)"
                value={filters.isVerified}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, isVerified: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
              />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {downloadUrl && (
            <div className="text-green-600 text-sm">
              Export ready.{" "}
              <a href={downloadUrl} download className="underline">
                Download file
              </a>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
