---
inclusion: always
---

# Authentication & Billing

Since we are using Clerk authentication with Convex backend, on the client side we have middleware for protection, on Convex side:

## Authentication State in Convex Functions

If the client is authenticated, you can access the information stored in the JWT via `ctx.auth.getUserIdentity`.

If the client isn't authenticated, `ctx.auth.getUserIdentity` will return null.

```typescript
// convex/messages.ts
import { query } from "./_generated/server";

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("author"), identity.email))
      .collect();
  },
});
```

## Accessing User Information Client-Side

To access the authenticated user's information, use Clerk's User object via the `useUser()` hook:

```typescript
// components/Badge.tsx
import { useUser } from "@clerk/nextjs";

export default function Badge() {
  const { user } = useUser();
  return <span>Logged in as {user?.fullName}</span>;
}
```

## Clerk Billing (B2C)

We use Clerk Billing for subscription management. Plans and features are configured in the Clerk Dashboard.

### Checking Plan Access

Use the `has()` method to check if a user has access to a plan or feature:

```typescript
// Server-side (in page or API route)
import { auth } from "@clerk/nextjs/server";

export default async function ProtectedPage() {
  const { has } = await auth();

  const hasProPlan = has({ plan: "pro_user" });
  const hasCredits = has({ feature: "50_credits_month" });

  if (!hasProPlan) {
    return <p>Upgrade to Pro to access this feature.</p>;
  }

  return <h1>Pro Content</h1>;
}
```

### Using the Protect Component

```tsx
import { Protect } from "@clerk/nextjs";

export default function ProtectedContent() {
  return (
    <Protect
      plan="pro_user"
      fallback={<p>Upgrade to Pro to access this content.</p>}
    >
      <h1>Exclusive Pro Content</h1>
    </Protect>
  );
}
```

### Pricing Table

Display subscription plans with the `<PricingTable />` component:

```tsx
// app/pricing/page.tsx
import { PricingTable } from "@clerk/nextjs";

export default function PricingPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 1rem" }}>
      <PricingTable />
    </div>
  );
}
```

## Credit System

Credits are tracked in Convex and tied to Clerk subscription features:

- **Starter Plan**: 25 credits/month (`25_credits_month` feature)
- **Pro Plan**: 50 credits/month (`50_credits_month` feature)

### Getting Credit Balance

```typescript
// hooks/use-credit-balance.ts
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getCreditAllocationFromFeatures } from "@/lib/credits";

export function useCreditBalance() {
  const { user } = useUser();
  const features = user?.publicMetadata?.features as string[] | undefined;
  const totalCredits = getCreditAllocationFromFeatures(features || []);

  const usage = useQuery(api.credits.getCreditUsage);
  const usedCredits = usage?.creditsUsed ?? 0;
  const remaining = Math.max(0, totalCredits - usedCredits);

  return { remaining, total: totalCredits, isLow: remaining <= 5 };
}
```

### Recording Credit Usage

Credit usage is recorded after successful AI generation in the Inngest workflow:

```typescript
// Called from inngest/functions.ts after successful generation
await fetch(`${convexHttpUrl}/inngest/recordCreditUsage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId,
    credits: creditCost,
    modelId,
  }),
});
```
