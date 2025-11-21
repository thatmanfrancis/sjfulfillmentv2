'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineModal() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Set initial status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-red-600" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">No Internet Connection</h2>
              <p className="text-muted-foreground text-sm">
                It looks like you're not connected to the internet. Please check your connection and try again.
              </p>
            </div>

            {/* Connection Details */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-red-600 font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  Offline
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Check:</span>
                <span className="text-foreground">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="text-left bg-blue-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-blue-900 text-sm">Troubleshooting Tips:</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Check your WiFi or mobile data connection</li>
                <li>• Try moving to a location with better signal</li>
                <li>• Restart your router or modem</li>
                <li>• Contact your internet service provider</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleRetry} 
                className="w-full flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Try to go back in history
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="w-full"
              >
                Go Back
              </Button>
            </div>

            {/* Footer */}
            <div className="text-xs text-muted-foreground">
              <p>SJFulfillment Platform • Offline Mode</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}