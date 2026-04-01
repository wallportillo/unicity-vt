import { useState } from 'react';
import type { CounterProps } from '@/types';

export function Counter({ initialValue = 0, ariaLabel = 'Counter' }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount((prev) => prev + 1);
  const decrement = () => setCount((prev) => prev - 1);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      <button
        type="button"
        onClick={decrement}
        aria-label="Decrement counter"
      >
        -
      </button>

      <span
        aria-live="polite"
        aria-atomic="true"
        data-testid="counter-value"
      >
        {count}
      </span>

      <button
        type="button"
        onClick={increment}
        aria-label="Increment counter"
      >
        +
      </button>
    </div>
  );
}
