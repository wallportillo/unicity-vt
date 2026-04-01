import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Counter } from './Counter';

describe('Counter', () => {
  describe('Initial State (AC-1, AC-2, AC-3)', () => {
    it('displays initial value of 0 by default', () => {
      render(<Counter />);

      expect(screen.getByTestId('counter-value')).toHaveTextContent('0');
    });

    it('displays custom initial value when provided', () => {
      render(<Counter initialValue={10} />);

      expect(screen.getByTestId('counter-value')).toHaveTextContent('10');
    });

    it('renders both increment and decrement buttons', () => {
      render(<Counter />);

      expect(screen.getByRole('button', { name: /increment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decrement/i })).toBeInTheDocument();
    });
  });

  describe('Increment (AC-4, AC-5)', () => {
    it('increases value by 1 when increment button is clicked', async () => {
      const user = userEvent.setup();
      render(<Counter />);

      await user.click(screen.getByRole('button', { name: /increment/i }));

      expect(screen.getByTestId('counter-value')).toHaveTextContent('1');
    });

    it('can increment to any positive number', async () => {
      const user = userEvent.setup();
      render(<Counter initialValue={99} />);

      await user.click(screen.getByRole('button', { name: /increment/i }));

      expect(screen.getByTestId('counter-value')).toHaveTextContent('100');
    });

    it('increments multiple times correctly', async () => {
      const user = userEvent.setup();
      render(<Counter />);

      await user.click(screen.getByRole('button', { name: /increment/i }));
      await user.click(screen.getByRole('button', { name: /increment/i }));
      await user.click(screen.getByRole('button', { name: /increment/i }));

      expect(screen.getByTestId('counter-value')).toHaveTextContent('3');
    });
  });

  describe('Decrement (AC-6, AC-7)', () => {
    it('decreases value by 1 when decrement button is clicked', async () => {
      const user = userEvent.setup();
      render(<Counter initialValue={5} />);

      await user.click(screen.getByRole('button', { name: /decrement/i }));

      expect(screen.getByTestId('counter-value')).toHaveTextContent('4');
    });

    it('can decrement to negative numbers', async () => {
      const user = userEvent.setup();
      render(<Counter initialValue={0} />);

      await user.click(screen.getByRole('button', { name: /decrement/i }));

      expect(screen.getByTestId('counter-value')).toHaveTextContent('-1');
    });

    it('decrements multiple times correctly', async () => {
      const user = userEvent.setup();
      render(<Counter initialValue={3} />);

      await user.click(screen.getByRole('button', { name: /decrement/i }));
      await user.click(screen.getByRole('button', { name: /decrement/i }));
      await user.click(screen.getByRole('button', { name: /decrement/i }));

      expect(screen.getByTestId('counter-value')).toHaveTextContent('0');
    });
  });

  describe('Accessibility (AC-8, AC-9)', () => {
    it('buttons have accessible labels', () => {
      render(<Counter />);

      const incrementBtn = screen.getByRole('button', { name: /increment counter/i });
      const decrementBtn = screen.getByRole('button', { name: /decrement counter/i });

      expect(incrementBtn).toHaveAccessibleName('Increment counter');
      expect(decrementBtn).toHaveAccessibleName('Decrement counter');
    });

    it('counter value has aria-live for screen reader announcements', () => {
      render(<Counter />);

      const countDisplay = screen.getByTestId('counter-value');

      expect(countDisplay).toHaveAttribute('aria-live', 'polite');
      expect(countDisplay).toHaveAttribute('aria-atomic', 'true');
    });

    it('counter is wrapped in a labeled group', () => {
      render(<Counter ariaLabel="My Counter" />);

      expect(screen.getByRole('group', { name: 'My Counter' })).toBeInTheDocument();
    });
  });
});
