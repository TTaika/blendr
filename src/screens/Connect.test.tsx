// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureCompany, fixtureCompany2 } from '../test/fixtures';
import { Connect } from './Connect';

const liked = [fixtureCompany, fixtureCompany2];

describe('Connect', () => {
  it('lists liked companies in like order', () => {
    render(<Connect companies={liked} onBackToSwiping={vi.fn()} onBookMeeting={vi.fn()} />);
    expect(screen.getByText('2 liked companies')).toBeInTheDocument();
    const names = screen.getAllByRole('listitem').map((li) => li.querySelector('.liked-name')?.textContent);
    expect(names).toEqual([fixtureCompany.name, fixtureCompany2.name]);
  });

  it('opens the full profile with contact details and returns to the list', async () => {
    const user = userEvent.setup();
    render(<Connect companies={liked} onBackToSwiping={vi.fn()} onBookMeeting={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: new RegExp(fixtureCompany2.name) }));
    expect(screen.getByRole('article', { name: fixtureCompany2.name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fixtureCompany2.contact.email })).toHaveAttribute('href', `mailto:${fixtureCompany2.contact.email}`);
    await user.click(screen.getByRole('button', { name: '← All likes' }));
    expect(screen.getByText('2 liked companies')).toBeInTheDocument();
  });

  it('goes back to swiping from the list and from a profile', async () => {
    const user = userEvent.setup();
    const onBackToSwiping = vi.fn();
    render(<Connect companies={liked} onBackToSwiping={onBackToSwiping} onBookMeeting={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Back to swiping' }));
    await user.click(screen.getByRole('button', { name: new RegExp(fixtureCompany.name) }));
    await user.click(screen.getByRole('button', { name: 'Back to swiping' }));
    expect(onBackToSwiping).toHaveBeenCalledTimes(2);
  });

  it('explains the empty state', () => {
    render(<Connect companies={[]} onBackToSwiping={vi.fn()} onBookMeeting={vi.fn()} />);
    expect(screen.getByText('No likes yet. Swipe right on the companies you want to meet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book a meeting' })).not.toBeInTheDocument();
  });

  it('offers Book a meeting in a bottom bar under the likes, not on a single profile', async () => {
    const user = userEvent.setup();
    const onBookMeeting = vi.fn();
    render(<Connect companies={liked} onBackToSwiping={vi.fn()} onBookMeeting={onBookMeeting} />);
    const book = screen.getByRole('button', { name: 'Book a meeting' });
    expect(book.closest('.step-actions')).not.toBeNull();
    await user.click(book);
    expect(onBookMeeting).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: new RegExp(fixtureCompany.name) }));
    expect(screen.queryByRole('button', { name: 'Book a meeting' })).not.toBeInTheDocument();
  });

  it('has no meeting-invite features', () => {
    render(<Connect companies={liked} onBackToSwiping={vi.fn()} onBookMeeting={vi.fn()} />);
    expect(screen.queryByText(/invite|calendar|schedule/i)).not.toBeInTheDocument();
  });
});
