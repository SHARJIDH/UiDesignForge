# Design Document

## Overview

This design implements a credit-based billing system for Unit {set} using Clerk Billing. The system tracks credit usage per user, enforces limits based on subscription plans, and integrates with the existing AI chat workflow. Credits are stored in Convex and synchronized with Clerk's subscription status.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  AISidebar                                                               │
│  ├── CreditBar (displays balance, cost, warnings)                       │
│  ├── ChatInput (disabled when insufficient credits)                     │
│  └── InsufficientCreditsOverlay (upgrade prompt)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  useCreditBalance hook                                                   │
│  ├── Queries Convex for credit usage                                    │
│  ├── Queries Clerk for subscription status                              │
│  └── Calculates remaining credits                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Layer                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  /api/chat                                                               │
│  ├── Validates credit availability (server-side)                        │
│  ├── Rejects if insufficient credits                                    │
│  └── Triggers Inngest workflow                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Inngest Workflow (runChatAgent)                                         │
│  ├── Processes AI generation                                            │
│  └── On success: calls Convex to record credit usage                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Convex                                                                  │
│  ├── creditUsage table (userId, creditsUsed, periodStart)               │
│  └── Credit queries and mutations                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Clerk Billing                                                           │
│  ├── Plans: starter_user (25 credits), pro_user (50 credits)            │
│  └── Features: "25_credits_month", "50_credits_month"                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Credit Configuration (`lib/credits.ts`)

```typescript
// Plan credit allocations
export const PLAN_CREDITS = {
  starter_user: 25,
  pro_user: 50,
} as const;

// Feature to credits mapping (Clerk features)
export const FEATURE_CREDITS = {
  "25_credits_month": 25,
  "50_credits_month": 50,
} as const;

// Model credit costs (already exists in CreditBar.tsx)
export const MODEL_CREDITS = {
  "x-ai/grok-4.1-fast:free": 1,
  "openai/gpt-5.1": 2,
  "anthropic/claude-opus-4.5": 5,
  "google/gemini-3-pro-preview": 3,
} as const;

// Get credit allocation from Clerk features
export function getCreditAllocationFromFeatures(features: string[]): number;

// Get model credit cost
export function getModelCreditCost(modelId: string): number;

// Check if user has sufficient credits
export function hasEnoughCredits(remaining: number, modelId: string): boolean;
```

### 2. Credit Balance Hook (`hooks/use-credit-balance.ts`)

```typescript
interface CreditBalance {
  totalCredits: number; // Plan allocation (0, 25, or 50)
  usedCredits: number; // Credits used this period
  remainingCredits: number; // totalCredits - usedCredits
  isLoading: boolean;
  hasSubscription: boolean;
  currentPlan: string | null;
  periodStart: Date | null;
}

export function useCreditBalance(): CreditBalance;
```

### 3. Updated CreditBar Component

```typescript
interface CreditBarProps {
  remainingCredits: number;
  totalCredits: number;
  selectedModelId: string;
  isLoading?: boolean;
}

// Shows:
// - Remaining credits / total credits
// - Credit cost for selected model
// - Warning indicator when low (≤5 credits)
// - Progress bar showing usage
```

### 4. Insufficient Credits Overlay

```typescript
interface InsufficientCreditsOverlayProps {
  remainingCredits: number;
  requiredCredits: number;
  onUpgrade: () => void;
}

// Displays when user cannot send message due to insufficient credits
// Shows upgrade button that navigates to /pricing
```

### 5. Convex Schema Addition

```typescript
// New table in convex/schema.ts
creditUsage: defineTable({
  userId: v.string(), // Clerk user ID
  creditsUsed: v.number(), // Credits consumed this period
  periodStart: v.number(), // Timestamp of billing period start
  lastUpdated: v.number(), // Last update timestamp
}).index("by_userId", ["userId"]);
```

### 6. Convex Credit Mutations (`convex/credits.ts`)

```typescript
// Get user's credit usage for current period
export const getCreditUsage = query({
  args: {},
  handler: async (ctx) => { ... }
});

// Record credit usage (internal, called by Inngest)
export const recordCreditUsage = internalMutation({
  args: {
    userId: v.string(),
    credits: v.number(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => { ... }
});

// Reset credits for new billing period (if needed)
export const resetCreditUsage = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => { ... }
});
```

### 7. API Route Updates (`app/api/chat/route.ts`)

```typescript
// Add credit validation before sending to Inngest
async function validateCredits(
  userId: string,
  modelId: string
): Promise<{
  valid: boolean;
  remaining: number;
  required: number;
  error?: string;
}>;
```

### 8. Inngest Workflow Updates (`inngest/functions.ts`)

```typescript
// After successful AI response, record credit usage
await step.run("record-credit-usage", async () => {
  const convexHttpUrl = getConvexHttpUrl();
  await fetch(`${convexHttpUrl}/inngest/recordCreditUsage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      credits: getModelCreditCost(modelId),
      modelId,
    }),
  });
});
```

## Data Models

### Credit Usage Record

```typescript
interface CreditUsageRecord {
  _id: Id<"creditUsage">;
  userId: string; // Clerk user ID
  creditsUsed: number; // Total credits used this billing period
  periodStart: number; // Unix timestamp of period start
  lastUpdated: number; // Unix timestamp of last update
}
```

### Credit Balance (Computed)

```typescript
interface ComputedCreditBalance {
  // From Clerk subscription
  planId: string | null; // "starter_user" | "pro_user" | null
  totalCredits: number; // 0, 25, or 50

  // From Convex
  usedCredits: number; // Credits used this period
  periodStart: Date; // When current period started

  // Computed
  remainingCredits: number; // totalCredits - usedCredits
  isLow: boolean; // remainingCredits <= 5
  canGenerate: (modelId: string) => boolean;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Plan allocation mapping

_For any_ subscription plan (starter_user or pro_user), the credit allocation function SHALL return the correct credit amount (25 or 50 respectively), and for no subscription, SHALL return 0.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Credit deduction correctness

_For any_ successful AI generation with a given model, the user's used credits SHALL increase by exactly the model's defined credit cost, and the remaining credits SHALL decrease by the same amount.
**Validates: Requirements 3.1, 3.3, 3.4**

### Property 3: Failed generation preserves credits

_For any_ failed AI generation (error response), the user's credit balance SHALL remain unchanged from before the generation attempt.
**Validates: Requirements 3.2**

### Property 4: Insufficient credits blocks generation

_For any_ user whose remaining credits are less than the selected model's credit cost, the system SHALL prevent message submission and display an upgrade prompt.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Server-side credit validation

_For any_ message request to the chat API, the server SHALL validate credit availability and reject requests with insufficient credits before processing.
**Validates: Requirements 6.3, 6.4**

### Property 6: Credit calculation formula

_For any_ user with a subscription, remaining credits SHALL equal (plan allocation - used credits in current period), and this value SHALL never be negative.
**Validates: Requirements 7.2**

### Property 7: Low credit warning threshold

_For any_ credit balance of 5 or fewer, the UI SHALL display a warning indicator to alert the user.
**Validates: Requirements 2.4**

## Error Handling

### Client-Side Errors

| Error                         | Handling                                           |
| ----------------------------- | -------------------------------------------------- |
| No subscription               | Show 0 credits, display upgrade prompt             |
| Insufficient credits          | Disable input, show overlay with upgrade button    |
| Network error loading credits | Show loading state, retry with exponential backoff |
| Clerk API unavailable         | Fall back to cached subscription status            |

### Server-Side Errors

| Error                   | Handling                                             |
| ----------------------- | ---------------------------------------------------- |
| Credit validation fails | Return 402 Payment Required with error message       |
| Convex unavailable      | Return 503 Service Unavailable, don't deduct credits |
| AI generation fails     | Don't record credit usage, return error to client    |
| Invalid model ID        | Use default credit cost (1), log warning             |

### Error Response Format

```typescript
interface CreditError {
  code: "INSUFFICIENT_CREDITS" | "NO_SUBSCRIPTION" | "CREDIT_CHECK_FAILED";
  message: string;
  remaining: number;
  required: number;
  upgradeUrl: string;
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:

1. **Unit Tests**: Verify specific examples and edge cases
2. **Property-Based Tests**: Verify universal properties across all inputs

### Property-Based Testing Library

We will use **fast-check** for property-based testing in TypeScript/JavaScript.

```bash
npm install --save-dev fast-check
```

### Test Categories

#### Unit Tests

- Credit allocation for each plan type
- Model credit cost lookup
- Credit calculation with various usage levels
- UI component rendering states
- API error responses

#### Property-Based Tests

Each correctness property will have a corresponding property-based test:

1. **Plan allocation mapping**: Generate random plan IDs, verify correct allocation
2. **Credit deduction correctness**: Generate random models and usage, verify deduction
3. **Failed generation preserves credits**: Generate error scenarios, verify no change
4. **Insufficient credits blocks generation**: Generate low-credit scenarios, verify blocking
5. **Server-side credit validation**: Generate request scenarios, verify validation
6. **Credit calculation formula**: Generate random allocations and usage, verify formula
7. **Low credit warning threshold**: Generate credit values, verify warning display

### Test Annotations

All property-based tests must be annotated with:

```typescript
// **Feature: clerk-billing-credits, Property {number}: {property_text}**
```

### Test Configuration

Property-based tests should run a minimum of 100 iterations:

```typescript
fc.assert(
  fc.property(...),
  { numRuns: 100 }
);
```
