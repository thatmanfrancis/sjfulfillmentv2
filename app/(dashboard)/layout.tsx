import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SJFulfillment Dashboard',
  description: 'Manage your logistics operations with SJFulfillment',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-brand-dark dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-brand-dark">
          {children}
        </main>
      </div>
    </div>
  );
}