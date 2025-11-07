"use client";

import { useState } from "react";
import Modal from "./Modal";
import { api } from "@/lib/api";

interface DisableTwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisableTwoFactorModal({ isOpen, onClose, onSuccess }: DisableTwoFactorModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/api/users/me/disable-2fa", { password });
      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        setError(response.error || "Failed to disable 2FA");
      }
    } catch (err) {
      console.error("Disable 2FA error:", err);
      setError("Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Disable Two-Factor Authentication" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Disabling two-factor authentication will remove the extra security from your account. For security reasons, please enter your
          current password to confirm.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleDisable}
            disabled={loading || !password}
            className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
            type="button"
          >
            {loading ? "Disabling..." : "Disable 2FA"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
