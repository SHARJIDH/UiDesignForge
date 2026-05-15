# Project Structure

## Directory Organization

```
/app                    - Next.js App Router pages and layouts
  /(auth)              - Authentication routes (route group)
    /sign-in           - Sign in page with Clerk
    /sign-up           - Sign up page with Clerk
    layout.tsx         - Auth layout (centered, gray background)
  /api                 - API routes
    /chat              - Chat API endpoints
      route.ts         - Send message to AI agent
      /test            - Test endpoint
    /inngest           - Inngest webhook handler
    /realtime          - Realtime token endpoints
      /token           - Token generation for streaming
    /sandbox           - Sandbox management endpoints
      /edit-mode       - Edit mode enable/disable
      /files           - File listing and content reading
      /resume          - Sandbox resume endpoint
      /theme           - Theme switching endpoint
    /threads           - Thread management
  /dashboard           - Dashboard pages
    /[projectId]       - Project-specific pages
      /canvas          - Canvas page for drawing and design
    page.tsx           - Dashboard home with project grid
  /pricing             - Pricing page with Clerk billing
  layout.tsx           - Root layout with providers
  page.tsx             - Home page
  globals.css          - Global styles and Tailwind imports

/components            - React components
  /ai-elements         - AI UI components library
    artifact.tsx       - Artifact display component
    canvas.tsx         - AI canvas component
    chain-of-thought.tsx - Chain of thought display
    checkpoint.tsx     - Checkpoint component
    code-block.tsx     - Syntax highlighted code
    confirmation.tsx   - Confirmation dialog
    connection.tsx     - Connection status
    context.tsx        - Context display
    controls.tsx       - Control components
    conversation.tsx   - Chat conversation container
    edge.tsx           - Edge component
    image.tsx          - Image display
    inline-citation.tsx - Inline citation
    loader.tsx         - AI thinking indicator
    message.tsx        - Message rendering with markdown
    model-selector.tsx - AI model selection dropdown
    node.tsx           - Node component
    open-in-chat.tsx   - Open in chat action
    panel.tsx          - Panel component
    plan.tsx           - Plan display
    prompt-input.tsx   - Auto-resize input with submit
    queue.tsx          - Queue display
    reasoning.tsx      - Chain-of-thought display
    shimmer.tsx        - Loading shimmer effect
    sources.tsx        - Sources display
    suggestion.tsx     - Suggestion chips
    task.tsx           - Task display
    tool.tsx           - Tool execution visualization
    toolbar.tsx        - AI toolbar
    web-preview.tsx    - Iframe preview component
  /canvas              - Canvas UI components
    /code-explorer     - Code explorer components
      CodeExplorer.tsx - Main code explorer panel
      CodeViewer.tsx   - Syntax-highlighted code viewer
      FileTree.tsx     - File tree navigation
      index.ts         - Exports
    /edit-mode         - Visual edit mode components
      AppearanceSection.tsx - Appearance controls
      ImageSection.tsx - Image controls
      LayoutSection.tsx - Layout controls
      TypographySection.tsx - Typography controls
      index.ts         - Exports
    /property-controls - Property control components
      ColorPicker.tsx
      CornerTypeControl.tsx
      DimensionsControl.tsx
      FontFamilyControl.tsx
      FrameFillPicker.tsx
      StrokeTypeControl.tsx
      StrokeWidthControl.tsx
      TextAlignControl.tsx
      index.ts
    /shapes            - Shape rendering components
      Arrow.tsx, ArrowPreview.tsx
      Ellipse.tsx, EllipsePreview.tsx
      Frame.tsx, FramePreview.tsx
      Line.tsx, LinePreview.tsx
      Rectangle.tsx, RectanglePreview.tsx
      Screen.tsx, ScreenPreview.tsx, ScreenCursorPreview.tsx
      Stroke.tsx, StrokePreview.tsx
      Text.tsx
    AISidebar.tsx      - AI chat sidebar panel
    BackButton.tsx     - Navigation back to dashboard
    BoundingBox.tsx    - Selection bounds with resize handles
    CanvasActions.tsx  - Canvas action buttons
    CreditBar.tsx      - Credit usage display
    DeleteScreenModal.tsx - Screen deletion confirmation
    EditModePanel.tsx  - Visual edit mode panel
    ElementPropertiesPanel.tsx - Element properties editor
    ExtensionChip.tsx  - Browser extension promotion
    GenerateButton.tsx - AI generation trigger
    HistoryPill.tsx    - Undo/redo controls
    InsufficientCreditsOverlay.tsx - Credit limit overlay
    LayersSidebar.tsx  - Layer list
    RemixFromWebModal.tsx - Remix from web modal
    SaveIndicator.tsx  - Auto-save status
    ScreenToolbar.tsx  - Screen-specific toolbar
    SelectionBox.tsx   - Multi-select rectangle
    ShapePropertiesBar.tsx - Properties panel
    ShareCanvasModal.tsx - Canvas sharing modal
    StreamingIndicator.tsx - AI streaming status
    ThemeSelector.tsx  - Theme selection dropdown
    Toolbar.tsx        - Tool selection toolbar
    ZoomBar.tsx        - Zoom controls
  /dashboard           - Dashboard-specific components
    CreateProjectDialog.tsx
    DashboardHeader.tsx
    DeleteProjectDialog.tsx
    EmptyState.tsx
    LoadingSkeleton.tsx
    NewProjectCard.tsx
    ProjectCard.tsx
    ProjectFilters.tsx
    ProjectsGrid.tsx
  /landing             - Landing page components
  /ui                  - shadcn/ui components (60+ components)
  AgentProviderWrapper.tsx - Inngest agent provider
  ConvexClientProvider.tsx - Convex + Clerk integration
  mode-toggle.tsx      - Theme toggle button
  theme-provider.tsx   - Dark/light theme provider

/contexts              - React Context providers
  CanvasContext.tsx    - Canvas state management (viewport + shapes)
  EditModeContext.tsx  - Visual edit mode state

/convex                - Convex backend
  /_generated          - Auto-generated Convex types and API
  auth.config.ts       - Clerk authentication configuration
  credits.ts           - Credit usage queries and mutations
  http.ts              - HTTP endpoints for Inngest workflow
  messages.ts          - Message queries and mutations (+ internal)
  projects.ts          - Project queries and mutations
  schema.ts            - Database schema (projects, screens, messages, creditUsage)
  screens.ts           - Screen queries and mutations (+ internal)

/inngest               - Inngest AgentKit AI workflow
  client.ts            - Inngest client configuration with realtime middleware
  functions.ts         - Agent functions (runChatAgent, helloWorld)
  realtime.ts          - Realtime channel definitions
  utils.ts             - Sandbox utilities, message formatting

/sandbox-templates     - E2B sandbox templates
  /nextjs              - Next.js sandbox template
    e2b.toml           - Template configuration (unitset-sandbox-v1)
    e2b.Dockerfile     - Sandbox Docker image
    compile_page.sh    - Startup script for dev server

/hooks                 - Custom React hooks
  use-autosave.ts      - Autosave hook with debouncing
  use-canvas-cursor.ts - Cursor management based on tool/mode
  use-canvas-persistence.ts - Canvas state persistence (localStorage + Convex)
  use-chat-streaming.ts - Chat with real-time streaming via useAgents
  use-code-explorer.ts - Code explorer state and data fetching
  use-credit-balance.ts - Credit balance tracking
  use-edit-mode.ts     - Visual edit mode state and actions
  use-infinite-canvas.ts - Main canvas interaction hook
  use-mobile.ts        - Mobile detection hook
  use-sandbox-resume.ts - Sandbox resume handling

/lib                   - Utility functions
  /canvas              - Canvas-specific utilities
    autosave-utils.ts  - Save status and conflict resolution
    canvas-capture.ts  - Canvas screenshot capture
    code-explorer-types.ts - Code explorer type definitions
    code-explorer-utils.ts - Code explorer utilities
    containment-utils.ts - Shape containment detection
    coordinate-utils.ts - Screen/world coordinate conversion
    cursor-utils.ts    - Cursor class mapping
    entity-adapter.ts  - Normalized entity state management
    history-manager.ts - Undo/redo history management
    hit-testing.ts     - Shape intersection detection
    layers-sidebar-utils.ts - Layer display utilities
    persistence.ts     - Canvas state serialization
    properties-utils.ts - Property presets and controls
    shape-factories.ts - Shape creation with defaults
    shapes-reducer.ts  - Shapes state reducer
    text-utils.ts      - Text measurement and dimensions
    theme-utils.ts     - Theme utilities
    toolbar-utils.ts   - Toolbar utilities
    viewport-reducer.ts - Viewport state reducer
    README.md          - Canvas architecture documentation
  /edit-mode           - Visual edit mode utilities
    index.ts           - Main exports
    overlay-script.ts  - Iframe overlay injection script
    sandbox-files.ts   - Sandbox file read/write utilities
    selector-generator.ts - CSS selector generation
    style-mapper.ts    - CSS to Tailwind conversion
    types.ts           - Edit mode type definitions
  /editor              - Editor utilities (planned)
  ai-models.ts         - AI model configuration
  credits.ts           - Credit system configuration
  date-utils.ts        - Date formatting utilities
  extension-content.ts - Browser extension content
  gradient-utils.ts    - Gradient generation utilities
  project-utils.ts     - Project-related utilities
  streaming-utils.ts   - Streaming event to status mapping
  utils.ts             - General utility helpers (cn function, etc.)

/types                 - TypeScript type definitions
  canvas.ts            - Canvas types (shapes, viewport, tools)
  project.ts           - Project types

/public                - Static assets
```

## Architecture Patterns

### Route Groups

- Use parentheses for route groups that don't affect URL structure: `(auth)`

### Authentication Flow

- Clerk handles authentication UI and session management
- Convex integrates with Clerk via JWT tokens
- `ConvexProviderWithClerk` wraps the app to sync auth state
- Clerk Billing for subscription management (B2C)

### Provider Hierarchy

```
ClerkProvider
  └─ ThemeProvider
      └─ ConvexClientProvider
          └─ AgentProviderWrapper (Inngest useAgents)
              └─ CanvasProvider (on canvas pages)
                  └─ EditModeProvider (on canvas pages)
                      └─ App Content
                      └─ Toaster (notifications)
```

### Canvas Architecture

- Canvas uses React Context + useReducer for state management
- Two separate reducers: viewport (pan/zoom) and shapes (drawing entities)
- Normalized entity state for shapes: `{ ids: string[], entities: Record<string, Shape> }`
- RAF throttling for performance optimization
- Auto-save to localStorage with 1-second debounce
- Custom DOM events for shape resizing
- See `canvas.md` for detailed architecture

### Data Model

**projects table:**

- User projects with canvas data, viewport state, metadata
- Thumbnail storage, style guide, tags

**screens table:**

- AI-generated screen shapes with sandbox URL, files, sandboxId
- Theme selection per screen

**messages table:**

- Chat messages per screen with role, content, modelId
- Image attachments via storage IDs

**creditUsage table:**

- Credit tracking per user per billing period
- Monthly reset on period start

### Component Conventions

- UI components in `/components/ui` are from shadcn/ui
- AI components in `/components/ai-elements` for chat UI
- Use "use client" directive for client components
- Custom providers go in `/components` root
- Page components use Server Components by default

### Styling Approach

- Tailwind CSS with CSS variables for theming
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Component variants managed with class-variance-authority
- Default theme: dark mode with system preference support
- Multiple theme presets (Claude, Vercel, Cyberpunk, etc.)

### Type Safety

- Strict TypeScript configuration
- Convex generates types automatically in `/_generated`
- Use proper typing for all components and functions

### AI Workflow Architecture

- Inngest handles background job orchestration
- AgentKit provides agent network with tools
- E2B sandboxes run isolated Next.js environments with auto-pause
- OpenRouter proxies AI model requests (multiple models supported)
- Convex HTTP endpoints for Inngest-to-database communication
- Real-time streaming via `@inngest/realtime` and `@inngest/use-agent`
- Credit system for usage tracking
- See `ai-workflow.md` for detailed architecture
