import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar, Package } from 'lucide-react';

export default function OrderDetailsModal({ open, onClose, order }: {
  open: boolean;
  onClose: () => void;
  order: any;
}) {
  if (!order) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-2 border-[#f8c017] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Order Details</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">{order.status}</Badge>
            <span className="text-gray-400">Order ID:</span>
            <span className="text-white font-mono">{order.externalOrderId || order.id}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm">Customer: {order.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">{new Date(order.orderDate).toLocaleDateString()}</span>
          </div>
          <div className="text-gray-400 text-xs mb-1">Address:</div>
          <div className="text-white text-sm mb-2">{order.customerAddress}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs mb-2">Products:</div>
          <ul className="divide-y divide-[#f8c017]/10">
            {order.items && order.items.length > 0 ? order.items.map((item: any, idx: number) => (
              <li key={item.id || idx} className="py-2 flex items-center gap-3">
                <Package className="h-4 w-4 text-[#f8c017]" />
                <span className="text-white font-semibold">{item.productName}</span>
                <span className="ml-auto text-[#f8c017] font-bold">x{item.quantity}</span>
                <span className="ml-2 text-gray-400 text-xs">₦{item.price}</span>
              </li>
            )) : (
              <li className="text-gray-500 text-sm italic py-2">No products in this order.</li>
            )}
          </ul>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <span className="text-lg font-bold text-white">Total: ₦{order.totalAmount}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
