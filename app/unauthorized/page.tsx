import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center border border-red-700">
              <ShieldX className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gradient-gold">
              Access Denied
            </CardTitle>
            <CardDescription className="text-gray-400">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gradient-gold">What you can do:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Go back to the dashboard</li>
                <li>• Contact your administrator</li>
                <li>• Check your account permissions</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Link href="/auth/login" className="block">
                <Button className="w-full bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
              
              <a
                href="mailto:support@sjfulfillment.com"
                className="block text-sm text-gradient-gold hover:text-gradient-gold/80 hover:underline"
              >
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}