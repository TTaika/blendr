// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../shared/types';
import { FounderPreview } from './FounderPreview';

const profile: Profile = {
  role: 'founder',
  answers: { companyName: 'Acme', values: ['Payments trust', 'Baker-first support', 'Simple pricing'], stage: 'seed', raise: 't-500k-2m' },
  summary: '',
  keywords: [
    { id: 'fintech', reason: 'Payments', source: 'ai' },
    { id: 'foodtech', reason: 'Bakeries', source: 'ai' },
    { id: 'nordics', reason: 'Helsinki', source: 'ai' },
    { id: 'hands-on', reason: 'Chosen', source: 'ai' },
    { id: 'direct', reason: 'Added by you.', source: 'user' },
  ],
};

describe('FounderPreview', () => {
  it('shows the founder their own card with every keyword', () => {
    const { container } = render(<FounderPreview profile={profile} onStartOver={vi.fn()} />);
    expect(screen.getByRole('heading', { name: "You're live!" })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByText('Payments trust · Baker-first support · Simple pricing')).toBeInTheDocument();
    expect(container.querySelectorAll('.chip-label')).toHaveLength(5);
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it('has no demo note', () => {
    render(<FounderPreview profile={profile} onStartOver={vi.fn()} />);
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });

  it('can start over', async () => {
    const onStartOver = vi.fn();
    render(<FounderPreview profile={profile} onStartOver={onStartOver} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Start over' }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
