---
name: component
emoji: 🧩
description: Scaffolds a new React component with types, tests, and design system integration. Use when creating a new UI component.
---

# Component

Generate React component with proper structure and design system integration.

## Contents

- [Ask Component Details First](#ask-component-details-first)
- [Reference Design System](#reference-design-system)
- [Create Component File with Types](#create-component-file-with-types)
- [Add Test File](#add-test-file)
- [Create Story File If Using Storybook](#create-story-file-if-using-storybook)
- [Export from Index](#export-from-index)

---

## Ask Component Details First

Gather requirements:

```
Component name: [e.g., Button, UserCard, Modal]
Location: [e.g., src/components, src/features/auth]
Props needed: [list key props]
Has children: [yes/no]
Variant: [form input, card, button, badge, etc.]
```

Why: Requirements determine component structure.

---

## Reference Design System

**IMPORTANT:** Before creating any UI component, review the design system:

1. Read `/.claude/commands/design-system.md` for patterns
2. Import tokens from `@/styles/theme`
3. Use global styles from `@/styles/global.css`

### Required Imports

```typescript
import { colors, spacing, radius, text } from '@/styles/theme';
```

### Color Usage

| Element | Token |
|---------|-------|
| Text (headings) | `colors.primary[900]` |
| Text (body) | `colors.neutral[700]` |
| Backgrounds | `colors.surface` or `colors.background` |
| Borders | `colors.border` |
| Links/Actions | `colors.primary[500]` |
| Errors | `colors.error` |

### Spacing

Always use the spacing scale: `spacing[1]` through `spacing[16]`

### Border Radius

| Element | Token |
|---------|-------|
| Badges | `radius.sm` |
| Inputs, buttons, cards | `radius.md` |
| Modals | `radius.lg` |

Why: Design system ensures visual consistency.

---

## Create Component File with Types

Generate typed component using design tokens:

```typescript
// src/components/Button/Button.tsx
import { type ReactNode } from 'react';
import { colors, spacing, radius, text } from '@/styles/theme';

export interface ButtonProps {
  /** Button label or content */
  children: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Disabled state */
  disabled?: boolean;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: {
    backgroundColor: colors.primary[500],
    color: colors.surface,
    border: 'none',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: colors.primary[500],
    border: `1px solid ${colors.primary[500]}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.primary[500],
    border: 'none',
  },
  danger: {
    backgroundColor: colors.error,
    color: colors.surface,
    border: 'none',
  },
} as const;

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        padding: `${spacing[3]} ${spacing[5]}`,
        fontSize: text.body.size,
        fontWeight: 500,
        borderRadius: radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms ease',
        ...variantStyles[variant],
      }}
    >
      {children}
    </button>
  );
}
```

Why: Typed props with design tokens enable consistency and IDE support.

---

## Add Test File

Create component test:

```typescript
// src/components/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders correct variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

Why: Tests verify component behavior.

---

## Create Story File If Using Storybook

Add stories:

```typescript
// src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};
```

Why: Stories document component variants visually.

---

## Export from Index

Add barrel export:

```typescript
// src/components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

Update parent index:

```typescript
// src/components/index.ts
export * from './Button';
```

Why: Barrel exports simplify imports.

---

## Component Checklist

Before completing a component, verify:

- [ ] Uses design tokens from `@/styles/theme`
- [ ] No hardcoded colors, spacing, or radius values
- [ ] TypeScript props interface with JSDoc comments
- [ ] Accessibility attributes (aria-*, role, etc.)
- [ ] All variants match design system patterns
- [ ] Tests cover main functionality
- [ ] Exported from barrel index
