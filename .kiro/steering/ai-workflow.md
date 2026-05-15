# AI Workflow Architecture

## Overview

Unit {set} uses Inngest AgentKit with E2B sandboxes to provide AI-powered UI generation. Users can chat with an AI agent that writes and executes Next.js code in isolated sandbox environments with persistent sessions, conversation history, real-time streaming, and credit-based billing.

## Architecture Flow

```
User Message → Convex (persist) → /api/chat → Inngest Event → AgentKit Network → Realtime Channel → useAgents Hook → UI
                                                    ↓
                                              E2B Sandbox → Convex Update → Credit Deduction
```

1. User sends message via `AISidebar` component
2. User message saved to Convex `messages` table (with optional images and modelId)
3. `useChatStreaming` hook sends message via `useAgents` hook
4. `/api/chat` receives request and sends Inngest event
5. `runChatAgent` function gets/creates sandbox and runs agent network
6. Agent chunks published to realtime channel via `streaming.publish`
7. `useAgents` hook receives events and updates UI state in real-time
8. Response saved to Convex with files, summary, and sandbox URL
9. Credit usage recorded in Convex
10. UI updates reactively via Convex subscriptions

## Core Components

### Inngest Client (`inngest/client.ts`)

```typescript
import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "unit-set",
  isDev: process.env.NODE_ENV === "development",
  middleware: [realtimeMiddleware()],
});
```

### Realtime Channel (`inngest/realtime.ts`)

```typescript
import { channel, topic } from "@inngest/realtime";
import { AgentMessageChunkSchema } from "@inngest/agent-kit";

export const userChannel = channel(
  (channelKey: string) => `user:${channelKey}`
).addTopic(topic("agent_stream").schema(AgentMessageChunkSchema));
```

### Agent Function (`inngest/functions.ts`)

The `runChatAgent` function orchestrates the AI workflow:

- Event: `agent/chat.requested`
- Gets or creates E2B sandbox with `unitset-sandbox-v1` template
- Supports sandbox reuse via `sandboxId` stored in screen record
- Auto-pause enabled with 15-minute timeout
- Loads previous messages for conversation context
- Runs `chatAgent` in a network with max 15 iterations
- Streams events to realtime channel via `publish`
- Saves results to Convex: files, summary, sandbox URL, title
- Records credit usage after successful generation

### Streaming Configuration

```typescript
// Run network with streaming enabled
const result = await network.run(message, {
  state,
  streaming: {
    publish: async (chunk: AgentMessageChunk) => {
      await publish(userChannel(targetChannel).agent_stream(chunk));
    },
  },
});
```

### UI Coding Agent

Expert Next.js UI developer with these tools:

| Tool                  | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `terminal`            | Execute shell commands (install packages, list files) |
| `createOrUpdateFiles` | Write files to sandbox (relative paths only)          |
| `readFiles`           | Read file contents (no @ alias in paths)              |

### Agent State

```typescript
interface AgentState {
  summary: string; // Task completion summary
  filesSummary: string; // Files created/modified summary
  title: string; // Screen title
  files: { [path: string]: string }; // Generated files
}
```

### Network Router

Simple state-based routing:

- Continues until agent produces `<task_summary>` in response
- Max 15 iterations to prevent infinite loops

## AI Models

Multiple AI models available via OpenRouter (`lib/ai-models.ts`):

| Model                         | Provider  | Vision | Credits |
| ----------------------------- | --------- | ------ | ------- |
| `x-ai/grok-4.1-fast:free`     | xAI       | No     | 1       |
| `openai/gpt-5.1`              | OpenAI    | Yes    | 2       |
| `google/gemini-3-pro-preview` | Google    | Yes    | 3       |
| `anthropic/claude-opus-4.5`   | Anthropic | Yes    | 5       |

Default model: `x-ai/grok-4.1-fast:free`

### Vision Support

For models with vision support, images can be attached to messages:

- Images uploaded to Convex storage
- Converted to base64 for API
- Sent as multimodal content array to the model

## Credit System

Credit-based billing (`lib/credits.ts`):

### Plan Allocations

- **Starter**: 25 credits/month
- **Pro**: 50 credits/month

### Credit Tracking

- Credits tracked per user per billing period
- Monthly reset on 1st of each month
- Low credit warning at 5 credits remaining

### Credit Flow

1. User sends message with selected model
2. Credit cost checked before generation
3. Generation proceeds if sufficient credits
4. Credits deducted after successful completion
5. UI shows remaining balance

## E2B Sandbox

### Template: `unitset-sandbox-v1`

Pre-configured Next.js 15.3.3 environment with:

- shadcn/ui components (all installed)
- Tailwind CSS + PostCSS
- Dev server running on port 3000 with Turbopack
- Hot reload enabled

### Sandbox Lifecycle

- Auto-pause enabled via `Sandbox.betaCreate()` with `autoPause: true`
- 15-minute timeout (`SANDBOX_AUTO_PAUSE_TIMEOUT_MS`)
- Sandbox ID stored in screen record for session persistence
- Automatic resume on reconnect via `Sandbox.connect()`
- Context loss notification if sandbox fails to reconnect

### Sandbox Utilities (`inngest/utils.ts`)

```typescript
// Connect to existing sandbox
export async function getSandbox(sandboxId: string);

// Extract last assistant text message content
export function lastAssistantTextMessageContent(result: AgentResult);

// Format Convex messages for agent context
export function formatMessagesForAgent(messages: ConvexMessage[]): Message[];

// Determine if new sandbox needed
export function shouldCreateNewSandbox(screen: ConvexScreen | null): boolean;

// Parse files_summary from message content
export function parseFilesSummary(content: string): string | null;
```

## Data Model

### Convex Schema

**screens table:**

- `shapeId`: Canvas shape ID (nanoid)
- `projectId`: Parent project reference
- `title`: Screen title (extracted from AI summary)
- `sandboxUrl`: E2B sandbox URL for iframe preview
- `sandboxId`: E2B sandbox ID for session persistence
- `files`: Generated files JSON `{ [path: string]: string }`
- `theme`: Selected theme ID (default, claude, vercel, etc.)
- `createdAt`, `updatedAt`: Timestamps

**messages table:**

- `screenId`: Parent screen reference
- `role`: "user" | "assistant"
- `content`: Message content (may include `<files_summary>` tags)
- `modelId`: AI model used for this message
- `imageIds`: Array of storage IDs for attached images
- `createdAt`: Timestamp

**creditUsage table:**

- `userId`: Clerk user ID
- `creditsUsed`: Total credits used in current billing period
- `periodStart`: Timestamp of billing period start (1st of month)
- `lastUpdated`: Last update timestamp

### HTTP Endpoints (`convex/http.ts`)

Internal endpoints for Inngest workflow:

| Endpoint                     | Method | Purpose                         |
| ---------------------------- | ------ | ------------------------------- |
| `/inngest/updateScreen`      | POST   | Update screen with sandbox data |
| `/inngest/createMessage`     | POST   | Create assistant message        |
| `/inngest/getScreen`         | POST   | Get screen with sandboxId       |
| `/inngest/getMessages`       | POST   | Get message history for context |
| `/inngest/recordCreditUsage` | POST   | Record credit deduction         |

## API Routes

### POST `/api/chat`

Sends user message to agent:

```typescript
// Request (supports both formats)
// useAgents format:
{ userMessage: { id, content, role, state: { modelId, imageUrls } }, channelKey, userId }
// Legacy format:
{ message: string, screenId: string, projectId: string }

// Response
{ success: true, screenId: string, eventId: string }
```

### POST `/api/realtime/token`

Generates subscription token for frontend:

```typescript
// Request
{ channelKey: string }

// Response
{ token: string, ... }
```

### Sandbox API Routes

| Endpoint                         | Method | Purpose                         |
| -------------------------------- | ------ | ------------------------------- |
| `/api/sandbox/files`             | GET    | List files in sandbox directory |
| `/api/sandbox/files/content`     | GET    | Read file content               |
| `/api/sandbox/resume`            | POST   | Resume paused sandbox           |
| `/api/sandbox/theme`             | POST   | Apply theme to sandbox          |
| `/api/sandbox/edit-mode/enable`  | POST   | Enable visual edit mode         |
| `/api/sandbox/edit-mode/disable` | POST   | Disable visual edit mode        |

### `/api/inngest`

Inngest webhook handler serving:

- `helloWorld` (test function)
- `runChatAgent` (main chat function)

## UI Integration

### AgentProviderWrapper (`components/AgentProviderWrapper.tsx`)

Wraps the app with `AgentProvider` from `@inngest/use-agent`:

```typescript
<AgentProvider
  userId={userId}
  api={{
    sendMessage: "/api/chat",
    getRealtimeToken: "/api/realtime/token",
  }}
>
  {children}
</AgentProvider>
```

### useChatStreaming Hook (`hooks/use-chat-streaming.ts`)

Custom hook that wraps `useAgents` from `@inngest/use-agent`:

```typescript
export function useChatStreaming({
  screenId,
  projectId,
}: UseChatStreamingOptions): UseChatStreamingReturn {
  const {
    messages: agentMessages,
    status: agentStatus,
    sendMessage: agentSendMessage,
    error: agentError,
  } = useAgents({
    state: (): ClientState => ({
      screenId: screenId || "",
      projectId: projectId || "",
      modelId: currentModelIdRef.current,
      imageUrls: currentImageUrlsRef.current,
    }),
    onEvent: (event) => {
      const text = getStatusTextForEvent(event);
      setStatusText(text);
    },
  });
  // ...
}
```

**Returned Values:**

- `messages`: Merged Convex history + streaming messages
- `isLoading`: Whether agent is processing
- `isLoadingHistory`: Whether loading Convex messages
- `status`: "ready" | "submitted" | "streaming" | "error"
- `statusText`: Human-readable status from streaming events
- `streamingSteps`: Array of completed/pending steps
- `error`: Error object with retry capability and credit error details
- `sendMessage`: Send message function with options (modelId, images)
- `retryLastMessage`: Retry failed message

### useCreditBalance Hook (`hooks/use-credit-balance.ts`)

Tracks user's credit balance:

```typescript
const { remaining, total, isLoading, isLow } = useCreditBalance();
```

### useEditMode Hook (`hooks/use-edit-mode.ts`)

Visual edit mode for generated UI:

```typescript
const {
  isEditMode,
  selectedElement,
  hoveredElement,
  pendingChanges,
  enableEditMode,
  disableEditMode,
  updateStyle,
  saveChanges,
  discardChanges,
} = useEditMode({ sandboxId });
```

### useCodeExplorer Hook (`hooks/use-code-explorer.ts`)

Browse generated files:

```typescript
const {
  fileTree,
  expandedFolders,
  selectedPath,
  fileContent,
  toggleFolder,
  selectFile,
} = useCodeExplorer({ sandboxId, cachedFiles, enabled });
```

### AISidebar Component

Located at `components/canvas/AISidebar.tsx`:

- Three tabs: Chat, Edit, Code
- Message history with user/assistant bubbles (reactive via Convex)
- Real-time streaming status indicator
- Streaming steps display during processing
- Suggestion chips for quick prompts
- Auto-resize textarea input with image attachments
- Model selector dropdown
- Copy message functionality
- Error retry button with credit error handling
- Credits and timestamp display

### Chat Flow

1. User types message and optionally attaches images
2. User selects AI model (or uses default)
3. User message saved to Convex via `createMessage` mutation
4. Images uploaded to Convex storage
5. `useChatStreaming` calls `agentSendMessage` from `useAgents`
6. Hook receives streaming events via realtime channel
7. UI updates in real-time with status text and steps
8. Inngest workflow processes message
9. Assistant response saved to Convex
10. Credits deducted from user's balance
11. UI detects new Convex message and clears loading state

### Message Display

- User messages: Right-aligned bubbles with copy button, image thumbnails
- Assistant messages: Left-aligned with logo, credits, timestamp, model indicator
- `<files_summary>` and `<task_summary>` tags stripped from display
- Error messages shown with retry option
- Streaming messages shown with loading indicator

## Streaming Events

### Event Types

| Event                       | Description                    | UI Impact                 |
| --------------------------- | ------------------------------ | ------------------------- |
| `run.started`               | Agent/network execution begins | Show "Starting..." status |
| `run.completed`             | Agent/network logic finished   | Mark steps complete       |
| `stream.ended`              | All streaming complete         | Clear loading state       |
| `part.created`              | New message part created       | Add new streaming step    |
| `text.delta`                | Text chunk streamed            | Update status text        |
| `part.completed`            | Part finalized                 | Mark step complete        |
| `tool_call.arguments.delta` | Tool args streaming            | Show tool being called    |
| `tool_call.output.delta`    | Tool output streaming          | Show tool result          |

### Status Mapping (`lib/streaming-utils.ts`)

```typescript
export function getStatusTextForEvent(event: StreamingEvent): string {
  switch (event.event) {
    case "run.started":
      return "Starting...";
    case "part.created":
      return "Thinking...";
    case "tool_call.arguments.delta":
      return `Calling ${event.data?.toolName || "tool"}...`;
    // ...
  }
}
```

## Visual Edit Mode

### Architecture

1. User clicks "Edit" tab in sidebar
2. `enableEditMode()` injects overlay script into sandbox iframe
3. User clicks elements in preview to select
4. Style changes applied via postMessage to iframe
5. Changes tracked as pending until saved
6. `saveChanges()` converts CSS to Tailwind and updates source files

### Edit Mode Components

- `EditModePanel.tsx`: Main edit mode interface
- `AppearanceSection.tsx`: Colors, backgrounds, borders
- `LayoutSection.tsx`: Spacing, sizing, positioning
- `TypographySection.tsx`: Font, size, weight, alignment
- `ImageSection.tsx`: Image source and alt text

### Style Mapping (`lib/edit-mode/style-mapper.ts`)

Converts CSS properties to Tailwind classes:

```typescript
cssToTailwind({ "background-color": "#3b82f6" }); // → ["bg-[#3b82f6]"]
```

## Code Explorer

### Architecture

1. User clicks "Code" tab in sidebar
2. `useCodeExplorer` fetches file tree from sandbox
3. User navigates folders and selects files
4. File content displayed with syntax highlighting (Shiki)
5. Cached files from generation used when available

### Components

- `CodeExplorer.tsx`: Main panel with tree and viewer
- `FileTree.tsx`: Hierarchical file navigation
- `CodeViewer.tsx`: Syntax-highlighted code display

## Theme System

### Available Themes

Themes defined in `lib/canvas/theme-utils.ts`:

- Default (dark)
- Claude (warm)
- Vercel (minimal)
- Cyberpunk (neon)
- And more...

### Theme Application

1. User selects theme in `ThemeSelector`
2. Theme ID saved to screen record
3. `/api/sandbox/theme` updates globals.css in sandbox
4. Iframe reloads to apply new theme

## Agent System Prompt Rules

The agent follows strict guidelines:

### File Paths

- `createOrUpdateFiles`: Always relative (e.g., `app/page.tsx`)
- `readFiles`: Actual paths without `@` alias
- Imports in code: Use `@/` alias

### Client Components

- Add `"use client"` as first line for hooks/browser APIs

### Styling

- Tailwind CSS only (no CSS/SCSS files)
- Use semantic theme colors (bg-background, text-foreground, etc.)
- Dark mode first
- Colors adapt to user's selected theme

### shadcn/ui

- Import from individual paths: `@/components/ui/button`
- Never group-import from `@/components/ui`
- Import `cn()` from `@/lib/utils`

### Validation

Agent must run TypeScript validation before completing:

```bash
./node_modules/.bin/tsc --noEmit
```

### Forbidden Commands

- `npm run dev/build/start`
- `next dev/build/start`

### Final Output Format

```
<title>
Short descriptive title (2-5 words)
</title>

<task_summary>
Markdown-formatted summary with:
- What I Built
- Key Features
- Design Highlights
</task_summary>

<files_summary>
List each file created/modified with one-line description.
</files_summary>
```

### Captured Element Replication

When user sends `[UNITSET_ELEMENT_CAPTURE]` tags:

- Replicate captured HTML/CSS exactly
- Use exact colors (not theme colors)
- Preserve dimensions and spacing
- Keep external image URLs
- Goal is pixel-perfect replica

## Environment Variables

```env
OPENROUTER_API_KEY=sk-or-...  # Required for AI model
E2B_API_KEY=e2b_...           # Required for sandbox (server-side only)
NEXT_PUBLIC_CONVEX_URL=...    # Convex deployment URL
```

## Model Configuration

Using OpenRouter with OpenAI-compatible API:

```typescript
const openrouter = (config: { model: string }) =>
  openai({
    model: config.model,
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: "https://openrouter.ai/api/v1",
  });

// Model passed from client via state
model: openrouter({ model: modelId });
```

## Local Development

```bash
# Start Inngest dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

# Start Next.js app
pnpm dev

# Start Convex dev server (separate terminal)
npx convex dev
```

## Workflow Steps

The `runChatAgent` function executes these steps:

1. **get-screen**: Fetch screen record to check for existing sandbox
2. **get-or-create-sandbox**: Connect to existing or create new sandbox
3. **notify-context-lost**: (conditional) Notify user if sandbox session expired
4. **get-previous-messages**: Load conversation history for context
5. **Run agent network**: Execute AI agent with tools and streaming
6. **get-sandbox-url**: Get live preview URL
7. **update-screen-in-convex**: Save files, URL, title to screen record
8. **create-assistant-message**: Save response to messages table
9. **record-credit-usage**: Deduct credits from user's balance
10. **create-error-message**: (on error) Save error message

## Key Files

| File                                  | Purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `inngest/client.ts`                   | Inngest client with realtime middleware |
| `inngest/realtime.ts`                 | Realtime channel definition             |
| `inngest/functions.ts`                | Agent function with streaming           |
| `inngest/utils.ts`                    | Sandbox and message utilities           |
| `hooks/use-chat-streaming.ts`         | React hook wrapping useAgents           |
| `hooks/use-credit-balance.ts`         | Credit balance tracking                 |
| `hooks/use-edit-mode.ts`              | Visual edit mode state                  |
| `hooks/use-code-explorer.ts`          | Code explorer state                     |
| `components/AgentProviderWrapper.tsx` | AgentProvider setup                     |
| `components/canvas/AISidebar.tsx`     | Chat UI component                       |
| `lib/streaming-utils.ts`              | Event to status text mapping            |
| `lib/ai-models.ts`                    | AI model configuration                  |
| `lib/credits.ts`                      | Credit system configuration             |
| `lib/edit-mode/`                      | Edit mode utilities                     |
| `app/api/chat/route.ts`               | Chat API endpoint                       |
| `app/api/realtime/token/route.ts`     | Token generation endpoint               |
| `app/api/sandbox/`                    | Sandbox management endpoints            |

## Future Enhancements

- [x] Real-time streaming with `@inngest/realtime`
- [x] Streaming status indicators
- [x] Multiple AI model selection
- [x] Image attachments for vision models
- [x] Credit-based billing
- [x] Visual edit mode
- [x] Code explorer
- [x] Theme system
- [ ] Multi-agent workflows (reviewer, executor)
- [ ] Human-in-the-loop approval for destructive actions
- [ ] Sandbox file sync on reconnect
- [ ] Message threading and branching
- [ ] Tool call visualization in UI
- [ ] Export generated code
