"use client";

import { useQuery } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import {
  FEATURE_CREDITS,
  LOW_CREDIT_THRESHOLD,
  calculateRemainingCredits,
  getModelCreditCost,
  hasEnoughCredits,
  isUnlimitedCreditEmail,
} from "@/lib/credits";

export interface CreditBalance {
  /** Total credits allocated by the user's plan (0, 25, or 50) */
  totalCredits: number;
  /** Credits used in the current billing period */
  usedCredits: number;
  /** Remaining credits (totalCredits - usedCredits) */
  remainingCredits: number;
  /** Whether credit data is still loading */
  isLoading: boolean;
  /** Whether the user has an active subscription */
  hasSubscription: boolean;
  /** Current plan ID (starter_user, pro_user, or null) */
  currentPlan: string | null;
  /** Start of the current billing period */
  periodStart: Date | null;
  /** Whether credits are low (at or below threshold) */
  isLowCredits: boolean;
  /** Whether this user bypasses credit limits */
  isUnlimited: boolean;
  /** Check if user can afford a generation with a specific model */
  canAfford: (modelId: string) => boolean;
  /** Get the credit cost for a specific model */
  getCost: (modelId: string) => number;
}

/**
 * Hook to get the current user's credit balance
 * Combines Clerk subscription data with Convex usage tracking
 */
export function useCreditBalance(): CreditBalance {
  const { has, isLoaded: isAuthLoaded } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Query Convex for credit usage
  const creditUsage = useQuery(api.credits.getCreditUsage);

  const isUnlimited = useMemo(() => {
    if (!isUserLoaded) return false;
    return isUnlimitedCreditEmail(user?.primaryEmailAddress?.emailAddress);
  }, [isUserLoaded, user?.primaryEmailAddress?.emailAddress]);

  // Determine subscription status and credit allocation from Clerk features
  const subscriptionInfo = useMemo(() => {
    if (!isAuthLoaded || !has) {
      return {
        hasSubscription: false,
        totalCredits: 0,
        currentPlan: null,
      };
    }

    // Check for credit features from Clerk
    // The has() function checks if user has access to a feature
    let totalCredits = 0;
    let currentPlan: string | null = null;

    // Check for Pro plan first (higher credits)
    if (has({ feature: "50_credits_month" })) {
      totalCredits = FEATURE_CREDITS["50_credits_month"];
      currentPlan = "pro_user";
    } else if (has({ feature: "25_credits_month" })) {
      totalCredits = FEATURE_CREDITS["25_credits_month"];
      currentPlan = "starter_user";
    }

    return {
      hasSubscription: totalCredits > 0,
      totalCredits,
      currentPlan,
    };
  }, [isAuthLoaded, has]);

  // Calculate derived values
  const isLoading = !isAuthLoaded || !isUserLoaded || creditUsage === undefined;
  const usedCredits = creditUsage?.creditsUsed ?? 0;
  const totalCredits = isUnlimited
    ? Number.MAX_SAFE_INTEGER
    : subscriptionInfo.totalCredits;
  const remainingCredits = calculateRemainingCredits(
    totalCredits,
    usedCredits
  );
  const periodStart = creditUsage?.periodStart
    ? new Date(creditUsage.periodStart)
    : null;

  return {
    totalCredits,
    usedCredits,
    remainingCredits,
    isLoading,
    hasSubscription: isUnlimited ? true : subscriptionInfo.hasSubscription,
    currentPlan: isUnlimited ? "owner_unlimited" : subscriptionInfo.currentPlan,
    periodStart,
    isLowCredits: isUnlimited
      ? false
      : remainingCredits <= LOW_CREDIT_THRESHOLD,
    isUnlimited,
    canAfford: (modelId: string) =>
      isUnlimited ? true : hasEnoughCredits(remainingCredits, modelId),
    getCost: getModelCreditCost,
  };
}
