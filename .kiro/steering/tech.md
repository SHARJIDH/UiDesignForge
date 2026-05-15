# Tech Stack

## Core Technologies

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS v4 with CSS variables
- **UI Components**: shadcn/ui (New York style)
- **Authentication**: Clerk (with Billing for B2C subscriptions)
- **Backend/Database**: Convex
- **State Management**: React 19 with hooks + Context + useReducer
- **Icons**: Lucide React
- **Theming**: next-themes (default: dark mode)

## Key Libraries

- **Forms**: react-hook-form with zod validation
- **UI Primitives**: Radix UI components
- **Notifications**: Sonner (toast notifications)
- **Charts**: Recharts
- **Date Handling**: date-fns with react-day-picker
- **Utilities**: clsx, tailwind-merge, class-variance-authority
- **Canvas**: Custom infinite canvas with React Context + useReducer
- **IDs**: nanoid for unique shape identifiers
- **AI Agents**: Inngest AgentKit with OpenRouter
- **AI Streaming**: @inngest/realtime, @inngest/use-agent
- **AI Sandboxes**: E2B Code Interpreter for isolated execution
- **Animations**: Framer Motion for UI transitions
- **Markdown/Code**: Shiki for syntax highlighting, Streamdown for streaming markdown
- **Resizable Panels**: react-resizable-panels
- **Drawer**: Vaul for mobile-friendly drawers
- **Carousel**: Embla Carousel
- **Scroll Management**: use-stick-to-bottom
- **Token Counting**: tokenlens

## AI Components Library

Custom AI UI components in `@/components/ai-elements`:

- Conversation, Message, Loader
- PromptInput with auto-resize textarea
- Code blocks with syntax highlighting
- Reasoning/chain-of-thought display
- Tool execution visualization
- Web preview components
- Model selector dropdown
- Suggestion chips
- And many more (30+ components)

## Package Manager

- **pnpm** (lockfile: pnpm-lock.yaml)

## Common Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Linting
pnpm lint

# Convex dev server
npx convex dev

# Inngest dev server (for AI workflow)
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

## Environment Variables

Required environment variables:

- `NEXT_PUBLIC_CONVEX_URL` - Convex backend URL
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer for Convex auth
- `OPENROUTER_API_KEY` - OpenRouter API key for AI agents
- `E2B_API_KEY` - E2B API key for sandbox execution (server-side only)

## Path Aliases

- `@/*` - Root directory
- `@/components` - Components directory
- `@/components/ui` - shadcn/ui components
- `@/components/ai-elements` - AI UI components
- `@/contexts` - React Context providers
- `@/lib` - Library utilities
- `@/lib/canvas` - Canvas utilities and reducers
- `@/lib/edit-mode` - Visual edit mode utilities
- `@/hooks` - Custom React hooks
- `@/types` - TypeScript type definitions
- `@/convex` - Convex backend (schema, queries, mutations)
- `@/inngest` - Inngest AI workflow
