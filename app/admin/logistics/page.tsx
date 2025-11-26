"use client";
import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
// Custom modal for profile/actions tabs



import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddLogisticsModal from '@/components/admin/AddLogisticsModal';
import LogisticsDetailsModal from '@/components/admin/LogisticsDetailsModal';
import { Eye } from 'lucide-react';
import { Pencil } from 'lucide-react';
import EditLogisticsModal from '@/components/admin/EditLogisticsModal';

function ProfileActionsModal({ open, onClose, person }: any) {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({ firstName: person?.firstName || '', lastName: person?.lastName || '', email: person?.email || '', phone: person?.phone || '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && person?.id) {
      setLoadingShipments(true);
      fetch(`/api/admin/shipments/logistics/${person.id}`)
        .then(res => res.json())
        .then(data => setShipments(data.shipments || []))
        .finally(() => setLoadingShipments(false));
    }
  }, [open, person]);

  const handleDelete = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/logistics/${person.id}`, { method: 'DELETE' });
      if (res.ok) {
        onClose();
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/logistics/${person.id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password })
      });
      if (res.ok) {
        setShowPasswordModal(false);
        setPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSave = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/logistics/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setShowEditModal(false);
        onClose();
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!open || !person) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#232323] rounded-lg p-8 max-w-lg w-full border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Avatar />
          <div>
            <div className="font-semibold text-lg text-white">{person.firstName} {person.lastName}</div>
            <div className="text-sm text-gray-400">{person.email}</div>
            <div className="text-sm text-gray-400">{person.phone}</div>
          </div>
        </div>
        <Tabs defaultValue="profile" className="mt-2">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <div className="space-y-2 mt-4">
              <div><span className="font-medium text-white">Name:</span> {person.firstName} {person.lastName}</div>
              <div><span className="font-medium text-white">Email:</span> {person.email}</div>
              <div><span className="font-medium text-white">Phone:</span> {person.phone}</div>
              <div><span className="font-medium text-white">Role:</span> {person.role || person.status}</div>
            </div>
          </TabsContent>
          <TabsContent value="actions">
            <div className="space-y-4 mt-4">
              <div>
                <div className="font-semibold text-white mb-2">Previous Shipments</div>
                {loadingShipments ? (
                  <div className="text-gray-400">Loading...</div>
                ) : shipments.length === 0 ? (
                  <div className="text-gray-400">No completed shipments found.</div>
                ) : (
                  <ul className="max-h-40 overflow-y-auto space-y-2">
                    {shipments.map((s: any) => (
                      <li key={s.id} className="bg-[#18181b] p-2 rounded text-gray-200 text-sm">
                        <div><span className="font-bold">Tracking:</span> {s.trackingNumber || 'N/A'}</div>
                        <div><span className="font-bold">Order:</span> {s.orderId}</div>
                        <div><span className="font-bold">Delivered:</span> {s.lastStatusUpdate ? new Date(s.lastStatusUpdate).toLocaleDateString() : 'N/A'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit Account
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteConfirm(true)}>
                  <span className="mr-2">Delete</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end mt-6">
          <button className="px-4 py-2 rounded bg-gray-700 text-white" onClick={onClose}>Close</button>
        </div>
        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-[#232323] rounded-lg p-8 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Edit Logistics Details</h2>
              <input className="w-full mb-2 p-2 rounded border border-[#f08c17]" placeholder="First Name" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              <input className="w-full mb-2 p-2 rounded border border-[#f08c17]" placeholder="Last Name" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              <input className="w-full mb-2 p-2 rounded border border-[#f08c17]" placeholder="Email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              <input className="w-full mb-2 p-2 rounded border border-[#f08c17]" placeholder="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" onClick={() => setShowEditModal(false)} className="bg-gray-700 text-white">Cancel</Button>
                <Button type="button" onClick={handleEditSave} className="bg-[#f8c017] text-black" disabled={actionLoading}>{actionLoading ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </div>
        )}
        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-[#232323] rounded-lg p-8 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
              <input className="w-full mb-2 p-2 rounded border border-[#f08c17]" type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} />
              {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" onClick={() => setShowPasswordModal(false)} className="bg-gray-700 text-white">Cancel</Button>
                <Button type="button" onClick={handlePasswordChange} className="bg-[#f8c017] text-black" disabled={actionLoading}>{actionLoading ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-[#232323] rounded-lg p-8 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Are you sure you want to delete this account?</h2>
              {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" onClick={() => setShowDeleteConfirm(false)} className="bg-gray-700 text-white">Cancel</Button>
                <Button type="button" onClick={handleDelete} className="bg-red-600 text-white" disabled={actionLoading}>{actionLoading ? "Deleting..." : "Delete"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    setProfileModalOpen(true);
  };
  const handleEdit = (person: any) => {
    setSelectedPerson(person);
    setEditOpen(true);
  };

  // Filter logistics by search term
  const filteredLogistics = logistics.filter((person) => {
    const term = searchTerm.toLowerCase();
    return (
      person.firstName?.toLowerCase().includes(term) ||
      person.lastName?.toLowerCase().includes(term) ||
      person.email?.toLowerCase().includes(term) ||
      person.phone?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-white">Logistics Personnel</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-[#f8c017] text-black font-semibold hover:bg-[#e6b800]">
          Add Logistics
        </Button>
      </div>
      {/* Search input */}
      <div className="mb-6 max-w-md">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-10 px-4 rounded-md border border-gray-600 bg-[#18181b] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
        />
      </div>
      <AddLogisticsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onLogisticsAdded={fetchLogistics} />
      <LogisticsDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} person={selectedPerson} />
      <ProfileActionsModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} person={selectedPerson} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredLogistics.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🚚</div>
            <div className="text-lg text-[#f8c017] font-semibold mb-2">No logistics personnel found</div>
            <div className="text-gray-400">Click "Add Logistics" to invite your first logistics partner.</div>
          </div>
        ) : (
          filteredLogistics.map((person) => {
            return (
              <Card key={person.id} className="bg-linear-to-br from-[#23232b] to-[#18181b] border border-[#f8c017]/30 shadow-lg h-full flex flex-col cursor-pointer hover:scale-[1.02] transition-all duration-150" onClick={() => handleEdit(person)}>
                <CardContent className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-white text-lg">
                        {person.firstName} {person.lastName}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">{person.phone}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-blue-500 hover:bg-blue-900/20" title="Edit Account" onClick={(e) => { e.stopPropagation(); handleEdit(person); }}>
                      <Pencil className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="text-gray-400 text-sm mb-2">
                    <div><span className="font-bold text-[#f8c017]">Email:</span> {person.email}</div>
                    <div><span className="font-bold text-[#f8c017]">Phone:</span> {person.phone}</div>
                    <div><span className="font-bold text-[#f8c017]">Status:</span> {person.status || (person.isActive ? 'Verified' : 'Pending')}</div>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <Button size="icon" variant="outline" className="text-[#f8c017] border-[#f8c017]/20" title="View Details" onClick={(e) => { e.stopPropagation(); handleView(person); }}>
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
                {/* ...no inline Modal, only EditLogisticsModal and ProfileActionsModal at root... */}
              </Card>
            )
          })
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
