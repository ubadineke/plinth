import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders the status with underscores turned into spaces by default', () => {
    render(<Badge status="past_due" />);
    expect(screen.getByText('past due')).toBeInTheDocument();
  });

  it('renders a custom label instead of the raw status when provided', () => {
    render(<Badge status="active" label="Live" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('active')).not.toBeInTheDocument();
  });

  it.each([
    ['active', 'text-jade-deep'],
    ['delinquent', 'text-danger'],
    ['past_due', 'text-warn'],
    ['trialing', 'text-info'],
    ['canceled', 'text-mid'],
  ])('maps status "%s" to its expected tone class', (status, expectedClass) => {
    render(<Badge status={status} />);
    expect(screen.getByText(status.replace(/_/g, ' '))).toHaveClass(expectedClass);
  });

  it('falls back to the neutral tone for an unrecognized status', () => {
    render(<Badge status="some_future_status" />);
    expect(screen.getByText('some future status')).toHaveClass('text-mid');
  });
});
