import type { Metadata } from "next";
import { Geist, Geist_Mono, Red_Hat_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { OfflineModal } from "@/components/offline-modal";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const redHatDisplay = Red_Hat_Display({
  variable: "--font-red-hat-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SJFulfillment - 3PL Logistics Platform",
  description: "Complete fulfillment and logistics management platform for e-commerce businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${redHatDisplay.variable} antialiased bg-[#1a1a1a] text-white font-red-hat-display`}
      >
        {children}
        <Toaster />
        <OfflineModal />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          toastStyle={{
            backgroundColor: '#1a1a1a',
            color: 'white',
            border: '1px solid #f8c017',
          }}
        />
      </body>
    </html>
  );
}
