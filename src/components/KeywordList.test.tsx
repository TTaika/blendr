// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KeywordList } from './KeywordList';

const keywords = [
  { id: 'fintech', reason: 'Builds payment software.' },
  { id: 'nordics', reason: 'Based in Helsinki.' },
];

describe('KeywordList', () => {
  it('shows taxonomy labels and marks matched keywords', () => {
    render(<KeywordList keywords={keywords} matchedIds={['nordics']} />);
    expect(screen.getByRole('button', { name: 'Fintech' }).closest('li')).not.toHaveClass('chip-matched');
    // The ✓ prefix is aria-hidden, so the accessible name stays 'Nordics'.
    expect(screen.getByRole('button', { name: 'Nordics' }).closest('li')).toHaveClass('chip-matched');
  });

  it('shows the reason on tap and hides it on a second tap', async () => {
    const user = userEvent.setup();
    render(<KeywordList keywords={keywords} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fintech' }));
    expect(screen.getByRole('status')).toHaveTextContent('Fintech: Builds payment software.');
    await user.click(screen.getByRole('button', { name: 'Fintech' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the reason as a hover tooltip', () => {
    render(<KeywordList keywords={keywords} />);
    expect(screen.getByRole('button', { name: 'Nordics' })).toHaveAttribute('title', 'Based in Helsinki.');
  });

  it('offers remove buttons only when onRemove is given', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { rerender } = render(<KeywordList keywords={keywords} />);
    expect(screen.queryByRole('button', { name: 'Remove Fintech' })).not.toBeInTheDocument();
    rerender(<KeywordList keywords={keywords} onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: 'Remove Fintech' }));
    expect(onRemove).toHaveBeenCalledWith('fintech');
  });
});
