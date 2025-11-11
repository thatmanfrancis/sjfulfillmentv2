"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface SidebarLayoutProps {
    children: React.ReactNode;
}

interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    badge?: string;
}

const iconClasses = "h-5 w-5";

// Navigation icons
const DashboardIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5zM8 11h8" />
    </svg>
);

const OrdersIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const ProductsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const CustomersIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
);

const ReportsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const WarehouseIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const ShipmentsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AdminIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// Additional navigation icons
const InvoicesIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const PaymentsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const ReturnsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
);

const MerchantsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const CategoriesIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
);

const StaffIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const CallLogsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const UsersIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
);

const CurrenciesIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DeliveriesIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4" />
    </svg>
);

const CommissionsIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0z" />
    </svg>
);

const PickingIcon = () => (
    <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
);

// Get navigation items based on user role
const getNavigationItems = (role: string): NavItem[] => {
    const baseItems: NavItem[] = [
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: <DashboardIcon />,
        },
    ];

    switch (role) {
        case "ADMIN":
            return [
                ...baseItems,
                {
                    name: "Orders",
                    href: "/orders",
                    icon: <OrdersIcon />,
                },
                {
                    name: "Products",
                    href: "/products",
                    icon: <ProductsIcon />,
                },
                {
                    name: "Customers",
                    href: "/customers",
                    icon: <CustomersIcon />,
                },
                {
                    name: "Merchants",
                    href: "/merchants",
                    icon: <MerchantsIcon />,
                },
                {
                    name: "Invoices",
                    href: "/invoices",
                    icon: <InvoicesIcon />,
                },
                {
                    name: "Payments",
                    href: "/payments",
                    icon: <PaymentsIcon />,
                },
                {
                    name: "Returns",
                    href: "/returns",
                    icon: <ReturnsIcon />,
                },
                {
                    name: "Shipments",
                    href: "/shipments",
                    icon: <ShipmentsIcon />,
                },
                {
                    name: "Warehouse",
                    href: "/warehouse",
                    icon: <WarehouseIcon />,
                },
                {
                    name: "Categories",
                    href: "/categories",
                    icon: <CategoriesIcon />,
                },
                {
                    name: "Currencies",
                    href: "/currencies",
                    icon: <CurrenciesIcon />,
                },
                {
                    name: "Users",
                    href: "/users",
                    icon: <UsersIcon />,
                },
                {
                    name: "Staff",
                    href: "/staff",
                    icon: <StaffIcon />,
                },
                {
                    name: "Logistics",
                    href: "/admin/logistics",
                    icon: <ShipmentsIcon />,
                },
                {
                    name: "Call Logs",
                    href: "/call-logs",
                    icon: <CallLogsIcon />,
                },
                {
                    name: "Admin Settings",
                    href: "/admin/settings",
                    icon: <AdminIcon />,
                },
                {
                    name: "Audit Logs",
                    href: "/admin/audit-logs",
                    icon: <ReportsIcon />,
                },
                {
                    name: "Commissions",
                    href: "/admin/commissions",
                    icon: <CommissionsIcon />,
                },
                {
                    name: "Reports",
                    href: "/reports",
                    icon: <ReportsIcon />,
                },
                {
                    name: "Settings",
                    href: "/settings",
                    icon: <SettingsIcon />,
                },
            ];

        case "MERCHANT":
            return [
                ...baseItems,
                {
                    name: "My Orders",
                    href: "/orders",
                    icon: <OrdersIcon />,
                },
                {
                    name: "My Products",
                    href: "/products",
                    icon: <ProductsIcon />,
                },
                {
                    name: "My Customers",
                    href: "/customers",
                    icon: <CustomersIcon />,
                },
                {
                    name: "Invoices",
                    href: "/invoices",
                    icon: <InvoicesIcon />,
                },
                {
                    name: "Payments",
                    href: "/payments",
                    icon: <PaymentsIcon />,
                },
                {
                    name: "Returns",
                    href: "/returns",
                    icon: <ReturnsIcon />,
                },
                {
                    name: "Shipments",
                    href: "/shipments",
                    icon: <ShipmentsIcon />,
                },
                {
                    name: "Reports",
                    href: "/reports",
                    icon: <ReportsIcon />,
                },
                {
                    name: "Settings",
                    href: "/merchant/settings",
                    icon: <SettingsIcon />,
                },
            ];

        case "MERCHANT_STAFF":
            return [
                ...baseItems,
                {
                    name: "Orders",
                    href: "/orders",
                    icon: <OrdersIcon />,
                },
                {
                    name: "Products",
                    href: "/products",
                    icon: <ProductsIcon />,
                },
                {
                    name: "Customers",
                    href: "/customers",
                    icon: <CustomersIcon />,
                },
                {
                    name: "Invoices",
                    href: "/invoices",
                    icon: <InvoicesIcon />,
                },
                {
                    name: "Returns",
                    href: "/returns",
                    icon: <ReturnsIcon />,
                },
                {
                    name: "Call Logs",
                    href: "/call-logs",
                    icon: <CallLogsIcon />,
                },
            ];

        case "WAREHOUSE_MANAGER":
            return [
                ...baseItems,
                {
                    name: "Inventory",
                    href: "/warehouse",
                    icon: <WarehouseIcon />,
                },
                {
                    name: "Picking Tasks",
                    href: "/warehouse/picking",
                    icon: <PickingIcon />,
                },
                {
                    name: "Orders",
                    href: "/orders",
                    icon: <OrdersIcon />,
                },
                {
                    name: "Products",
                    href: "/products",
                    icon: <ProductsIcon />,
                },
                {
                    name: "Shipments",
                    href: "/shipments",
                    icon: <ShipmentsIcon />,
                },
                {
                    name: "Returns",
                    href: "/returns",
                    icon: <ReturnsIcon />,
                },
                {
                    name: "Reports",
                    href: "/reports/inventory",
                    icon: <ReportsIcon />,
                },
                {
                    name: "Settings",
                    href: "/settings",
                    icon: <SettingsIcon />,
                },
            ];

        case "LOGISTICS_PERSONNEL":
            return [
                ...baseItems,
                {
                    name: "My Deliveries",
                    href: "/delivery-attempts/assigned-to-me",
                    icon: <ShipmentsIcon />,
                },
                {
                    name: "Shipments",
                    href: "/shipments",
                    icon: <ShipmentsIcon />,
                },
                {
                    name: "Orders",
                    href: "/orders",
                    icon: <OrdersIcon />,
                },
                {
                    name: "Call Logs",
                    href: "/call-logs",
                    icon: <CallLogsIcon />,
                },
            ];

        default:
            return baseItems;
    }
};

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Close sidebar on mobile when route changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Close mobile sidebar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const sidebar = document.getElementById("mobile-sidebar");
            const toggle = document.getElementById("sidebar-toggle");

            if (
                sidebarOpen &&
                sidebar &&
                !sidebar.contains(event.target as Node) &&
                toggle &&
                !toggle.contains(event.target as Node)
            ) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [sidebarOpen]);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    // If still loading or no user, don't render navigation
    if (isLoading || !user) {
        return <>{children}</>;
    }

    const navigationItems = getNavigationItems(user.role);
    const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";

    return (
        <div className="h-screen flex bg-black/90">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                id="mobile-sidebar"
                className={`
          fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-black border-r border-gray-700 transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col
        `}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-center p-4 border-b border-gray-700">
                    <div className="flex justify-center w-full">
                        <Image src="/sjf.png" alt="SJF" width={100} height={100} />
                    </div>

                    {/* Desktop collapse button */}
                    {!sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden lg:block p-1 text-gray-400 hover:text-[#f08c17] transition-colors ml-auto"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                    )}

                    {sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden lg:block p-1 text-gray-400 hover:text-[#f08c17] transition-colors absolute right-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    {navigationItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                            <button
                                key={item.name}
                                onClick={() => router.push(item.href)}
                                className={`
                  w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive
                                        ? "bg-[#f08c17] text-black"
                                        : "text-gray-300 hover:bg-gray-800 hover:text-[#f08c17]"
                                    }
                  ${sidebarCollapsed ? "justify-center" : "justify-start"}
                `}
                                title={sidebarCollapsed ? item.name : undefined}
                            >
                                <span className={`shrink-0 ${sidebarCollapsed ? "" : "mr-3"}`}>
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="flex-1 text-left">{item.name}</span>
                                        {item.badge && (
                                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* User Menu */}
                <div className="border-t border-gray-700 p-4">
                    {!sidebarCollapsed && (
                        <div className="mb-3">
                            <p className="text-sm font-medium text-[#f08c17]">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`
              w-full flex items-center px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors
              ${sidebarCollapsed ? "justify-center" : "justify-start"}
            `}
                        title={sidebarCollapsed ? "Sign Out" : undefined}
                    >
                        <svg className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {!sidebarCollapsed && "Sign Out"}
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-black border-b border-gray-700 px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Mobile menu button */}
                            <button
                                id="sidebar-toggle"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 text-gray-400 hover:text-[#f08c17] transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            {/* Page title (mobile only) */}
                            <h1 className="lg:hidden text-lg font-semibold text-[#f08c17]">
                                SJFulfillment
                            </h1>
                        </div>

                        {/* Right side - user info (desktop only) */}
                        <div className="hidden lg:flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-[#f08c17]">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-gray-400">{user.role}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto bg-gray-900">
                    {children}
                </main>
            </div>
        </div>
    );
}