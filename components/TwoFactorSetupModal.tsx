"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Modal from "./Modal";
import Image from "next/image";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const initiate2FA = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post("/api/users/me/enable-2fa");
      if (response.ok && response.data) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setBackupCodes(response.data.backupCodes);
        setStep('verify');
      } else {
        setError(response.error || "Failed to initiate 2FA setup");
      }
    } catch (error) {
      console.error("Failed to initiate 2FA:", error);
      setError("Failed to initiate 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post("/api/users/me/verify-2fa", {
        code: verificationCode,
      });
      
      if (response.ok) {
        setShowBackupCodes(true);
      } else {
        setError(response.error || "Invalid verification code");
      }
    } catch (error) {
      console.error("Failed to verify 2FA:", error);
      setError("Failed to verify 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('setup');
    setQrCode("");
    setSecret("");
    setBackupCodes([]);
    setVerificationCode("");
    setShowBackupCodes(false);
    setError(null);
    onClose();
  };

  const handleFinish = () => {
    onSuccess();
    handleClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Enable Two-Factor Authentication
        </h3>
        <p className="text-gray-400 text-sm">
          Two-factor authentication adds an extra layer of security to your account.
          You'll need an authenticator app like Google Authenticator or Authy.
        </p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium text-white mb-2">Steps to set up 2FA:</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
          <li>Click "Generate QR Code" below</li>
          <li>Scan the QR code with your authenticator app</li>
          <li>Enter the 6-digit code from your app to verify</li>
        </ol>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={initiate2FA}
          disabled={loading}
          className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate QR Code"}
        </button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Scan QR Code
        </h3>
        <p className="text-gray-400 text-sm">
          Scan this QR code with your authenticator app, then enter the 6-digit code below.
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-lg">
          {qrCode && (
            <Image
              src={qrCode}
              alt="2FA QR Code"
              width={200}
              height={200}
              className="rounded"
            />
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium text-white mb-2">Can't scan? Enter this code manually:</h4>
        <div className="flex items-center space-x-2">
          <code className="bg-black px-3 py-1 rounded text-[#f08c17] text-sm flex-1">
            {secret}
          </code>
          <button
            onClick={() => copyToClipboard(secret)}
            className="text-gray-400 hover:text-white text-sm"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Verification */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Verification Code
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit code"
          className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          maxLength={6}
        />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={verify2FA}
          disabled={loading || verificationCode.length !== 6}
          className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify & Enable"}
        </button>
      </div>
    </div>
  );

  const renderBackupCodes = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          ✅ Two-Factor Authentication Enabled!
        </h3>
        <p className="text-gray-400 text-sm">
          Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
        </p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium text-white mb-3">Backup Recovery Codes</h4>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-black p-2 rounded text-center">
              <code className="text-[#f08c17] text-sm">{code}</code>
            </div>
          ))}
        </div>
        <button
          onClick={() => copyToClipboard(backupCodes.join('\n'))}
          className="mt-3 text-sm text-gray-400 hover:text-white"
        >
          Copy all codes
        </button>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-300 px-4 py-3 rounded">
        <p className="text-sm">
          ⚠️ <strong>Important:</strong> Store these codes securely. Each code can only be used once.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleFinish}
          className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
        >
          Finish Setup
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      {showBackupCodes ? renderBackupCodes() : step === 'setup' ? renderSetupStep() : renderVerifyStep()}
    </Modal>
  );
}