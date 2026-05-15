import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { inngest } from "@/inngest/client";
import { z } from "zod";
import {
  FEATURE_CREDITS,
  getModelCreditCost,
  isUnlimitedCreditEmail,
} from "@/lib/credits";

// Schema for @inngest/use-agent sendMessage format (wrapped in params)
const useAgentParamsSchema = z.object({
  params: z.object({
    userMessage: z.object({
      id: z.string(),
      content: z.string(),
      role: z.enum(["user"]),
      state: z.record(z.string(), z.unknown()).optional(),
    }),
    threadId: z.string(),
    history: z.array(z.unknown()),
    userId: z.string().optional(),
    channelKey: z.string().optional(),
  }),
});

// Schema for @inngest/use-agent sendMessage format (direct, no params wrapper)
const useAgentDirectSchema = z.object({
  userMessage: z.object({
    id: z.string(),
    content: z.string(),
    role: z.enum(["user"]),
    state: z.record(z.string(), z.unknown()).optional(),
  }),
  threadId: z.string(),
  history: z.array(z.unknown()),
  userId: z.string().optional(),
  channelKey: z.string().optional(),
});

// Legacy schema for direct API calls
const legacySchema = z.object({
  message: z.string().min(1),
  screenId: z.string(),
  projectId: z.string(),
  channelKey: z.string().optional(),
  modelId: z.string().optional(),
});

// Credit error response type
interface CreditError {
  code: "INSUFFICIENT_CREDITS" | "NO_SUBSCRIPTION" | "CREDIT_CHECK_FAILED";
  message: string;
  remaining: number;
  required: number;
  upgradeUrl: string;
}

// Get Convex HTTP endpoint URL
function getConvexHttpUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

// Get billing period start (1st of month)
function getBillingPeriodStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
}

// Validate user has enough credits
async function validateCredits(
  userId: string,
  modelId: string
): Promise<{
  valid: boolean;
  error?: CreditError;
  remaining: number;
  totalCredits: number;
}> {
  const requiredCredits = getModelCreditCost(modelId);

  try {
    // Get user's subscription features from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const primaryEmail =
      user.emailAddresses.find(
        (address) => address.id === user.primaryEmailAddressId
      )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (isUnlimitedCreditEmail(primaryEmail)) {
      return {
        valid: true,
        remaining: Number.MAX_SAFE_INTEGER,
        totalCredits: Number.MAX_SAFE_INTEGER,
      };
    }

    // Check for credit features
    let totalCredits = 0;

    // Check public metadata for subscription features
    // Clerk stores subscription info that we can check
    const publicMetadata = user.publicMetadata as
      | Record<string, unknown>
      | undefined;
    const features = (publicMetadata?.features as string[]) || [];

    // Also check using has() equivalent by checking if user has the features
    // For server-side, we need to check the user's subscription directly
    // This is a simplified check - in production you'd use Clerk's subscription API
    for (const featureId of Object.keys(FEATURE_CREDITS)) {
      if (features.includes(featureId)) {
        const credits = FEATURE_CREDITS[featureId];
        if (credits > totalCredits) {
          totalCredits = credits;
        }
      }
    }

    // If no features found in metadata, check if user has any active subscription
    // by checking for the feature flags directly
    if (totalCredits === 0) {
      // For now, we'll be lenient and allow users without explicit features
      // In production, you'd integrate with Clerk's billing API more deeply
      // Check if user has 50_credits_month or 25_credits_month feature
      const has50Credits = features.includes("50_credits_month");
      const has25Credits = features.includes("25_credits_month");

      if (has50Credits) {
        totalCredits = 50;
      } else if (has25Credits) {
        totalCredits = 25;
      }
    }

    // No subscription
    if (totalCredits === 0) {
      return {
        valid: false,
        remaining: 0,
        totalCredits: 0,
        error: {
          code: "NO_SUBSCRIPTION",
          message:
            "You need an active subscription to use AI chat. Please subscribe to a plan.",
          remaining: 0,
          required: requiredCredits,
          upgradeUrl: "/pricing",
        },
      };
    }

    // Get credit usage from Convex
    const convexHttpUrl = getConvexHttpUrl();
    const usageResponse = await fetch(
      `${convexHttpUrl}/inngest/getCreditUsage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }
    );

    let usedCredits = 0;
    if (usageResponse.ok) {
      const usage = await usageResponse.json();
      const currentPeriodStart = getBillingPeriodStart();

      // Only count usage from current billing period
      if (usage && usage.periodStart >= currentPeriodStart) {
        usedCredits = usage.creditsUsed || 0;
      }
    }

    const remainingCredits = Math.max(0, totalCredits - usedCredits);

    // Check if user has enough credits
    if (remainingCredits < requiredCredits) {
      return {
        valid: false,
        remaining: remainingCredits,
        totalCredits,
        error: {
          code: "INSUFFICIENT_CREDITS",
          message: `You have ${remainingCredits} credits remaining, but this generation requires ${requiredCredits} credits.`,
          remaining: remainingCredits,
          required: requiredCredits,
          upgradeUrl: "/pricing",
        },
      };
    }

    return { valid: true, remaining: remainingCredits, totalCredits };
  } catch (error) {
    console.error("Credit validation error:", error);
    // On error, allow the request but log it
    // In production, you might want to be more strict
    return {
      valid: true,
      remaining: 0,
      totalCredits: 0,
      error: undefined,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Try to parse as useAgent format with params wrapper
    const useAgentParamsResult = useAgentParamsSchema.safeParse(body);
    if (useAgentParamsResult.success) {
      const { params } = useAgentParamsResult.data;
      return handleUseAgentFormat(params, userId);
    }

    // Try to parse as useAgent format without params wrapper
    const useAgentDirectResult = useAgentDirectSchema.safeParse(body);
    if (useAgentDirectResult.success) {
      return handleUseAgentFormat(useAgentDirectResult.data, userId);
    }

    // Try legacy format
    const legacyResult = legacySchema.safeParse(body);
    if (legacyResult.success) {
      const { message, screenId, projectId, channelKey, modelId } =
        legacyResult.data;

      // Validate credits before processing
      const creditCheck = await validateCredits(
        userId,
        modelId || "x-ai/grok-4.1-fast"
      );
      if (!creditCheck.valid && creditCheck.error) {
        return NextResponse.json(
          { error: creditCheck.error.message, creditError: creditCheck.error },
          { status: 402 }
        );
      }

      const { ids } = await inngest.send({
        name: "agent/chat.requested",
        data: {
          message,
          screenId,
          projectId,
          userId,
          channelKey: channelKey || `screen:${screenId}`,
          modelId,
        },
      });

      return NextResponse.json({
        success: true,
        screenId,
        eventId: ids[0],
      });
    }

    return NextResponse.json(
      { error: "Invalid request format", receivedKeys: Object.keys(body) },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Helper function to handle useAgent format
async function handleUseAgentFormat(
  data: {
    userMessage: {
      id: string;
      content: string;
      role: "user";
      state?: Record<string, unknown>;
    };
    threadId: string;
    history: unknown[];
    userId?: string;
    channelKey?: string;
  },
  authUserId: string
) {
  const { userMessage, threadId, history, channelKey } = data;

  // Extract screenId, projectId, modelId, and imageUrls from state
  const state = userMessage.state as
    | {
        screenId?: string;
        projectId?: string;
        modelId?: string;
        imageUrls?: string[];
      }
    | undefined;
  const screenId = state?.screenId || threadId.replace("screen:", "");
  const projectId = state?.projectId || "";
  const modelId = state?.modelId || "x-ai/grok-4.1-fast";
  const imageUrls = state?.imageUrls || [];

  // Validate credits before processing
  const creditCheck = await validateCredits(authUserId, modelId);
  if (!creditCheck.valid && creditCheck.error) {
    return NextResponse.json(
      { error: creditCheck.error.message, creditError: creditCheck.error },
      { status: 402 }
    );
  }

  // Effective userId for data ownership
  const effectiveUserId = authUserId || channelKey;
  const finalChannelKey = channelKey || `screen:${screenId}`;

  // Send event to Inngest - matching the ChatRequestEvent format from @inngest/use-agent
  const { ids } = await inngest.send({
    name: "agent/chat.requested",
    data: {
      threadId,
      userMessage, // Pass the full userMessage object, not just content
      userId: effectiveUserId,
      channelKey: finalChannelKey,
      history,
      // Also include screenId, projectId, modelId, and imageUrls for our custom handling
      screenId,
      projectId,
      modelId,
      imageUrls,
    },
  });

  return NextResponse.json({
    success: true,
    threadId,
    eventId: ids[0],
  });
}
