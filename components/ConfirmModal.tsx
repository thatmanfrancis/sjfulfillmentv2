"use client";

import React from "react";

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export default function ConfirmModal({ open, title = "Confirm", message, onCancel, onConfirm, confirmLabel = "Confirm" }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-black border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {message && <p className="text-sm text-gray-300 mt-2">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 text-white">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
