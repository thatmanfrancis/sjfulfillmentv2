"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Warehouse,
  MapPin,
  Building,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { post } from "@/lib/api";

interface CreateWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  region: string;
  address: string;
  city: string;
  state: string;
  country: string;
  contactPhone: string;
  contactEmail: string;
  manager: string;
  capacity: string;
  type: "FULFILLMENT" | "STORAGE" | "DISTRIBUTION" | "CROSS_DOCK";
  description: string;
}

export default function CreateWarehouseModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWarehouseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    region: "",
    address: "",
    city: "",
    state: "",
    country: "Nigeria",
    contactPhone: "",
    contactEmail: "",
    manager: "",
    capacity: "",
    type: "STORAGE",
    description: "",
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(""); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prepare data for API
      const submitData = {
        name: formData.name.trim(),
        region: formData.region.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        country: formData.country.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        manager: formData.manager.trim() || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        type: formData.type,
        description: formData.description.trim() || undefined,
      };

      const result = (await post("/api/logistics/warehouses", submitData)) as {
        success: boolean;
        error?: string;
      };

      if (result.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          name: "",
          region: "",
          address: "",
          city: "",
          state: "",
          country: "Nigeria",
          contactPhone: "",
          contactEmail: "",
          manager: "",
          capacity: "",
          type: "STORAGE",
          description: "",
        });
      } else {
        setError(result.error || "Failed to create warehouse");
      }
    } catch (error: any) {
      console.error("Error creating warehouse:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <Card className="bg-[#2a2a2a] border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-[#f8c017]" />
                Create New Warehouse
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Add a new warehouse facility to the logistics network
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building className="h-4 w-4 text-[#f8c017]" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-white">
                    Warehouse Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter warehouse name"
                  />
                </div>

                <div>
                  <Label htmlFor="type" className="text-white">
                    Warehouse Type
                  </Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      handleInputChange("type", e.target.value as any)
                    }
                    className="w-full h-10 px-3 bg-[#1f1f1f] border border-gray-600 rounded-md text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  >
                    <option value="STORAGE">Storage</option>
                    <option value="FULFILLMENT">Fulfillment</option>
                    <option value="DISTRIBUTION">Distribution</option>
                    <option value="CROSS_DOCK">Cross Dock</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-white">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Brief description of the warehouse"
                  rows={2}
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#f8c017]" />
                Location Information
              </h3>

              <div>
                <Label htmlFor="address" className="text-white">
                  Address *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                  className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-white">
                    City *
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    required
                    className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-white">
                    State
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="State/Province"
                  />
                </div>

                <div>
                  <Label htmlFor="country" className="text-white">
                    Country *
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    required
                    className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Country"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="region" className="text-white">
                  Region *
                </Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => handleInputChange("region", e.target.value)}
                  required
                  className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Service region (e.g., Lagos, Abuja, Port Harcourt)"
                />
              </div>
            </div>

            {/* Contact & Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-[#f8c017]" />
                Contact & Management
              </h3>

              <div>
                <Label htmlFor="manager" className="text-white">
                  Manager Name
                </Label>
                <Input
                  id="manager"
                  value={formData.manager}
                  onChange={(e) => handleInputChange("manager", e.target.value)}
                  className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Warehouse manager name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail" className="text-white">
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      handleInputChange("contactEmail", e.target.value)
                    }
                    className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="warehouse@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone" className="text-white">
                    Contact Phone
                  </Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      handleInputChange("contactPhone", e.target.value)
                    }
                    className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="+234 xxx xxx xxxx"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="capacity" className="text-white">
                  Storage Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    handleInputChange("capacity", e.target.value)
                  }
                  min="1"
                  className="bg-[#1f1f1f] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Maximum capacity (items)"
                />
              </div>
            </div>
          </CardContent>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.name ||
                !formData.region ||
                !formData.address ||
                !formData.city ||
                !formData.country
              }
              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Warehouse"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
