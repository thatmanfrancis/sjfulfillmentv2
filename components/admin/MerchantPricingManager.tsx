'use client';

import { useState } from 'react';

// Minimal placeholder component to resolve compilation errors
export default function MerchantPricingManager({ 
  merchantId, 
  onClose 
}: {
  merchantId: string;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-white">Merchant Pricing Manager</h2>
      <p className="text-gray-400">Component under maintenance</p>
      {onClose && (
        <button 
          onClick={onClose}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Close
        </button>
      )}
    </div>
  );
}