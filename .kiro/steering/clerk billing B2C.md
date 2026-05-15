---
inclusion: always
---

<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.

   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
------------------------------------------------------------------------------------->

---

Clerk Billing for B2C SaaS allows you to create Plans and manage Subscriptions **for individual users** in your application. If you'd like to charge companies or organizations, see <SDKLink href="/docs/:sdk:/guides/billing/for-b2b" sdks={["nextjs","react","expo","react-router","astro","tanstack-react-start","remix","nuxt","vue","js-frontend","expressjs","fastify","js-backend"]}>Billing for B2B SaaS</SDKLink>. You can also combine both B2C and B2B Billing in the same application.

## Enable Billing

To enable Billing for your application, navigate to the [**Billing Settings**](https://dashboard.clerk.com/~/billing/settings) page in the Clerk Dashboard. This page will guide you through enabling Billing for your application.

Clerk Billing costs the same as using Stripe Billing directly, just 0.7% per transaction, plus transaction fees which are paid directly to Stripe. Clerk Billing is **not** the same as Stripe Billing. Plans and pricing are managed directly through the Clerk Dashboard and won't sync with your existing Stripe products or plans. Clerk uses Stripe **only** for payment processing, so you don't need to set up Stripe Billing.

### Payment gateway

Once you have enabled Billing, you will see the following **Payment gateway** options for collecting payments via Stripe:

- **Clerk development gateway**: A shared **test** Stripe account used for development instances. This allows developers to test and build Billing flows **in development** without needing to create and configure a Stripe account.
- **Stripe account**: Use your own Stripe account for production. **A Stripe account created for a development instance cannot be used for production**. You will need to create a separate Stripe account for your production environment.

## Create a Plan

Subscription Plans are what your users subscribe to. There is no limit to the number of Plans you can create.

To create a Plan, navigate to the [**Subscription plans**](https://dashboard.clerk.com/~/billing/plans) page in the Clerk Dashboard. Here, you can create, edit, and delete Plans. To setup B2C Billing, select the **Plans for Users** tab and select **Add Plan**. When creating a Plan, you can also create Features for the Plan; see the next section for more information.

> \[!TIP]
> What is the **Publicly available** option?
>
> ---
>
> Plans appear in some Clerk components depending on what kind of Plan it is. All Plans can appear in the `<PricingTable />` component. If it's a user Plan, it can appear in the `<UserProfile />` component. When creating or editing a Plan, if you'd like to hide it from appearing in Clerk components, you can toggle the **Publicly available** option off.

## Add Features to a Plan

[Features](/docs/guides/secure/features) make it easy to give entitlements to your Plans. You can add any number of Features to a Plan.

You can add a Feature to a Plan when you are creating a Plan. To add it after a Plan is created:

1. Navigate to the [**Subscription plans**](https://dashboard.clerk.com/~/billing/plans) page in the Clerk Dashboard.
2. Select the Plan you'd like to add a Feature to.
3. In the **Features** section, select **Add Feature**.

> \[!TIP]
> What is the **Publicly available** option?
>
> ---
>
> Plans appear in some Clerk components depending on what kind of Plan it is. All Plans can appear in the `<PricingTable />` component. If it's a user Plan, it can appear in the `<UserProfile />` component. When adding a Feature to a Plan, it will also automatically appear in the corresponding Plan. When creating or editing a Feature, if you'd like to hide it from appearing in Clerk components, you can toggle the **Publicly available** option off.

## Create a pricing page

You can create a pricing page by using the <SDKLink href="/docs/:sdk:/reference/components/billing/pricing-table" sdks={["astro","chrome-extension","expo","nextjs","nuxt","react","react-router","remix","tanstack-react-start","vue","js-frontend"]} code={true}>\<PricingTable /></SDKLink> component. This component displays a table of Plans and Features that users can subscribe to. **It's recommended to create a dedicated page**, as shown in the following example.

<If sdk="nextjs">
  ```tsx {{ filename: 'app/pricing/page.tsx' }}
  import { PricingTable } from '@clerk/nextjs'

export default function PricingPage() {
return (

<div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
<PricingTable />
</div>
)
}

````
</If>

## Control access with Features and Plans

You can use Clerk's Features and Plans to gate access to the content. There are a few ways to do this, but the recommended approach is to either use the <SDKLink href="/docs/reference/backend/types/auth-object#has" sdks={["js-backend"]} code={true}>has()</SDKLink> method or the <SDKLink href="/docs/:sdk:/reference/components/control/protect" sdks={["astro","chrome-extension","expo","nextjs","nuxt","react","react-router","remix","tanstack-react-start","vue"]} code={true}>\<Protect></SDKLink> component.

The `has()` method is available for any JavaScript framework, while `<Protect>` is only available for React-based frameworks.

### Example: Using `has()`

Use the `has()` method to test if the user has access to a **Plan**:

```jsx
const hasPremiumAccess = has({ plan: 'gold' })
````

Or a **Feature**:

```jsx
const hasPremiumAccess = has({ feature: "widgets" });
```

The <SDKLink href="/docs/reference/backend/types/auth-object#has" sdks={["js-backend"]} code={true}>has()</SDKLink> method is a server-side helper that checks if the Organization has been granted a specific type of access control (Role, Permission, Feature, or Plan) and returns a boolean value. `has()` is available on the <SDKLink href="/docs/reference/backend/types/auth-object" sdks={["js-backend"]} code={true}>auth object</SDKLink>, which you will access differently <SDKLink href="/docs/reference/backend/types/auth-object#how-to-access-the-auth-object" sdks={["js-backend"]}>depending on the framework you are using</SDKLink>.

<Tabs items={[ "Plan", "Feature"]}>
<Tab>
The following example demonstrates how to use `has()` to check if a user has a Plan.

        <If sdk="nextjs">
          ```tsx {{ filename: 'app/bronze-content/page.tsx' }}
          import { auth } from '@clerk/nextjs/server'

          export default async function BronzeContentPage() {
            const { has } = await auth()

            const hasBronzePlan = has({ plan: 'bronze' })

            if (!hasBronzePlan) return <h1>Only subscribers to the Bronze plan can access this content.</h1>

            return <h1>For Bronze subscribers only</h1>
          }
          ```
        </If>

  </Tab>

  <Tab>
    The following example demonstrates how to use `has()` to check if a user has a Feature.

        <If sdk="nextjs">
          ```tsx {{ filename: 'app/premium-content/page.tsx' }}
          import { auth } from '@clerk/nextjs/server'

          export default async function PremiumContentPage() {
            const { has } = await auth()

            const hasPremiumAccess = has({ feature: 'premium_access' })

            if (!hasPremiumAccess)
              return <h1>Only subscribers with the Premium Access feature can access this content.</h1>

            return <h1>Our Exclusive Content</h1>
          }
          ```
        </If>

  </Tab>
</Tabs>

### Example: Using `<Protect>`

The <SDKLink href="/docs/:sdk:/reference/components/control/protect" sdks={["astro","chrome-extension","expo","nextjs","nuxt","react","react-router","remix","tanstack-react-start","vue"]} code={true}>\<Protect></SDKLink> component protects content or even entire routes by checking if the user has been granted a specific type of access control (Role, Permission, Feature, or Plan). You can pass a `fallback` prop to `<Protect>` that will be rendered if the user does not have the access control.

<Tabs items={["Plan", "Feature"]}>
<Tab>
The following example demonstrates how to use `<Protect>` to protect a page by checking if the user has a Plan.

        <If sdk="nextjs">
          ```tsx {{ filename: 'app/protected-content/page.tsx' }}
          import { Protect } from '@clerk/nextjs'

          export default function ProtectedContentPage() {
            return (
              <Protect
                plan="bronze"
                fallback={<p>Only subscribers to the Bronze plan can access this content.</p>}
              >
                <h1>Exclusive Bronze Content</h1>
                <p>This content is only visible to Bronze subscribers.</p>
              </Protect>
            )
          }
          ```
        </If>

  </Tab>

  <Tab>
    The following example demonstrates how to use `<Protect>` to protect a page by checking if the user has a Feature.

        <If sdk="nextjs">
          ```tsx {{ filename: 'app/protected-premium-content/page.tsx' }}
          import { Protect } from '@clerk/nextjs'

          export default function ProtectedPremiumContentPage() {
            return (
              <Protect
                feature="premium_access"
                fallback={<p>Only subscribers with the Premium Access feature can access this content.</p>}
              >
                <h1>Exclusive Premium Content</h1>
                <p>This content is only visible to users with Premium Access feature.</p>
              </Protect>
            )
          }
          ```
        </If>

  </Tab>
</Tabs>
