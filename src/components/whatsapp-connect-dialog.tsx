"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

interface WhatsAppConnectDialogProps {
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WhatsAppConnectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: WhatsAppConnectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setPhone("");
        setError(null);
        setDone(false);
        setSubmitting(false);
      }
      setOpen(nextOpen);
    },
    [setOpen]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = phone.trim();
      if (!PHONE_RE.test(trimmed)) {
        setError("Enter a valid number with country code, e.g. +923001234567");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to connect");
        }
        setDone(true);
        toast.success(
          data.sessionConnected
            ? "WhatsApp connected — job alerts will arrive on your phone."
            : "Number saved. The WhatsApp session is connecting — alerts will start once it's online."
        );
        setTimeout(() => {
          handleOpenChange(false);
          onSuccess?.();
        }, 1400);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    },
    [phone, onSuccess, handleOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}

      <DialogContent className="max-w-[380px] rounded-[20px] border-black/10 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-w-[420px] sm:p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 font-heading text-base font-bold text-[#0A0A0A] sm:text-lg">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#00C98B]/15 text-[#00C98B]">
              <Smartphone className="size-4" />
            </span>
            Connect WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs leading-5 text-black/55">
            Enter your number and we&apos;ll send job alerts there.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#00C98B]/15">
              <CheckCircle2 className="size-6 text-[#00C98B]" />
            </div>
            <p className="text-sm font-semibold text-[#0A0A0A]">All set</p>
            <p className="text-xs text-black/50">
              Notifications will arrive on {phone}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="wa-phone"
                className="text-xs font-medium text-black/70"
              >
                Phone number
              </label>
              <input
                id="wa-phone"
                type="tel"
                placeholder="+923001234567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder:text-black/35 focus:border-[#00C98B] focus:ring-2 focus:ring-[#00C98B]/15 focus:outline-none"
              />
              {error && (
                <p className="text-[11px] leading-4 text-red-500">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-xl bg-[#00C98B] font-semibold text-[#0A0A0A] shadow-[0_8px_24px_rgba(0,201,139,0.2)] hover:bg-[#00C98B]/90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Connect"
              )}
            </Button>

            <p className="text-center text-[11px] leading-4 text-black/40">
              Include the country code. Example: +923001234567
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
