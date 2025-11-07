"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is authenticated, redirect to dashboard
        router.push("/dashboard");
      } else {
        // User is not authenticated, redirect to login
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  // Show loading spinner while checking authentication
  return (
    <div className="w-full bg-black/90 min-h-dvh flex items-center justify-center text-[#f08c17]">
      <div className="w-[500px] max-md:w-[90%] py-4 flex flex-col items-center bg-black rounded-md">
        <Image alt="SJF" src={"/sjf.png"} loading="lazy" width={150} height={150} />
        <div className="my-2" />
        <div className="text-2xl max-md:text-xl font-semibold tracking-wide">Loading...</div>
        <div className="text-gray-300">Setting up your sessions</div>
        <div className="my-4" />
        <div className="">
          <div className="w-4 h-4 bg-[#f08c17]"></div>
        </div>
      </div>
    </div>
  );
}