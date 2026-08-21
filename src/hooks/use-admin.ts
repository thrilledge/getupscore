"use client";

import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Hook to check if the current user is an admin.
 * Redirects to /dashboard if not admin.
 */
export function useAdmin() {
  const { user, loading } = useUser();
  const router = useRouter();

  const isAdmin = user?.app_metadata?.is_admin === true;

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  return { isAdmin, loading, user };
}
