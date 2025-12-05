# Notes Integration Guide

## Overview
The notes system has been successfully implemented with the following components:

### Backend (Completed)
1. **Database Schema** - `Note` model created with:
   - `id` (UUID)
   - `content` (String)
   - `createdAt` (DateTime)
   - `updatedAt` (DateTime)
   - `authorId` (String) - References User
   - `orderId` (String, optional) - References Order
   - `shipmentId` (String, optional) - References Shipment

2. **API Endpoints**:
   - `POST /api/notes` - Create a new note
   - `PUT /api/notes/[id]` - Update an existing note (author or admin only)
   - `DELETE /api/notes/[id]` - Delete a note (author or admin only)

3. **Updated APIs to Include Notes**:
   - `GET /api/orders/[id]` - Now includes `Note[]` with author details
   - `GET /api/shipments/[id]` - Now includes `Note[]` with author details

### Frontend (Completed)
1. **NotesComponent** (`components/NotesComponent.tsx`) - Reusable component featuring:
   - Add new notes
   - View all notes with author info and timestamps (formatted with date-fns)
   - Edit notes (author or admin only)
   - Delete notes (author or admin only)
   - Shows edited timestamp if note was modified

## Integration Examples

### Example 1: Order Detail Page

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NotesComponent } from "@/components/NotesComponent";
import { get } from "@/lib/api";

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const fetchOrderDetails = async () => {
    try {
      const data = await get(`/api/orders/${params.id}`);
      setOrder(data.order);
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  };
  
  const fetchUser = async () => {
    try {
      const data = await get('/api/user');
      setUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    fetchUser();
  }, [params.id]);

  if (!order || !user) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Order #{order.externalOrderId || order.id}</h1>
      
      {/* Order Details */}
      <div className="mb-8">
        <p>Customer: {order.customerName}</p>
        <p>Status: {order.status}</p>
        {/* ... other order details ... */}
      </div>

      {/* Notes Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Order Notes</h2>
        <NotesComponent
          notes={order.Note || []}
          orderId={order.id}
          currentUserId={user.id}
          userRole={user.role}
          onNoteAdded={fetchOrderDetails}
          onNoteUpdated={fetchOrderDetails}
          onNoteDeleted={fetchOrderDetails}
        />
      </div>
    </div>
  );
}
```

### Example 2: Shipment Detail Page

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NotesComponent } from "@/components/NotesComponent";
import { get } from "@/lib/api";

export default function ShipmentDetailPage() {
  const params = useParams();
  const [shipment, setShipment] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const fetchShipmentDetails = async () => {
    try {
      const data = await get(`/api/shipments/${params.id}`);
      setShipment(data);
    } catch (error) {
      console.error("Error fetching shipment:", error);
    }
  };
  
  const fetchUser = async () => {
    try {
      const data = await get('/api/user');
      setUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchShipmentDetails();
    fetchUser();
  }, [params.id]);

  if (!shipment || !user) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Shipment #{shipment.trackingNumber}</h1>
      
      {/* Shipment Details */}
      <div className="mb-8">
        <p>Carrier: {shipment.carrierName}</p>
        <p>Delivery Attempts: {shipment.deliveryAttempts}</p>
        {/* ... other shipment details ... */}
      </div>

      {/* Notes Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Shipment Notes</h2>
        <NotesComponent
          notes={shipment.Note || []}
          shipmentId={shipment.id}
          currentUserId={user.id}
          userRole={user.role}
          onNoteAdded={fetchShipmentDetails}
          onNoteUpdated={fetchShipmentDetails}
          onNoteDeleted={fetchShipmentDetails}
        />
      </div>
    </div>
  );
}
```

### Example 3: Modal Integration

```tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotesComponent } from "@/components/NotesComponent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { get } from "@/lib/api";

export function OrderDetailsModal({ orderId, isOpen, onClose }: any) {
  const [order, setOrder] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const fetchOrder = async () => {
    try {
      const data = await get(`/api/orders/${orderId}`);
      setOrder(data.order);
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  };
  
  const fetchUser = async () => {
    try {
      const data = await get('/api/user');
      setUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
      fetchUser();
    }
  }, [isOpen, orderId]);

  if (!order || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes ({order.Note?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            {/* Order details content */}
          </TabsContent>
          
          <TabsContent value="notes">
            <NotesComponent
              notes={order.Note || []}
              orderId={order.id}
              currentUserId={user.id}
              userRole={user.role}
              onNoteAdded={fetchOrder}
              onNoteUpdated={fetchOrder}
              onNoteDeleted={fetchOrder}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

## API Usage

### Creating a Note
```typescript
import { post } from '@/lib/api';

await post('/api/notes', {
  content: 'Your note content here',
  orderId: 'order-uuid', // OR shipmentId: 'shipment-uuid'
});
```

### Updating a Note
```typescript
import { put } from '@/lib/api';

await put(`/api/notes/${noteId}`, {
  content: 'Updated note content',
});
```

### Deleting a Note
```typescript
import { del } from '@/lib/api';

await del(`/api/notes/${noteId}`);
```

## Key Features

1. **Individual Note IDs**: Each note has a unique UUID for precise editing
2. **Author Tracking**: Every note stores the author's ID and displays their full name
3. **Timestamps**: Uses date-fns to format createdAt and updatedAt timestamps
4. **Edit History**: Shows "(edited)" indicator if note was modified after creation
5. **Permissions**: Only note authors and admins can edit or delete notes
6. **Real-time Updates**: Callback functions refresh data after operations
7. **Validation**: Backend validates that either orderId OR shipmentId is provided (not both)

## Styling

The NotesComponent uses:
- Theme color: `#f08c017` for primary actions
- shadcn/ui components (Card, Button, Textarea)
- Responsive layout
- Icon support (Pencil, Trash2, Check, X from lucide-react)

## Next Steps

To fully integrate notes into your application:

1. **Create Order Detail Pages**:
   - `/app/admin/orders/[id]/page.tsx`
   - `/app/merchant/orders/[id]/page.tsx`
   - `/app/logistics/orders/[id]/page.tsx`

2. **Create Shipment Detail Pages**:
   - `/app/admin/shipments/[id]/page.tsx`
   - `/app/logistics/shipments/[id]/page.tsx`

3. **Update Existing Modals**:
   - Add Notes tab to OrderDetailsModal
   - Add Notes tab to any shipment modals

4. **Add Note Counts** to list views:
   ```tsx
   <Badge variant="outline">{order.Note?.length || 0} notes</Badge>
   ```

## Migration Complete

The database has been successfully migrated with the following migration:
- Migration name: `20251205111625_add_note_model`
- Note table created with all relations
- Order model now has `Note[]` relation
- Shipment model now has `Note[]` relation
- User model now has `Note[]` relation (as author)
