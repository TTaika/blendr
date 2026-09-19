// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../shared/types';
import { ProfileReview } from './ProfileReview';

const profile: Profile = {
  role: 'investor',
  answers: { investorName: 'Sara Lind', fundName: 'Birch Ventures' },
  summary: 'Seed fund for Nordic fintech',
  keywords: [
    { id: 'fintech', reason: 'Thesis mentions payments.', source: 'ai' },
    { id: 'nordics', reason: 'Invests in the Nordics.', source: 'ai' },
  ],
};

function setup(p: Profile = profile) {
  const handlers = { onAdd: vi.fn(), onRemove: vi.fn(), onEditAnswers: vi.fn(), onSubmit: vi.fn() };
  render(<ProfileReview profile={p} {...handlers} />);
  return { user: userEvent.setup(), ...handlers };
}

describe('ProfileReview', () => {
  it('shows who the profile is for and groups keywords by category', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Sara Lind · Birch Ventures' })).toBeInTheDocument();
    expect(screen.getByText('Seed fund for Nordic fintech')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Sector' })).getByRole('button', { name: 'Fintech' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Geography' })).getByRole('button', { name: 'Nordics' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Personality & work style' })).not.toBeInTheDocument();
  });

  it('removes a keyword', async () => {
    const { user, onRemove } = setup();
    await user.click(screen.getByRole('button', { name: 'Remove Fintech' }));
    expect(onRemove).toHaveBeenCalledWith('fintech');
  });

  it('adds a keyword that is not chosen yet', async () => {
    const { user, onAdd } = setup();
    expect(screen.queryByRole('option', { name: 'Fintech' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Add a keyword'), 'data-driven');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith({ id: 'data-driven', reason: 'Added by you.', source: 'user' });
  });

  it('submits and goes back to edit answers', async () => {
    const { user, onSubmit, onEditAnswers } = setup();
    await user.click(screen.getByRole('button', { name: 'Submit profile' }));
    expect(onSubmit).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Edit answers' }));
    expect(onEditAnswers).toHaveBeenCalled();
  });

  it('requires at least one keyword before submitting', () => {
    setup({ ...profile, role: 'founder', answers: { companyName: 'Acme' }, keywords: [] });
    expect(screen.getByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByText('No keywords yet. Add at least one below.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit profile' })).toBeDisabled();
  });
});
