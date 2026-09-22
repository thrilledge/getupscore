"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FavoriteButtonProps {
  jobId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({ jobId, className = "", size = "sm" }: FavoriteButtonProps) {
  const [saved, setSaved] = useState(false);
  const pendingRef = useRef(false);

  const sizeMap = { sm: "size-3.5", md: "size-5", lg: "size-6" };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const favs = (data.favorites || []) as { job_id: string }[];
        setSaved(favs.some((f) => f.job_id === jobId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const toggle = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    const previous = saved;
    const next = !previous;

    // Optimistic flip — the UI updates immediately on single click so saving
    // never feels laggy, even if the network is slow.
    setSaved(next);

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save");
        setSaved(previous);
        return;
      }
      const data = await res.json();
      setSaved(data.saved);
      if (data.saved !== next) {
        toast.info(data.saved ? "Job saved" : "Job removed from saved");
      } else {
        toast.success(data.saved ? "Job saved" : "Job removed from saved");
      }
    } catch {
      setSaved(previous);
      toast.error("Network error");
    } finally {
      pendingRef.current = false;
    }
  }, [jobId, saved]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      title={saved ? "Remove from saved" : "Save job"}
      className={cn(
        "shrink-0 cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-50",
        saved && "text-red-500 fill-red-500",
        className
      )}
    >
      <Heart
        className={cn(
          sizeMap[size],
          "transition-all",
          saved && "fill-current"
        )}
      />
    </button>
  );
}