


"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <Card className="bg-gradient-to-br from-[#232323] to-[#1a1a1a] border-gray-700 shadow-lg w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-[#f8c017]">404 - Not Found</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="text-lg text-white mb-2">Sorry, the page you requested could not be found.</div>
                    <Button className="bg-[#f8c017] text-black font-semibold mt-2" onClick={() => window.location.href = "/admin/dashboard"}>
                        Go to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}