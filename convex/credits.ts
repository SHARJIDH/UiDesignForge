import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";

/**
 * Get the start of the current billing period (1st of the month)
 */
function getBillingPeriodStart(date: Date = new Date()): number {
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
 * Get credit usage for the authenticated user
 * Returns credits used in the current billing period
 */
export const getCreditUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;
    const currentPeriodStart = getBillingPeriodStart();

    // Find existing usage record
    const usage = await ctx.db
      .query("creditUsage")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // If no record exists or it's from a previous period, return 0 used
    if (!usage || usage.periodStart < currentPeriodStart) {
      return {
        creditsUsed: 0,
        periodStart: currentPeriodStart,
        lastUpdated: null,
      };
    }

    return {
      creditsUsed: usage.creditsUsed,
      periodStart: usage.periodStart,
      lastUpdated: usage.lastUpdated,
    };
  },
});

/**
 * Internal query to get credit usage (for Inngest workflow)
 * Does not require authentication
 */
export const internalGetCreditUsage = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentPeriodStart = getBillingPeriodStart();

    const usage = await ctx.db
      .query("creditUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    // If no record exists or it's from a previous period, return 0 used
    if (!usage || usage.periodStart < currentPeriodStart) {
      return {
        creditsUsed: 0,
        periodStart: currentPeriodStart,
        lastUpdated: null,
      };
    }

    return {
      creditsUsed: usage.creditsUsed,
      periodStart: usage.periodStart,
      lastUpdated: usage.lastUpdated,
    };
  },
});

/**
 * Record credit usage after a successful AI generation
 * Internal mutation called by Inngest workflow
 */
export const recordCreditUsage = internalMutation({
  args: {
    userId: v.string(),
    credits: v.number(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentPeriodStart = getBillingPeriodStart();
    const now = Date.now();

    // Find existing usage record
    const existingUsage = await ctx.db
      .query("creditUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUsage) {
      // Check if we need to reset for a new billing period
      if (existingUsage.periodStart < currentPeriodStart) {
        // New billing period - reset credits and add new usage
        await ctx.db.patch(existingUsage._id, {
          creditsUsed: args.credits,
          periodStart: currentPeriodStart,
          lastUpdated: now,
        });
      } else {
        // Same billing period - add to existing usage
        await ctx.db.patch(existingUsage._id, {
          creditsUsed: existingUsage.creditsUsed + args.credits,
          lastUpdated: now,
        });
      }
    } else {
      // Create new usage record
      await ctx.db.insert("creditUsage", {
        userId: args.userId,
        creditsUsed: args.credits,
        periodStart: currentPeriodStart,
        lastUpdated: now,
      });
    }

    return { success: true };
  },
});

/**
 * Reset credit usage for a user (e.g., when subscription changes)
 * Internal mutation for administrative purposes
 */
export const resetCreditUsage = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentPeriodStart = getBillingPeriodStart();
    const now = Date.now();

    const existingUsage = await ctx.db
      .query("creditUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUsage) {
      await ctx.db.patch(existingUsage._id, {
        creditsUsed: 0,
        periodStart: currentPeriodStart,
        lastUpdated: now,
      });
    } else {
      await ctx.db.insert("creditUsage", {
        userId: args.userId,
        creditsUsed: 0,
        periodStart: currentPeriodStart,
        lastUpdated: now,
      });
    }

    return { success: true };
  },
});
