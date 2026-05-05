# Design Brief

## Purpose
Sketchora is a professional, browser-based drawing app inspired by Procreate, Figma, and Photoshop. The AI features (Color Palette Generator, Image Generator) extend the drawing experience with AI-powered suggestions and asset generation, accessible via a floating AI Assistant panel.

## Visual Direction
**Glassmorphic dark studio** with **cyan accents** and a **warm golden accent** for AI-specific UI elements. Professional, refined, minimal — no generic AI branding or clutter.

## Palette

| Token | OKLCH | Purpose |
|-------|-------|---------|
| `--background` | `0.11 0.006 240` | Main canvas background |
| `--accent` | `0.72 0.15 200` | Cyan: primary actions, hover states |
| `--ai-accent` | `0.75 0.18 65` | Golden: AI icon glow, highlights |
| `--foreground` | `0.95 0.005 240` | Primary text |
| `--muted` | `0.18 0.005 240` | Secondary backgrounds |
| `--border` | `0.22 0.005 240` | Panel borders |

## Typography
- **Display**: Plus Jakarta Sans (700 weight for section headers)
- **Body**: Plus Jakarta Sans (400 weight for input labels, descriptions)
- **Scale**: 12px small / 13px base / 14px labels / 16px section titles

## Shape Language
- **Tool buttons**: Circles (40px, full border-radius)
- **AI panels**: Rounded rectangles (12px border-radius)
- **Inputs**: Medium radius (8px)
- **Color swatches**: Medium radius (8px)

## Elevation & Depth
- **Glassmorphism**: All floating panels use backdrop blur (16px) + semi-transparent dark background
- **Shadows**: Soft drop shadows (4-24px blur, 0.4-0.5 opacity) for depth
- **Borders**: Subtle 1px borders with 0.1-0.5 opacity for definition without hardness

## Structural Zones
- **Toolbar (Left)**: Vertical icon row; AI icon sits with other tools using golden accent
- **AI Panel**: Draggable floating panel docked to right or left; tabs for Palette & Image modes
- **Main Canvas**: Unchanged; AI features are supplementary
- **Top Nav**: Unchanged; AI features don't intrude

## Spacing & Rhythm
- **Panel padding**: 16px
- **Component gap**: 12px internal, 8px dense
- **Input height**: 40px standard
- **Color swatch**: 60x60px with 8px gaps

## Component Patterns
- **AI Panel Header**: Title + close button (aligned right)
- **Tabs**: Underline active indicator, smooth slide transition
- **Input + Button**: Stacked (input above, button below) on mobile; side-by-side on desktop
- **Output Grid**: Responsive color swatches or image preview
- **Loading**: Spinner icon with pulse animation

## Motion
- **Panel open**: `float-in` (0.25s ease-out, fade + scale)
- **Tab switch**: Smooth fade + slide (0.2s ease)
- **Button hover**: Scale 1.02 + soft glow
- **Color swatch hover**: Scale 1.05 + border highlight
- **Spinner**: Continuous rotation (1s linear)

## Constraints
- No full-page gradients (use layered depth instead)
- No harsh shadows or neon glows (soft only)
- No generic blue CTA buttons (use cyan + golden accents strategically)
- All text on dark backgrounds meets AA+ contrast
- AI icon uses warm golden tone to signal "AI-powered" without being jarring

## Signature Detail
**Golden AI Icon**: The AI Assistant button uses a warm golden accent (oklch 0.75 0.18 65) to subtly signal "AI-powered" while remaining cohesive with the dark studio theme. Hover state adds a soft glow that draws attention without being intrusive. The icon appears alongside other tool icons in the left toolbar, maintaining visual rhythm.

## Differentiation
The AI features feel **natural and integrated**, not bolted-on. They use the same glassmorphism language as existing panels, reuse the cyan accent for primary actions, and introduce the golden accent **sparingly** only for the AI icon itself — avoiding the cliche of painting everything in "AI colors" (purple + electric blue gradients).

## Web3 Login Extension
Web3 wallet login added as a second tab alongside Internet Identity on the login page. Uses the same dark studio aesthetic, glassmorphism panels, and cyan accent. Network badge (Ethereum mainnet/Sepolia) uses cyan indicator dot. Wallet address displays in monospace font. Tab bar follows existing UI patterns with underline active indicator. Connect Wallet button matches primary action styling. No new colors introduced — reuses `--accent` and existing token set for visual cohesion.
