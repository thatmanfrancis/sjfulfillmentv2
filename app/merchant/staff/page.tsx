"use client";

import { useState } from "react";
import { get, post, put, del } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";

const AddStaffModal = ({ open, onClose, onAdd, editStaff }: any) => {
  const [name, setName] = useState(editStaff?.name || "");
  const [email, setEmail] = useState(editStaff?.email || "");
  const [role, setRole] = useState(editStaff?.role || "Staff");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, email, role, id: editStaff?.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-8 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {editStaff ? "Edit Staff" : "Add New Staff"}
        </h2>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border border-[#f08c17] rounded px-3 py-2 bg-background text-foreground"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-[#f08c17] rounded px-3 py-2 bg-background text-foreground"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-[#f08c17] rounded px-3 py-2 bg-background text-foreground"
          >
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
          </select>
          <div className="flex gap-2 justify-end">
            <Button onClick={handleSubmit}>{editStaff ? "Save" : "Add"}</Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function StaffPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [staffs, setStaffs] = useState<Staff[]>([]);

  const filteredStaffs = staffs.filter(
    (staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 bg-background min-h-screen py-8 px-4 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Merchant Staffs</h1>
        <p className="text-muted-foreground">
          View and manage merchant staff members.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-4 mb-4">
        <Card className="border border-[#f08c17] bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Staffs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffs.length}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col md:flex-row gap-4 pt-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setModalOpen(true)}>
          Add Staff
        </Button>
      </div>
      <div className="w-full mt-8">
        <table className="w-full text-sm border border-[#f08c17] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="p-2 whitespace-nowrap">Name</th>
              <th className="p-2 whitespace-nowrap">Email</th>
              <th className="p-2 whitespace-nowrap">Role</th>
              <th className="p-2 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaffs.map((staff) => (
              <tr
                key={staff.id}
                className="border-b border-[#f08c17] hover:bg-[#222] transition"
              >
                <td className="p-2 text-white whitespace-nowrap font-semibold">
                  {staff.name}
                </td>
                <td className="p-2 text-white whitespace-nowrap">
                  {staff.email}
                </td>
                <td className="p-2 text-white whitespace-nowrap">
                  {staff.role}
                </td>
                <td className="p-2 text-white whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditStaff(staff);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-2"
                    onClick={async () => {
                      try {
                        const data: any = await del(
                          `/api/merchant/staff?id=${staff.id}`
                        );
                        if (data.success)
                          setStaffs(staffs.filter((s) => s.id !== staff.id));
                        else alert("Error deleting staff");
                      } catch (err: any) {
                        alert("Error: " + err.message);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStaffs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-16 h-16 mb-4 text-[#f08c17] opacity-70" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No merchant staff found
            </h3>
            <p className="text-muted-foreground mb-4">
              Add a new staff to get started.
            </p>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Add Staff
            </Button>
          </div>
        )}
      </div>

      <AddStaffModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditStaff(null);
        }}
        editStaff={editStaff}
        onAdd={async (staff: Staff) => {
          try {
            if (editStaff) {
              const data: any = await put(
                `/api/merchant/staff?id=${staff.id}`,
                {
                  name: staff.name,
                  email: staff.email,
                  role: staff.role,
                }
              );
              if (data.success) {
                setStaffs(
                  staffs.map((s) =>
                    s.id === staff.id ? { ...s, ...staff } : s
                  )
                );
              } else {
                alert("Error: " + (data.error || "Could not edit staff"));
              }
            } else {
              const data: any = await post("/api/merchant/staff", {
                name: staff.name,
                email: staff.email,
                role: staff.role,
              });
              if (data.success) {
                setStaffs([...staffs, { ...staff, id: data.userId }]);
              } else {
                alert("Error: " + (data.error || "Could not create staff"));
              }
            }
          } catch (err: any) {
            alert("Error: " + err.message);
          }
        }}
      />
    </div>
  );
}
