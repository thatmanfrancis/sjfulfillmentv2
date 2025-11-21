'use client';

import { useUser } from '@/hooks/useUser';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/layout';

export default function LogisticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'LOGISTICS')) {
      redirect('/auth/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (!user || user.role !== 'LOGISTICS') {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}