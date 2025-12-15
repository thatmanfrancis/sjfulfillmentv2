"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, PhoneCall } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icons";
import { post } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface CallContactActionProps {
  contactNumber?: string;
  contactName?: string;
  callerNumber?: string;
  className?: string;
  size?: "icon" | "icon-sm" | "icon-lg" | "default" | "sm";
  label?: string;
  disabled?: boolean;
  onCallComplete?: () => void;
}

const DEFAULT_CALLER =
  process.env.NEXT_PUBLIC_DEFAULT_CALLER_NUMBER || "+2349067322844";

export function CallContactAction({
  contactNumber,
  contactName,
  callerNumber,
  className,
  size = "icon-sm",
  label,
  disabled,
  onCallComplete,
}: CallContactActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const fromNumber = useMemo(
    () => callerNumber || DEFAULT_CALLER,
    [callerNumber]
  );

  const toNumber = contactNumber?.trim();
  const isDisabled = disabled || !toNumber || !fromNumber;

  const handleCall = async () => {
    if (isDisabled) return;

    setLoading(true);
    setStatus("idle");
    setMessage(null);

    try {
      const response = await post<{
        success: boolean;
        message?: string;
        callId?: string;
        data?: any;
      }>("/api/sonetel/make-call", {
        phoneNumber: fromNumber,
        recipientNumber: toNumber,
        callerId: fromNumber,
      });

      setStatus("success");
      setMessage(response.message || "Call request sent.");
      toast({
        title: "Call initiated",
        description: response.message || "Sonetel accepted the call request.",
      });
      if (onCallComplete) onCallComplete();
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Failed to initiate call.");
      toast({
        title: "Call failed",
        description: error?.message || "Could not start the call.",
        variant: "destructive",
      });
      if (onCallComplete) onCallComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={isDisabled}
        className={cn(
          "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10",
          className
        )}
        onClick={() => setOpen(true)}
        aria-label={label || "Call contact"}
        title={label || "Call contact"}
      >
        <PhoneCall className="h-4 w-4" />
        {label ? <span className="text-xs font-medium">{label}</span> : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Call this contact?</DialogTitle>
            <DialogDescription>
              {contactName ? `Call ${contactName}` : "Place a callback"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-muted-foreground">From</span>
              <span className="font-medium text-foreground">
                {fromNumber || "Set caller number"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-muted-foreground">To</span>
              <span className="font-medium text-foreground">
                {toNumber || "No recipient"}
              </span>
            </div>
            {status === "success" && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Call initiated</p>
                  <p className="text-xs text-emerald-200">{message}</p>
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Call failed</p>
                  <p className="text-xs text-red-200">{message}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCall}
              disabled={isDisabled || loading}
              className={cn(buttonVariants({ size: "default" }))}
            >
              {loading ? (
                <>
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4" />
                  Call now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
