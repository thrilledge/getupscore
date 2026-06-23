"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);

  const sizeMap = { sm: "size-3.5", md: "size-5", lg: "size-6" };

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => {
        const favs = (data.favorites || []) as { job_id: string }[];
        setSaved(favs.some((f) => f.job_id === jobId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }
      const data = await res.json();
      setSaved(data.saved);
      toast.success(data.saved ? "Job saved" : "Job removed from saved");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        "text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50",
        saved && "text-red-500 fill-red-500",
        className
      )}
      title={saved ? "Remove from saved" : "Save job"}
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
