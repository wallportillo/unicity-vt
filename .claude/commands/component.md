---
name: component
emoji: 🧩
description: Scaffolds a new React component with types, tests, and stories. Use when creating a new UI component.
---

# Component

Generate React component with proper structure.

## Contents

- [Ask Component Details First](#ask-component-details-first)
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
```

Why: Requirements determine component structure.

---

## Create Component File with Types

Generate typed component:

```typescript
// src/components/Button/Button.tsx
import { type ReactNode } from 'react';

export interface ButtonProps {
  /** Button label or content */
  children: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Disabled state */
  disabled?: boolean;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
}

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
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

Why: Typed props enable IDE autocomplete and catch errors.

---

## Add Test File

Create component test:

```typescript
// src/components/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
