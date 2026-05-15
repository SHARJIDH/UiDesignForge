---
inclusion: always
---

# Design & UI Practices

## Design Philosophy

Create beautiful, professional, and clean interfaces that balance aesthetics with usability. Prioritize clarity and user experience while maintaining visual appeal.

## Component Library

- All UI components are available from `@/components/ui` (shadcn/ui)
- AI components are available from `@/components/ai-elements`
- Use existing components before creating custom ones
- Extend shadcn components with composition, not modification

## Design System

### Color Usage

Reference CSS variables from `app/globals.css`:

**Semantic Colors:**

- `bg-background` / `text-foreground` - Base colors
- `bg-card` / `text-card-foreground` - Card surfaces
- `bg-primary` / `text-primary-foreground` - Primary actions
- `bg-secondary` / `text-secondary-foreground` - Secondary actions
- `bg-muted` / `text-muted-foreground` - Subdued content
- `bg-accent` / `text-accent-foreground` - Highlights
- `bg-destructive` / `text-destructive-foreground` - Errors/warnings
- `border-border` - Borders and dividers
- `ring-ring` - Focus rings

**Sidebar Colors:**

- `bg-sidebar` / `text-sidebar-foreground`
- `bg-sidebar-accent` / `text-sidebar-accent-foreground`

**Chart Colors:**

- `bg-chart-1` through `bg-chart-5` for data visualization

### Theme System

The app supports multiple theme presets that users can select per screen:

- **Default**: Dark mode with neutral colors
- **Claude**: Warm, amber-tinted theme
- **Vercel**: Minimal black and white
- **Cyberpunk**: Neon colors with high contrast
- And more...

Themes are applied by updating CSS variables in the sandbox's `globals.css`. Always use semantic color classes (not hardcoded colors) so themes work correctly.

### Spacing & Layout

- Use consistent spacing scale: `space-*` utilities
- Prefer `gap-*` for flex/grid spacing over margin utilities
- Maintain visual hierarchy with proper spacing

### Typography

- Default fonts: Geist (sans), system monospace, system serif
- Use semantic text sizes: `text-sm`, `text-base`, `text-lg`, etc.
- Leverage `tracking-*` utilities for letter spacing

### Borders & Shadows

- Border radius: `rounded-sm` (xs), `rounded-md`, `rounded-lg`, `rounded-xl`
- Shadows: `shadow-xs`, `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`
- Always specify border colors: `border border-border`

## UI Patterns

### Consistency

- Maintain consistent button styles and sizes across features
- Use standard spacing patterns throughout the app
- Apply uniform card styles and elevations

### Accessibility

- Use `outline-hidden` instead of `outline-none` (Tailwind v4)
- Ensure sufficient color contrast
- Include proper ARIA labels and semantic HTML
- Support keyboard navigation

### Responsive Design

- Mobile-first approach with responsive breakpoints
- Use `use-mobile` hook for conditional mobile behavior
- Test layouts across viewport sizes

### Dark Mode

- Default theme is dark mode with system preference support
- All colors automatically adapt via CSS variables
- Test both light and dark themes

### Loading States

- Use `Loader` component from `@/components/ai-elements/loader`
- Show skeleton loaders for content that takes time to load
- Provide status text during AI operations

### Error States

- Display clear error messages with retry options
- Use `toast` from Sonner for transient notifications
- Show inline errors for form validation

## Canvas-Specific UI

### Shape Properties

- Use curated color palette from `properties-utils.ts`
- Frame fill colors are subtle tints that work on dark canvas
- Stroke widths: thin (1px), normal (2px), thick (4px)
- Corner types: sharp (0px), rounded (8px)

### AI Sidebar

- Three tabs: Chat, Edit, Code
- Streaming status indicators during generation
- Model selector for AI model choice
- Image attachment support for vision models
- Credit display in header

### Code Explorer

- File tree navigation with expand/collapse
- Syntax highlighting with Shiki
- Cached file content from generation

### Edit Mode

- Visual element selection in preview
- Style controls for appearance, layout, typography
- CSS to Tailwind conversion on save

## Best Practices

- Keep interfaces clean and uncluttered
- Use whitespace effectively
- Prioritize readability and scannability
- Provide clear visual feedback for interactions
- Maintain loading and error states
- Use animations sparingly and purposefully (Framer Motion)
- Always use semantic theme colors for generated UI
