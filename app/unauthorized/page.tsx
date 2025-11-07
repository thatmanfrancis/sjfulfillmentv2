"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleGoBack = () => {
    if (user?.role === "ADMIN") {
      router.push("/admin");
    } else if (user?.role === "MERCHANT" || user?.role === "MERCHANT_STAFF") {
      router.push("/merchant");
    } else if (user?.role === "WAREHOUSE_MANAGER") {
      router.push("/warehouse");
    } else if (user?.role === "LOGISTICS_PERSONNEL") {
      router.push("/dashboard");
    } else {
      router.push("/dashboard");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="w-full bg-black/90 min-h-dvh flex items-center justify-center text-[#f08c17]">
      <div className="w-[500px] max-md:w-[90%] py-8 flex flex-col items-center bg-black rounded-md border border-gray-700">
        <div>
          <div className="mx-auto h-16 w-16 text-red-500 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-[#f08c17] text-center">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-300 text-center">
            You don't have permission to access this page.
          </p>
          {user && (
            <p className="mt-1 text-xs text-gray-400 text-center">
              Current role: <span className="text-orange-400">{user.role}</span>
            </p>
          )}
        </div>

        <div className="space-y-4 mt-8 w-[90%]">
          <button
            onClick={handleGoBack}
            className="w-full bg-[#f08c17] transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-md h-10 text-black"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full border border-gray-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-md h-10 text-gray-300 hover:bg-gray-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}