"use client";

import { useAuth } from "@/lib/auth-context";
import SidebarLayout from "./SidebarLayout";
import Image from "next/image";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full bg-black/90 min-h-dvh flex items-center justify-center text-[#f08c17]">
        <div className="w-[500px] max-md:w-[90%] py-4 flex flex-col items-center bg-black rounded-md">
          <Image src="/sjf.png" alt="SJF" width={150} height={150} />
          <div className="my-2" />
          <div className="text-2xl max-md:text-xl font-semibold tracking-wide">Loading...</div>
          {/* <div className="text-gray-300">Setting up your session</div> */}
          <div className="my-4" />
          <div className="flex items-center gap-3 h-6">
            <div className="h-4 w-4 rounded-full bg-[#f08c17] animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
            <div className="h-4 w-4 rounded-full bg-[#f08c17] animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
            <div className="h-4 w-4 rounded-full bg-[#f08c17] animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, just render children (login/public pages)
  if (!user) {
    return <>{children}</>;
  }

  // If authenticated, use sidebar layout
  return <SidebarLayout>{children}</SidebarLayout>;
}