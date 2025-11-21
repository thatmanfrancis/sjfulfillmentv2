'use client';

import { useUser } from '@/hooks/useUser';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/layout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      redirect('/auth/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f8c017]"></div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}