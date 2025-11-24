// import { useState, useEffect } from "react";
// function formatCurrency(amount: number, currency: string) {
//   if (!currency) return amount;
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency,
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(amount);
// }

// interface Merchant {
//   id: string;
//   name: string;
// }

// interface Tier {
//   id: string;
//   serviceType: string;
//   baseRate: number;
//   negotiatedRate: number;
//   rateUnit: string;
//   currency: string;
//   Business?: { id: string; name: string };
// }

// interface ModalData {
//   serviceType?: string;
//   baseRate?: string;
//   negotiatedRate?: string;
//   rateUnit?: string;
//   currency?: string;
//   merchantId?: string;
// }
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { get, post, patch } from "@/lib/api";

// export default function AdminPriceTierPage() {
//   const [tiers, setTiers] = useState<Tier[]>([]);
//   const [search, setSearch] = useState("");
//   const [showModal, setShowModal] = useState(false);
//   const [modalData, setModalData] = useState<ModalData>({});
//   const [merchants, setMerchants] = useState<Merchant[]>([]);
//   const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchTiers();
//     fetchMerchants();
//   }, []);

//   const fetchTiers = async () => {
//     setLoading(true);
//     const res = await get(`/api/admin/price-tiers`) as any;
//     setTiers(res?.pricingTiers || []);
//     setLoading(false);
//   };

//   const fetchMerchants = async () => {
//     const res = await get(`/api/admin/businesses`) as any;
//     setMerchants(res?.businesses || []);
//   };

//   const handleCreate = async () => {
//     await post(`/api/admin/price-tiers`, modalData);
//     setShowModal(false);
//     fetchTiers();
//   };

//   const handleSearchMerchant = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearch(e.target.value);
//     setSelectedMerchant(null);
//   };

//   const filteredMerchants = merchants.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

//   return (
//     <div className="min-h-screen bg-[#1a1a1a] p-8 space-y-6">
//       <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
//         <CardHeader>
//           <CardTitle className="text-white">Price Tiers</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Button className="bg-[#f8c017] text-black mb-4" onClick={() => { setShowModal(true); setModalData({}); }}>Create Price Tier</Button>
//           <Input placeholder="Search merchants..." value={search} onChange={handleSearchMerchant} className="mb-4 bg-[#1a1a1a] border-gray-600 text-white" />
//           {search && (
//             <div className="mb-4">
//               <div className="text-gray-300 mb-2">Select Merchant:</div>
//               {filteredMerchants.map(m => (
//                 <Button key={m.id} variant={selectedMerchant === m.id ? "default" : "outline"} className="mr-2 mb-2" onClick={() => setSelectedMerchant(m.id)}>{m.name}</Button>
//               ))}
//             </div>
//           )}
//           <div className="overflow-x-auto">
//             <table className="min-w-full text-sm text-left">
//               <thead>
//                 <tr className="bg-[#222] text-[#f8c017]">
//                   <th className="p-2">Service Type</th>
//                   <th className="p-2">Base Rate</th>
//                   <th className="p-2">Negotiated Rate</th>
//                   <th className="p-2">Rate Unit</th>
//                   <th className="p-2">Currency</th>
//                   <th className="p-2">Merchant</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {tiers.filter(t => !selectedMerchant || t.Business?.id === selectedMerchant).map(tier => (
//                   <tr key={tier.id} className="border-b border-[#f8c017]/10">
//                     <td className="p-2 text-white">{tier.serviceType}</td>
//                     <td className="p-2 text-white">{formatCurrency(tier.baseRate, tier.currency)}</td>
//                     <td className="p-2 text-white">{formatCurrency(tier.negotiatedRate, tier.currency)}</td>
//                     <td className="p-2 text-white">{tier.rateUnit}</td>
//                     <td className="p-2 text-white">{tier.currency}</td>
//                     <td className="p-2 text-white">{tier.Business?.name || "Global"}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>
//       <Dialog open={showModal} onOpenChange={setShowModal}>
//         <DialogContent className="bg-[#222] border-[#f8c017]/20">
//           <DialogHeader>
//             <DialogTitle className="text-[#f8c017]">Create Price Tier</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             <Input placeholder="Service Type" value={modalData.serviceType || ""} onChange={e => setModalData({ ...modalData, serviceType: e.target.value })} className="bg-[#1a1a1a] border-gray-600 text-white" />
//             <Input placeholder="Base Rate" type="number" value={modalData.baseRate || ""} onChange={e => setModalData({ ...modalData, baseRate: e.target.value })} className="bg-[#1a1a1a] border-gray-600 text-white" />
//             <Input placeholder="Negotiated Rate" type="number" value={modalData.negotiatedRate || ""} onChange={e => setModalData({ ...modalData, negotiatedRate: e.target.value })} className="bg-[#1a1a1a] border-gray-600 text-white" />
//             <Input placeholder="Rate Unit" value={modalData.rateUnit || ""} onChange={e => setModalData({ ...modalData, rateUnit: e.target.value })} className="bg-[#1a1a1a] border-gray-600 text-white" />
//             <Input placeholder="Currency" value={modalData.currency || ""} onChange={e => setModalData({ ...modalData, currency: e.target.value })} className="bg-[#1a1a1a] border-gray-600 text-white" />
//             <div className="flex gap-2 items-center">
//               <span className="text-gray-300">Assign to Merchant:</span>
//               <select value={modalData.merchantId || ""} onChange={e => setModalData({ ...modalData, merchantId: e.target.value })} className="bg-[#1a1a1a] border-gray-600 text-white">
//                 <option value="">Global</option>
//                 {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
//               </select>
//             </div>
//           </div>
//           <DialogFooter>
//             <Button className="bg-[#f8c017] text-black" onClick={handleCreate}>Create</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

"use client";

export default function PriceTier () {
    return (
        <>
        <div>Returns</div>
        </>
    )
}