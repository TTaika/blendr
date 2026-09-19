// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../shared/types';
import { stubObjectUrls } from '../test/objectUrls';
import { FounderPreview } from './FounderPreview';

const profile: Profile = {
  role: 'founder',
  answers: {
    companyName: 'Acme',
    values: ['transparency', 'speed', 'integrity'],
    stage: 'seed',
    raise: ['500', '2000'],
    contactName: 'Ada Lovelace',
    contactEmail: 'ada@acme.example',
  },
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
    expect(container.querySelector('.card-values')).toHaveTextContent('Transparency / Speed of execution / Integrity');
    expect(container.querySelectorAll('.chip-label')).toHaveLength(5);
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it('shows the contact name and a mailto link, like the card investors see', () => {
    render(<FounderPreview profile={profile} onStartOver={vi.fn()} />);
    expect(screen.getByText('Ada Lovelace · Point of contact')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ada@acme.example' })).toHaveAttribute('href', 'mailto:ada@acme.example');
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

describe('FounderPreview: pitch video', () => {
  const withVideo: Profile = { ...profile, answers: { ...profile.answers, pitchVideo: 'pitch.mov · 0:48' } };
  const clip = new Blob(['clip'], { type: 'video/quicktime' });

  afterEach(() => vi.restoreAllMocks());

  it("shows the founder's own video in the card details", async () => {
    const { create } = stubObjectUrls();
    const loadVideo = vi.fn(async () => clip);
    const { container } = render(<FounderPreview profile={withVideo} onStartOver={vi.fn()} loadVideo={loadVideo} />);
    expect(await screen.findByRole('heading', { name: 'Pitch video' })).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith(clip);
    expect(container.querySelector('.card-details video')).toHaveAttribute('src', 'blob:test/1');
  });

  it('shows no video section when the founder added no video, even if an old one is still stored', async () => {
    stubObjectUrls();
    const loadVideo = vi.fn(async () => clip);
    render(<FounderPreview profile={profile} onStartOver={vi.fn()} loadVideo={loadVideo} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(loadVideo).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Pitch video' })).not.toBeInTheDocument();
    expect(screen.queryByText('Pitch video coming soon')).not.toBeInTheDocument();
  });

  it('shows no video section when this phone no longer has the video', async () => {
    stubObjectUrls();
    const loadVideo = vi.fn(async () => null);
    render(<FounderPreview profile={withVideo} onStartOver={vi.fn()} loadVideo={loadVideo} />);
    await waitFor(() => expect(loadVideo).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('heading', { name: 'Pitch video' })).not.toBeInTheDocument();
    expect(screen.queryByText('Pitch video coming soon')).not.toBeInTheDocument();
  });

  it('revokes the video URL when the preview closes', async () => {
    const { revoke } = stubObjectUrls();
    const { unmount } = render(<FounderPreview profile={withVideo} onStartOver={vi.fn()} loadVideo={vi.fn(async () => clip)} />);
    await screen.findByRole('heading', { name: 'Pitch video' });
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:test/1');
  });
});
