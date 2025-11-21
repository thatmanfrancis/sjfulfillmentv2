'use client';

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from './admin-sidebar';
import { MerchantSidebar } from './merchant-sidebar';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isMerchant = pathname.startsWith('/merchant');
  return (
    <SidebarProvider defaultOpen={true}>
      {isMerchant ? <MerchantSidebar /> : <AdminSidebar />}
      <SidebarInset className="bg-[#1a1a1a] min-h-screen">
        <div className="flex-1 overflow-auto bg-[#1a1a1a]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}