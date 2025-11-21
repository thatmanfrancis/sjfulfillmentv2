import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Package, Truck } from 'lucide-react';

interface LogisticsDetailsModalProps {
  open: boolean;
  onClose: () => void;
  person: any | null;
}

export default function LogisticsDetailsModal({ open, onClose, person }: LogisticsDetailsModalProps) {
  if (!person) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Logistics Partner Details</DialogTitle>
        </DialogHeader>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="font-semibold text-white text-lg mb-1">
              {person.firstName} {person.lastName}
            </div>
            <div className="text-gray-400 text-sm">
              <div>Email: {person.email}</div>
              <div>Phone: {person.phone}</div>
              <div>Status: {person.status}</div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2 text-[#f8c017]">
                <Truck className="w-5 h-5" />
                <span>Deliveries: {person.totalOrders ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 text-[#f8c017] mt-2">
                <BarChart3 className="w-5 h-5" />
                <span>Completed: {person.completedOrders ?? 0}</span>
              </div>
              {/* Add more analytics as needed */}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
