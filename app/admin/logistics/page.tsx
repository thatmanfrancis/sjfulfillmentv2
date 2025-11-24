"use client";
import { useState, useEffect } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddLogisticsModal from '@/components/admin/AddLogisticsModal';
import LogisticsDetailsModal from '@/components/admin/LogisticsDetailsModal';
import { Eye } from 'lucide-react';
import EditLogisticsModal from '@/components/admin/EditLogisticsModal';

interface LogisticsPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
}


export default function AdminLogisticsPage() {

  const [logistics, setLogistics] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  const fetchLogistics = async () => {
    const res = await fetch('/api/admin/logistics');
    if (res.ok) {
      // Support both array and { users: [] } API responses
      const data = await res.json();
      setLogistics(Array.isArray(data) ? data : data.users || []);
    }
  };

  useEffect(() => {
    fetchLogistics();
  }, []);

  const handleView = (person: any) => {
    setSelectedPerson(person);
    setDetailsOpen(true);
  };
  const handleEdit = (person: any) => {
    setSelectedPerson(person);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-white">Logistics Personnel</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-[#f8c017] text-black font-semibold hover:bg-[#e6b800]">
          Add Logistics
        </Button>
      </div>
      <AddLogisticsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onLogisticsAdded={fetchLogistics} />
      <LogisticsDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} person={selectedPerson} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {logistics.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🚚</div>
            <div className="text-lg text-[#f8c017] font-semibold mb-2">No logistics personnel found</div>
            <div className="text-gray-400">Click "Add Logistics" to invite your first logistics partner.</div>
          </div>
        ) : (
          logistics.map((person) => (
            <Card key={person.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 h-full flex flex-col cursor-pointer" onClick={() => handleEdit(person)}>
              <CardContent className="p-4 flex flex-col gap-3 h-full">
                <div className="font-semibold text-white text-lg mb-1">
                  {person.firstName} {person.lastName}
                </div>
                <div className="text-gray-400 text-sm">
                  <div>Email: {person.email}</div>
                  <div>Phone: {person.phone}</div>
                  <div>Status: {person.status || (person.isActive ? 'Verified' : 'Pending')}</div>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <Button size="icon" variant="outline" className="text-[#f8c017] border-[#f8c017]/20" title="View Details" onClick={(e) => { e.stopPropagation(); handleView(person); }}>
                    <Eye className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <EditLogisticsModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={selectedPerson}
        onUpdated={fetchLogistics}
      />
    </div>
  );
}
