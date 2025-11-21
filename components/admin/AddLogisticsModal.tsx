import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, User, Loader2 } from 'lucide-react';

interface AddLogisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogisticsAdded: () => void;
}

export default function AddLogisticsModal({ isOpen, onClose, onLogisticsAdded }: AddLogisticsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to add logistics partner');
      onLogisticsAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-[#f8c017] shadow-[0_0_16px_2px_#f8c01755]">
        <DialogHeader>
          <DialogTitle className="text-white">Add Logistics Partner</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="firstName" className="text-[#f8c017] mb-1 block">First Name</Label>
            <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required
              placeholder="Enter first name"
              className="bg-[#181818] border border-[#f8c017] text-white placeholder:text-[#f8c017bb] focus:border-[#f8c017] focus:ring-[#f8c017]" />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-[#f8c017] mb-1 block">Last Name</Label>
            <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required
              placeholder="Enter last name"
              className="bg-[#181818] border border-[#f8c017] text-white placeholder:text-[#f8c017bb] focus:border-[#f8c017] focus:ring-[#f8c017]" />
          </div>
          <div>
            <Label htmlFor="email" className="text-[#f8c017] mb-1 block">Email</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required
              placeholder="Enter email address"
              className="bg-[#181818] border border-[#f8c017] text-white placeholder:text-[#f8c017bb] focus:border-[#f8c017] focus:ring-[#f8c017]" />
          </div>
          <div>
            <Label htmlFor="phone" className="text-[#f8c017] mb-1 block">Phone</Label>
            <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required
              placeholder="Enter phone number"
              className="bg-[#181818] border border-[#f8c017] text-white placeholder:text-[#f8c017bb] focus:border-[#f8c017] focus:ring-[#f8c017]" />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" disabled={isLoading} className="w-full bg-[#f8c017] text-black font-semibold hover:bg-[#e6b800]">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Add Logistics'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
