// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FeedEntry } from '../../shared/types';
import { COMPANY_BY_ID } from '../data/companies';
import { Swipe, swipeDecision } from './Swipe';

const entries: FeedEntry[] = [
  { companyId: 'northlight-grid', score: 80, matched: ['nordics'] },
  { companyId: 'routeflow', score: 65, matched: [] },
];

function setup(props: Partial<Parameters<typeof Swipe>[0]> = {}) {
  const handlers = { onLike: vi.fn(), onDiscard: vi.fn(), onOpenConnect: vi.fn(), onDismissPrompt: vi.fn(), onReviewPassed: vi.fn() };
  const result = render(
    <Swipe
      entries={entries}
      companies={COMPANY_BY_ID}
      subtitle="Ranked for Birch Ventures"
      likedCount={3}
      showConnectPrompt={false}
      exitMs={0}
      {...handlers}
      {...props}
    />,
  );
  return { user: userEvent.setup(), unmount: result.unmount, ...handlers };
}

describe('swipeDecision', () => {
  it('likes past the right threshold, passes past the left one', () => {
    expect(swipeDecision(100)).toBe('like');
    expect(swipeDecision(-100)).toBe('discard');
    expect(swipeDecision(99)).toBeNull();
    expect(swipeDecision(-40)).toBeNull();
  });
});

describe('Swipe', () => {
  it('shows only the top company with its match score', () => {
    setup();
    expect(screen.getByText('Ranked for Birch Ventures')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Northlight Grid' })).toBeInTheDocument();
    expect(screen.getByText('80% match')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Routeflow' })).not.toBeInTheDocument();
  });

  it('renders the stamp texts MATCH and PASS', () => {
    const { unmount } = setup();
    const container = screen.getByRole('main').parentElement as HTMLElement;
    const likeStamp = container.querySelector('.stamp-like');
    const passStamp = container.querySelector('.stamp-pass');
    expect(likeStamp?.textContent).toBe('MATCH');
    expect(passStamp?.textContent).toBe('PASS');
    unmount();
  });

  it('likes and passes with the buttons', async () => {
    const { user, onLike, onDiscard } = setup();
    await user.click(screen.getByRole('button', { name: 'Like' }));
    await waitFor(() => expect(onLike).toHaveBeenCalledWith('northlight-grid'));
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    await waitFor(() => expect(onDiscard).toHaveBeenCalledWith('northlight-grid'));
  });

  it('opens Connect from the header button', async () => {
    const { user, onOpenConnect } = setup();
    await user.click(screen.getByRole('button', { name: 'Connect (3)' }));
    expect(onOpenConnect).toHaveBeenCalled();
  });

  it('asks whether to visit Connect when prompted', async () => {
    const { user, onOpenConnect, onDismissPrompt } = setup({ likedCount: 5, showConnectPrompt: true });
    const dialog = screen.getByRole('dialog', { name: 'Nice, 5 likes!' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep swiping' }));
    expect(onDismissPrompt).toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Go to Connect' }));
    expect(onOpenConnect).toHaveBeenCalled();
  });

  it('shows an end state when the feed is empty', async () => {
    const { user, onOpenConnect, onReviewPassed } = setup({ entries: [] });
    expect(screen.getByRole('heading', { name: "You've seen every company" })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Like' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See passed companies again' }));
    expect(onReviewPassed).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Go to Connect' }));
    expect(onOpenConnect).toHaveBeenCalled();
  });

  it('cleans up timer on unmount to prevent stale callbacks', async () => {
    const { user, onLike, unmount } = setup({ exitMs: 50 });
    await user.click(screen.getByRole('button', { name: 'Like' }));
    unmount();
    await new Promise((r) => setTimeout(r, 100));
    expect(onLike).not.toHaveBeenCalled();
  });

  it('focuses the "Go to Connect" button when the prompt opens', () => {
    setup({ likedCount: 5, showConnectPrompt: true });
    const button = screen.getByRole('button', { name: 'Go to Connect' });
    expect(button).toHaveFocus();
  });

  it('dismisses the prompt when Escape is pressed', async () => {
    const { user, onDismissPrompt } = setup({ likedCount: 5, showConnectPrompt: true });
    await user.keyboard('{Escape}');
    expect(onDismissPrompt).toHaveBeenCalled();
  });
});
