"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CallContactAction } from "@/components/call/CallContactAction";

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

export default function PhonePage() {
  const [number, setNumber] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sonetel/call-logs?mine=true&limit=20");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Refresh logs after a call
  const handleCallComplete = () => {
    fetchLogs();
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6 bg-black min-h-screen">
      {/* Dialer Section */}

      <Card className="w-full md:w-1/3 max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Dial a Number</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Number display */}
          <div className="flex flex-col items-center mb-4">
            <div className="text-3xl font-mono tracking-widest text-white min-h-10 mb-2 select-text">
              {number || <span className="text-gray-500">Enter number</span>}
            </div>
          </div>
          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "+", 0, "#"].map((n) => (
              <Button
                key={n}
                variant="outline"
                className="h-16 w-16 text-2xl hover:text-[#f08c17] font-semibold bg-[#181818] text-white border-gray-700 hover:bg-[#222]"
                onClick={() => setNumber((prev) => `${prev}${n}`)}
                disabled={number.length >= 15}
              >
                {n}
              </Button>
            ))}
            {/* Backspace button */}
            <Button
              variant="ghost"
              className="h-16 w-16 text-xl text-gray-400 col-span-3"
              onClick={() => setNumber((prev) => prev.slice(0, -1))}
              disabled={!number}
            >
              ⌫
            </Button>
          </div>
          {/* Call button */}
          <div className="flex justify-center">
            <CallContactAction
              contactNumber={number}
              label="Call"
              size="lg"
              disabled={!number}
              onCallComplete={handleCallComplete}
            />
          </div>
        </CardContent>
      </Card>

      {/* Call Logs Section */}
      <Card className="w-full md:flex-1">
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No calls found.</TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "success" ? "default" : "destructive"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.toNumber}</TableCell>
                      <TableCell>{log.fromNumber}</TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{log.message || log.error || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
