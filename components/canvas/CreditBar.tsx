"use client";

import { Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODEL_CREDITS,
  getModelCreditCost,
  LOW_CREDIT_THRESHOLD,
} from "@/lib/credits";

// Re-export for backward compatibility
export { MODEL_CREDITS, getModelCreditCost };

interface CreditBarProps {
  /** Remaining credits available */
  remainingCredits: number;
  /** Total credits allocated by plan (for progress bar) */
  totalCredits: number;
  /** Whether current user has unlimited credits */
  isUnlimited?: boolean;
  /** Selected AI model ID */
  selectedModelId: string;
  /** Whether credit data is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Credit bar showing remaining credits, usage progress, and cost per generation.
 * Displays warning when credits are low.
 */
export function CreditBar({
  remainingCredits,
  totalCredits,
  isUnlimited = false,
  selectedModelId,
  isLoading = false,
  className,
}: CreditBarProps) {
  const creditCost = getModelCreditCost(selectedModelId);
  const isLowCredits =
    remainingCredits <= LOW_CREDIT_THRESHOLD && totalCredits > 0;
  const usagePercent =
    totalCredits > 0
      ? Math.min(100, ((totalCredits - remainingCredits) / totalCredits) * 100)
      : 0;
  const hasSubscription = totalCredits > 0;

  // No subscription state
  if (!hasSubscription && !isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2",
          "bg-linear-to-r from-muted/50 via-muted/30 to-muted/20",
          "border-b border-border/30",
          className
        )}
      >
        <div className="flex items-center gap-2 text-[12px]">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">No active plan</span>
        </div>
        <a
          href="/pricing"
          className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Upgrade →
        </a>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-3 py-2",
        isLowCredits
          ? "bg-linear-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border-b border-amber-500/30"
          : "bg-linear-to-r from-primary/15 via-primary/10 to-primary/5 border-b border-primary/20",
        className
      )}
    >
      {/* Credits info row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px]">
          {isLowCredits ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          )}
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse">
              Loading...
            </span>
          ) : isUnlimited ? (
            <>
              <span className="font-medium text-primary">Unlimited credits</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground">
                {creditCost} credit{creditCost !== 1 ? "s" : ""}/gen
              </span>
            </>
          ) : (
            <>
              <span
                className={cn(
                  "font-medium",
                  isLowCredits ? "text-amber-500" : "text-primary"
                )}
              >
                {remainingCredits}/{totalCredits} credits
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground">
                {creditCost} credit{creditCost !== 1 ? "s" : ""}/gen
              </span>
            </>
          )}
        </div>
        {isLowCredits && !isLoading && (
          <a
            href="/pricing"
            className="text-[11px] font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            Get more →
          </a>
        )}
      </div>

      {/* Progress bar */}
      {!isLoading && !isUnlimited && totalCredits > 0 && (
        <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isLowCredits ? "bg-amber-500/70" : "bg-primary/50"
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
