/**
 * Credit System Configuration
 * Defines credit allocations for subscription plans and costs for AI models.
 */

/**
 * Subscription plan IDs from Clerk Billing
 */
export type PlanId = "starter_user" | "pro_user";

/**
 * Credit allocation per subscription plan
 */
export const PLAN_CREDITS: Record<PlanId, number> = {
  starter_user: 25,
  pro_user: 50,
} as const;

/**
 * Clerk feature IDs to credit allocation mapping
 * These features are configured in Clerk Dashboard
 */
export const FEATURE_CREDITS: Record<string, number> = {
  "25_credits_month": 25,
  "50_credits_month": 50,
} as const;

/**
 * Emails that should bypass all credit limits.
 */
export const UNLIMITED_CREDIT_EMAILS = ["sharjidh2003@gmail.com"] as const;

/**
 * Check whether a user email should receive unlimited credits.
 */
export function isUnlimitedCreditEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return UNLIMITED_CREDIT_EMAILS.some((allowed) => allowed === normalized);
}

/**
 * Credit cost per AI model
 * Different models have different costs based on their capabilities
 */
export const MODEL_CREDITS: Record<string, number> = {
  "x-ai/grok-4.1-fast": 1,
  "openai/gpt-5.1": 2,
  "anthropic/claude-opus-4.5": 5,
  "google/gemini-3-pro-preview": 3,
} as const;

/**
 * Default credit cost for unknown models
 */
export const DEFAULT_MODEL_CREDIT_COST = 1;

/**
 * Low credit warning threshold
 * Show warning when credits fall to or below this value
 */
export const LOW_CREDIT_THRESHOLD = 5;

/**
 * Get credit allocation from Clerk features array
 * Returns the highest credit allocation found, or 0 if no matching features
 *
 * @param features - Array of Clerk feature IDs the user has access to
 * @returns Credit allocation amount (0, 25, or 50)
 */
export function getCreditAllocationFromFeatures(features: string[]): number {
  if (!features || features.length === 0) {
    return 0;
  }

  let maxCredits = 0;
  for (const feature of features) {
    const credits = FEATURE_CREDITS[feature];
    if (credits !== undefined && credits > maxCredits) {
      maxCredits = credits;
    }
  }

  return maxCredits;
}

/**
 * Get credit allocation for a specific plan
 *
 * @param planId - The subscription plan ID
 * @returns Credit allocation for the plan, or 0 if invalid plan
 */
export function getCreditAllocationForPlan(planId: string | null): number {
  if (!planId) {
    return 0;
  }
  return PLAN_CREDITS[planId as PlanId] ?? 0;
}

/**
 * Get credit cost for a specific AI model
 *
 * @param modelId - The AI model ID (e.g., "openai/gpt-5.1")
 * @returns Credit cost for the model, defaults to DEFAULT_MODEL_CREDIT_COST
 */
export function getModelCreditCost(modelId: string): number {
  return MODEL_CREDITS[modelId] ?? DEFAULT_MODEL_CREDIT_COST;
}

/**
 * Check if user has enough credits for a generation
 *
 * @param remainingCredits - User's remaining credit balance
 * @param modelId - The AI model to use
 * @returns true if user has sufficient credits
 */
export function hasEnoughCredits(
  remainingCredits: number,
  modelId: string
): boolean {
  const cost = getModelCreditCost(modelId);
  return remainingCredits >= cost;
}

/**
 * Calculate remaining credits
 *
 * @param totalCredits - Total credits allocated by plan
 * @param usedCredits - Credits used in current billing period
 * @returns Remaining credits (never negative)
 */
export function calculateRemainingCredits(
  totalCredits: number,
  usedCredits: number
): number {
  return Math.max(0, totalCredits - usedCredits);
}

/**
 * Check if credits are low (at or below warning threshold)
 *
 * @param remainingCredits - User's remaining credit balance
 * @returns true if credits are at or below LOW_CREDIT_THRESHOLD
 */
export function isLowCredits(remainingCredits: number): boolean {
  return remainingCredits <= LOW_CREDIT_THRESHOLD;
}

/**
 * Get the start of the current billing period
 * Billing periods are monthly, starting on the 1st of each month
 *
 * @param date - Reference date (defaults to now)
 * @returns Timestamp of the billing period start
 */
export function getBillingPeriodStart(date: Date = new Date()): number {
  const periodStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  return periodStart.getTime();
}

/**
 * Check if a timestamp is in the current billing period
 *
 * @param timestamp - Timestamp to check
 * @param referenceDate - Reference date for current period (defaults to now)
 * @returns true if timestamp is in the current billing period
 */
export function isInCurrentBillingPeriod(
  timestamp: number,
  referenceDate: Date = new Date()
): boolean {
  const currentPeriodStart = getBillingPeriodStart(referenceDate);
  return timestamp >= currentPeriodStart;
}
