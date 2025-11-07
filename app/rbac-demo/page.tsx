"use client";

import { useState, useEffect } from "react";
import { useRBAC } from "@/lib/use-rbac";

interface ExampleData {
  id: string;
  name: string;
  merchantId?: string;
  warehouseId?: string;
  assignedTo?: string;
}

export default function RBACExample() {
  const {
    user,
    checkPermission,
    getFilterConditions,
    canAccess,
    getAllowedFieldsForAction,
    canDoBulkOperation,
    filterData,
    isAdmin,
    isMerchant,
    isMerchantStaff,
    isLogisticsPersonnel,
    isWarehouseManager,
  } = useRBAC();

  const [data, setData] = useState<ExampleData[]>([]);

  // Example data with different tenant/ownership patterns
  const sampleData: ExampleData[] = [
    { id: "1", name: "Admin Item", merchantId: "merchant-1" },
    { id: "2", name: "Merchant A Item", merchantId: "merchant-1" },
    { id: "3", name: "Merchant B Item", merchantId: "merchant-2" },
    { id: "4", name: "Warehouse 1 Item", warehouseId: "warehouse-1" },
    { id: "5", name: "Warehouse 2 Item", warehouseId: "warehouse-2" },
    { id: "6", name: "Delivery Item", assignedTo: "logistics-1" },
  ];

  useEffect(() => {
    // Simulate filtering data based on user role
    if (user) {
      const filteredData = filterData('orders', sampleData);
      setData(filteredData);
    }
  }, [user, filterData]);

  if (!user) {
    return <div className="p-6 text-white">Please log in to view this content.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-4">RBAC Example</h1>
        
        {/* User Information */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">Current User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="text-white ml-2">{user.firstName} {user.lastName}</span>
            </div>
            <div>
              <span className="text-gray-400">Role:</span>
              <span className="text-white ml-2">{user.role}</span>
            </div>
            <div>
              <span className="text-gray-400">Email:</span>
              <span className="text-white ml-2">{user.email}</span>
            </div>
            <div>
              <span className="text-gray-400">Merchant ID:</span>
              <span className="text-white ml-2">{user.merchantId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Role Checks */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">Role Checks</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className={`p-2 rounded ${isAdmin() ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              Admin: {isAdmin() ? 'Yes' : 'No'}
            </div>
            <div className={`p-2 rounded ${isMerchant() ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              Merchant: {isMerchant() ? 'Yes' : 'No'}
            </div>
            <div className={`p-2 rounded ${isMerchantStaff() ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              Merchant Staff: {isMerchantStaff() ? 'Yes' : 'No'}
            </div>
            <div className={`p-2 rounded ${isLogisticsPersonnel() ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              Logistics: {isLogisticsPersonnel() ? 'Yes' : 'No'}
            </div>
            <div className={`p-2 rounded ${isWarehouseManager() ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              Warehouse: {isWarehouseManager() ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { resource: 'orders', action: 'create' },
              { resource: 'orders', action: 'read' },
              { resource: 'orders', action: 'update' },
              { resource: 'orders', action: 'delete' },
              { resource: 'products', action: 'create' },
              { resource: 'users', action: 'create' },
              { resource: 'admin', action: 'read' },
              { resource: 'warehouse', action: 'update' },
            ].map((perm, index) => {
              const hasAccess = checkPermission(perm.resource, perm.action);
              return (
                <div key={index} className={`p-2 rounded text-sm ${hasAccess ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {perm.resource}.{perm.action}: {hasAccess ? 'Allowed' : 'Denied'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bulk Operations */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">Bulk Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { resource: 'orders', operation: 'bulk_update' },
              { resource: 'deliveries', operation: 'bulk_assign' },
              { resource: 'products', operation: 'bulk_delete' },
              { resource: 'shipments', operation: 'bulk_process' },
            ].map((bulk, index) => {
              const canDo = canDoBulkOperation(bulk.resource, bulk.operation);
              return (
                <div key={index} className={`p-2 rounded text-sm ${canDo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {bulk.resource} {bulk.operation}: {canDo ? 'Allowed' : 'Denied'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Filter Example */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">Data Filter Conditions</h2>
          <div className="bg-black p-3 rounded border border-gray-600">
            <code className="text-green-400 text-sm">
              {JSON.stringify(getFilterConditions('orders'), null, 2)}
            </code>
          </div>
        </div>

        {/* Allowed Fields */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">Allowed Fields for Orders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-white font-medium mb-2">Create:</h3>
              <div className="flex flex-wrap gap-2">
                {getAllowedFieldsForAction('orders', 'create').map((field, index) => (
                  <span key={index} className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">
                    {field}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">Update:</h3>
              <div className="flex flex-wrap gap-2">
                {getAllowedFieldsForAction('orders', 'update').map((field, index) => (
                  <span key={index} className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filtered Data */}
        <div className="p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-[#f08c17] mb-2">
            Accessible Data ({data.length} of {sampleData.length} items)
          </h2>
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id} className="p-3 bg-black border border-gray-600 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">{item.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    canAccess(item, 'orders') ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {canAccess(item, 'orders') ? 'Accessible' : 'Restricted'}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  ID: {item.id} | Merchant: {item.merchantId || 'N/A'} | Warehouse: {item.warehouseId || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}