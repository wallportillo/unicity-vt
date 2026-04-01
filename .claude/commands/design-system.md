---
name: design-system
emoji: 🎨
description: Defines visual design patterns, colors, typography, and component styles for consistent UI. Use when building any UI component or page.
---

# Design System

Visual language for Unicity Support Portal based on Portal 1xOrders design patterns.

## Contents

- [Use Design Tokens for All Values](#use-design-tokens-for-all-values)
- [Apply Color Palette Consistently](#apply-color-palette-consistently)
- [Follow Typography Scale](#follow-typography-scale)
- [Use Spacing Scale](#use-spacing-scale)
- [Apply Border Radius Consistently](#apply-border-radius-consistently)
- [Style Form Inputs](#style-form-inputs)
- [Style Cards and Containers](#style-cards-and-containers)
- [Style Buttons and Actions](#style-buttons-and-actions)
- [Style Badges and Tags](#style-badges-and-tags)
- [Avoid Common Mistakes](#avoid-common-mistakes)

---

## Use Design Tokens for All Values

Always import and use design tokens. Never hardcode colors, spacing, or typography.

```tsx
// Good - uses tokens
import { colors, spacing, radius } from '@/styles/theme';

<div style={{
  backgroundColor: colors.surface,
  padding: spacing[4],
  borderRadius: radius.md
}}>

// Bad - hardcoded values
<div style={{
  backgroundColor: '#FFFFFF',
  padding: '16px',
  borderRadius: '8px'
}}>
```

Why: Tokens ensure consistency and enable theme changes.

---

## Apply Color Palette Consistently

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `colors.primary.900` | `#1E3A5F` | Primary text, headings |
| `colors.primary.700` | `#2D5A87` | Secondary text |
| `colors.primary.500` | `#2563EB` | Links, actions, focus |
| `colors.primary.100` | `#DBEAFE` | Badges, highlights |
| `colors.primary.50` | `#EFF6FF` | Hover states |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `colors.neutral.900` | `#1E293B` | Headings |
| `colors.neutral.700` | `#334155` | Body text |
| `colors.neutral.500` | `#64748B` | Placeholder, disabled |
| `colors.neutral.300` | `#CBD5E1` | Borders |
| `colors.neutral.100` | `#F1F5F9` | Backgrounds |
| `colors.neutral.50` | `#F8FAFC` | Page background |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `colors.surface` | `#FFFFFF` | Cards, inputs |
| `colors.background` | `#F0F4F8` | Page background |
| `colors.border` | `#CBD5E1` | Default borders |
| `colors.error` | `#DC2626` | Error states |
| `colors.success` | `#16A34A` | Success states |
| `colors.warning` | `#D97706` | Warning states |

Why: Consistent colors create visual harmony.

---

## Follow Typography Scale

### Font Family

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Fira Code', monospace;
```

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text.h1` | 24px | 700 | Page titles |
| `text.h2` | 20px | 600 | Section titles |
| `text.h3` | 16px | 600 | Card titles |
| `text.body` | 14px | 400 | Body text |
| `text.label` | 14px | 500 | Form labels |
| `text.small` | 12px | 400 | Helper text |
| `text.caption` | 11px | 500 | Badges, tags |

### Line Heights

| Usage | Value |
|-------|-------|
| Headings | 1.25 |
| Body | 1.5 |
| Compact | 1.25 |

Why: Consistent typography creates hierarchy.

---

## Use Spacing Scale

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `spacing[1]` | 4px | Tight gaps |
| `spacing[2]` | 8px | Icon gaps, inline spacing |
| `spacing[3]` | 12px | Small padding |
| `spacing[4]` | 16px | Default padding |
| `spacing[5]` | 20px | Section gaps |
| `spacing[6]` | 24px | Card padding |
| `spacing[8]` | 32px | Section spacing |
| `spacing[10]` | 40px | Page padding |
| `spacing[12]` | 48px | Large gaps |

Why: Consistent spacing creates rhythm.

---

## Apply Border Radius Consistently

| Token | Value | Usage |
|-------|-------|-------|
| `radius.none` | 0px | Sharp corners (rare) |
| `radius.sm` | 4px | Small elements, badges |
| `radius.md` | 8px | Inputs, buttons, cards |
| `radius.lg` | 12px | Modals, large cards |
| `radius.full` | 9999px | Pills, avatars |

Why: Consistent radius creates cohesion.

---

## Style Form Inputs

### Default Input

```tsx
<input
  style={{
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: text.body.size,
    color: colors.neutral[900],
  }}
/>
```

### Input States

| State | Border | Background |
|-------|--------|------------|
| Default | `colors.border` | `colors.surface` |
| Focus | `colors.primary.500` | `colors.surface` |
| Error | `colors.error` | `colors.surface` |
| Disabled | `colors.neutral.200` | `colors.neutral.100` |

### Labels

```tsx
<label
  style={{
    display: 'block',
    marginBottom: spacing[2],
    fontSize: text.label.size,
    fontWeight: text.label.weight,
    color: colors.primary[900],
  }}
>
  Field Label
</label>
```

Why: Form styling affects usability.

---

## Style Cards and Containers

### Standard Card

```tsx
<div
  style={{
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: spacing[6],
  }}
>
  {/* Card content */}
</div>
```

### Card with Header

```tsx
<div style={{ /* card styles */ }}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  }}>
    <Icon />
    <h3 style={{ ...text.h3, color: colors.primary[900] }}>
      Card Title
    </h3>
  </div>
  {/* Card content */}
</div>
```

Why: Cards group related content.

---

## Style Buttons and Actions

### Primary Button

```tsx
<button
  style={{
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: colors.primary[500],
    color: colors.surface,
    border: 'none',
    borderRadius: radius.md,
    fontSize: text.body.size,
    fontWeight: 500,
    cursor: 'pointer',
  }}
>
  Action
</button>
```

### Button Variants

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | `primary.500` | white | none |
| Secondary | transparent | `primary.500` | `primary.500` |
| Ghost | transparent | `primary.500` | none |
| Danger | `error` | white | none |

### Link Style

```tsx
<a
  style={{
    color: colors.primary[500],
    textDecoration: 'none',
    cursor: 'pointer',
  }}
>
  Link text
</a>
```

Why: Clear action hierarchy guides users.

---

## Style Badges and Tags

### Default Badge

```tsx
<span
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: colors.primary[100],
    color: colors.primary[900],
    fontSize: text.caption.size,
    fontWeight: text.caption.weight,
    borderRadius: radius.sm,
  }}
>
  TEL
</span>
```

### Badge Variants

| Variant | Background | Text |
|---------|------------|------|
| Default | `primary.100` | `primary.900` |
| Success | `#DCFCE7` | `#166534` |
| Warning | `#FEF3C7` | `#92400E` |
| Error | `#FEE2E2` | `#991B1B` |

Why: Badges communicate status quickly.

---

## Avoid Common Mistakes

### Don't

- ❌ Use colors not in the palette
- ❌ Hardcode pixel values for spacing
- ❌ Mix border radius sizes on same level
- ❌ Use more than 2 font weights in one component
- ❌ Create shadows (design is flat)
- ❌ Use pure black (`#000000`) for text

### Do

- ✅ Import tokens from theme
- ✅ Use spacing scale for all gaps/padding
- ✅ Keep radius consistent within components
- ✅ Use navy (`primary.900`) for text
- ✅ Keep design flat, minimal
- ✅ Maintain generous whitespace

Why: Consistency is the foundation of good design.

---

## Reference Files

- **Tokens:** `src/styles/tokens.css`
- **Theme:** `src/styles/theme.ts`
- **Base styles:** `src/styles/global.css`
