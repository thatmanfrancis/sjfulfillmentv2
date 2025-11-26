import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SJFulfillment - Authentication',
  description: 'Sign in to your SJFulfillment account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
          <div className="flex min-h-screen">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-black to-gray-900 relative">
              <div className="absolute inset-0 bg-[#f8c017]/10"></div>
              <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
                <div className="max-w-md">
                  <div className="mb-8">
                    {/* Logo Placeholder */}
                    <div className="flex justify-center mb-6">
                      <div className="flex items-center justify-center">
                        <Image src="/sjflogo.png" alt="Sjf" width={200} height={200} />
                        <div className=" rounded"></div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-lg text-center">
                      Your trusted 3PL logistics partner
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0 w-12 h-12 bg-[#f8c017]/20 rounded-lg flex items-center justify-center border border-[#f8c017]/30">
                        <svg className="w-6 h-6 text-[#f8c017]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-white">Order Management</h3>
                        <p className="text-gray-300 text-sm">
                          Streamline your fulfillment process from order to delivery
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0 w-12 h-12 bg-[#f8c017]/20 rounded-lg flex items-center justify-center border border-[#f8c017]/30">
                        <svg className="w-6 h-6 text-[#f8c017]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-white">Inventory Tracking</h3>
                        <p className="text-gray-300 text-sm">
                          Real-time inventory management across multiple warehouses
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0 w-12 h-12 bg-[#f8c017]/20 rounded-lg flex items-center justify-center border border-[#f8c017]/30">
                        <svg className="w-6 h-6 text-[#f8c017]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-white">Analytics & Reporting</h3>
                        <p className="text-gray-300 text-sm">
                          Comprehensive insights to optimize your logistics operations
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 pt-8 border-t border-[#f8c017]/30">
                    <blockquote className="text-gray-300 italic">
                      "SJFulfillment has transformed our logistics operations, 
                      allowing us to scale efficiently across Nigeria."
                    </blockquote>
                    <cite className="text-sm font-semibold mt-2 block text-[#f8c017]">
                      - Leading E-commerce Brand
                    </cite>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Auth forms */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
              <div className="mx-auto w-full max-w-md">
                {children}
              </div>
            </div>
          </div>
        </div>
  );
}