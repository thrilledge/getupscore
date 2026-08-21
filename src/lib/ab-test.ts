"use client";

import { useCallback, useEffect, useState } from "react";

interface ABTestResult {
  variant: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get the user's A/B test variant.
 *
 * Usage:
 *   const { variant } = useABTest("pricing-test");
 *   if (variant === "new_pricing") { ... } else { ... } // control
 */
export function useABTest(testName: string): ABTestResult {
  const [state, setState] = useState<ABTestResult>({
    variant: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/ab-test?testName=${encodeURIComponent(testName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setState({
          variant: data.variant ?? null,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ variant: null, loading: false, error: err.message });
      });

    return () => { cancelled = true; };
  }, [testName]);

  return state;
}

/**
 * Server-side helper: call from API routes or server components.
 * Returns the variant for a given user + test name.
 */
export async function getABTestVariant(
  testName: string,
  userId: string,
  admin: any
): Promise<string | null> {
  // Find running test
  const { data: test } = await admin
    .from("ab_tests")
    .select("*")
    .eq("name", testName)
    .eq("status", "running")
    .single();

  if (!test) return null;

  // Check existing assignment
  const { data: existing } = await admin
    .from("ab_test_assignments")
    .select("variant")
    .eq("test_id", test.id)
    .eq("user_id", userId)
    .single();

  if (existing) return existing.variant;

  // Assign based on weights
  const variants = test.variants as { name: string; weight: number }[];
  if (!variants?.length) return null;

  const roll = Math.random() * 100;
  let cumulative = 0;
  let selected = variants[0].name;

  for (const v of variants) {
    cumulative += v.weight;
    if (roll < cumulative) {
      selected = v.name;
      break;
    }
  }

  await admin.from("ab_test_assignments").insert({
    test_id: test.id,
    user_id: userId,
    variant: selected,
  });

  return selected;
}
