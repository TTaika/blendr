// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureCompany } from '../test/fixtures';
import { stubVideoPlayback } from '../test/media';
import { CompanyCard } from './CompanyCard';

const chipLabels = (container: ParentNode) =>
  [...container.querySelectorAll('.chip-label')].map((el) => el.textContent);

describe('CompanyCard', () => {
  it('shows name, values, stage and raise', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} matched={['nordics']} />);
    expect(screen.getByRole('article', { name: 'Fixture Co' })).toBeInTheDocument();
    expect(container.querySelector('.card-values')).toHaveTextContent(fixtureCompany.values.join(' / '));
    expect(screen.getByText('Seed · raising €2.5M')).toBeInTheDocument();
  });

  it('shows the amount raised so far between the stage and the raise, only when the company has one', () => {
    const { rerender } = render(<CompanyCard company={{ ...fixtureCompany, raised: 1000 }} />);
    expect(screen.getByText('Seed · raised €1M · raising €2.5M')).toHaveClass('card-meta');
    rerender(<CompanyCard company={fixtureCompany} />);
    expect(screen.queryByText(/raised/)).not.toBeInTheDocument();
  });

  it('words the lowest and highest amounts to read naturally mid-sentence', () => {
    const { rerender } = render(<CompanyCard company={{ ...fixtureCompany, raised: 0 }} />);
    expect(screen.getByText('Seed · raised under €100k · raising €2.5M')).toBeInTheDocument();
    rerender(<CompanyCard company={{ ...fixtureCompany, raised: 0, raise: [0, 500] }} />);
    expect(screen.getByText('Seed · raised under €100k · raising under €100k – €500k')).toBeInTheDocument();
    rerender(<CompanyCard company={{ ...fixtureCompany, stage: 'series-b-plus', raised: 100000, raise: [50000, 100000] }} />);
    expect(screen.getByText('Series B+ · raised €100M+ · raising €50M – €100M+')).toBeInTheDocument();
  });

  it('never shows a match percentage anywhere', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} fit="strong" matched={['nordics', 'technical']} />);
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
    expect(container.querySelector('.match')).toBeNull();
  });

  it('shows no scroll hint', () => {
    render(<CompanyCard company={fixtureCompany} />);
    expect(screen.queryByText(/Scroll for more/)).not.toBeInTheDocument();
  });

  it('shows no fit block when no fit prop is given', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} matched={['technical']} />);
    expect(container.querySelector('.fit')).toBeNull();
  });

  it('shows the fit label and "You both" shared traits when fit and matching personality keywords are given', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} fit="strong" matched={['technical']} />);
    const fitBlock = container.querySelector('.fit');
    expect(fitBlock).not.toBeNull();
    expect(fitBlock).toHaveClass('fit-strong');
    expect(within(fitBlock as HTMLElement).getByText('Strong personality fit')).toBeInTheDocument();
    expect(within(fitBlock as HTMLElement).getByText('You both: Technical depth')).toBeInTheDocument();
  });

  it('omits the "You both" line when there are no shared personality traits', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} fit="different" matched={[]} />);
    const fitBlock = container.querySelector('.fit') as HTMLElement;
    expect(within(fitBlock).getByText('Different styles, could complement')).toBeInTheDocument();
    expect(within(fitBlock).queryByText(/You both:/)).not.toBeInTheDocument();
  });

  it('lists the personality keywords under "Team personality", marking the shared one', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} matched={['technical']} />);
    expect(screen.getByRole('heading', { name: 'Team personality' })).toBeInTheDocument();
    const section = container.querySelector('.card-personality') as HTMLElement;
    expect(chipLabels(section)).toEqual(['✓ Technical depth']);
  });

  it('omits "Team personality" when the company has no personality keywords', () => {
    const noPersonality = { ...fixtureCompany, keywords: fixtureCompany.keywords.filter((k) => k.id !== 'technical') };
    render(<CompanyCard company={noPersonality} />);
    expect(screen.queryByRole('heading', { name: 'Team personality' })).not.toBeInTheDocument();
  });

  it('shows the Focus keywords, matched first, excluding personality keywords', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} matched={['nordics', 'technical']} />);
    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument();
    const section = container.querySelector('.card-focus') as HTMLElement;
    expect(chipLabels(section)).toEqual(['✓ Nordics', 'Climate & energy', 'B2B SaaS', 'Usage-based']);
    expect(chipLabels(section)).not.toContain('Technical depth');
    expect(chipLabels(section)).not.toContain('✓ Technical depth');
  });

  it('can show every focus keyword', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} allKeywords />);
    const section = container.querySelector('.card-focus') as HTMLElement;
    const nonPersonalityCount = fixtureCompany.keywords.filter((k) => k.id !== 'technical').length;
    expect(chipLabels(section)).toHaveLength(nonPersonalityCount);
  });

  it('renders the scroll-down details', () => {
    render(<CompanyCard company={fixtureCompany} />);
    for (const text of [fixtureCompany.problem, fixtureCompany.solution, fixtureCompany.team, fixtureCompany.whyInvest]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText('€620k')).toBeInTheDocument();
  });

  it('headings the problem detail "Problem & solution" when the solution is empty, and "Problem" when both are present', () => {
    const { rerender } = render(<CompanyCard company={{ ...fixtureCompany, solution: '' }} />);
    expect(screen.getByRole('heading', { name: 'Problem & solution' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Problem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Solution' })).not.toBeInTheDocument();

    rerender(<CompanyCard company={fixtureCompany} />);
    expect(screen.getByRole('heading', { name: 'Problem' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Solution' })).toBeInTheDocument();
  });

  it('shows contact details only when asked', () => {
    const { rerender } = render(<CompanyCard company={fixtureCompany} />);
    expect(screen.queryByText(fixtureCompany.contact.email)).not.toBeInTheDocument();
    rerender(<CompanyCard company={fixtureCompany} showContact />);
    expect(screen.getByRole('link', { name: fixtureCompany.contact.email })).toHaveAttribute('href', `mailto:${fixtureCompany.contact.email}`);
    expect(screen.getByText(`${fixtureCompany.contact.name} · ${fixtureCompany.contact.title}`)).toBeInTheDocument();
  });

  it('renders a video only when the company has one', () => {
    const { container, rerender } = render(<CompanyCard company={fixtureCompany} />);
    expect(container.querySelector('video')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Pitch video' })).not.toBeInTheDocument();
    rerender(<CompanyCard company={{ ...fixtureCompany, videoUrl: '/videos/pitch.mp4' }} />);
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', '/videos/pitch.mp4');
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('preload', 'metadata');
  });

  it('puts the pitch video in the scroll-down details, after "Why invest"', () => {
    const { container } = render(<CompanyCard company={{ ...fixtureCompany, videoUrl: '/videos/pitch.mp4' }} />);
    const details = container.querySelector('.card-details') as HTMLElement;
    const headings = within(details).getAllByRole('heading').map((h) => h.textContent);
    expect(headings.indexOf('Pitch video')).toBe(headings.indexOf('Why invest') + 1);
    expect(container.querySelector('.card-head video')).toBeNull();
  });

  it('swaps a video that fails to load for a quiet "Pitch video coming soon" placeholder', () => {
    const { container } = render(<CompanyCard company={{ ...fixtureCompany, videoUrl: '/videos/pitch.mp4' }} />);
    fireEvent.error(container.querySelector('video')!);
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Pitch video' })).toBeInTheDocument();
    expect(screen.getByText('Pitch video coming soon')).toHaveClass('video-placeholder');
  });

  it('tries again when the card gets a different video', () => {
    const { container, rerender } = render(<CompanyCard company={{ ...fixtureCompany, videoUrl: '/videos/pitch.mp4' }} />);
    fireEvent.error(container.querySelector('video')!);
    rerender(<CompanyCard company={{ ...fixtureCompany, videoUrl: '/videos/other.mp4' }} />);
    expect(container.querySelector('video')).toHaveAttribute('src', '/videos/other.mp4');
    expect(screen.queryByText('Pitch video coming soon')).not.toBeInTheDocument();
  });
});

describe('CompanyCard: pitch video autoplay', () => {
  const withVideo = { ...fixtureCompany, videoUrl: '/videos/pitch.mp4' };
  const videoOf = (container: HTMLElement) => container.querySelector('video')!;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('plays once at least half of the video is on screen', () => {
    const media = stubVideoPlayback();
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    media.showVideo(video, 0.4);
    expect(media.play).not.toHaveBeenCalled();
    media.showVideo(video, 0.5);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(video.paused).toBe(false);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('controls');
  });

  it("doesn't play on a card that isn't active", () => {
    const media = stubVideoPlayback();
    const { container } = render(<CompanyCard company={withVideo} />);
    media.showVideo(videoOf(container), 1);
    expect(media.play).not.toHaveBeenCalled();
  });

  it('starts playing when the card becomes active while its video is already on screen', () => {
    const media = stubVideoPlayback();
    const { container, rerender } = render(<CompanyCard company={withVideo} autoplayVideo={false} />);
    media.showVideo(videoOf(container), 0.8);
    expect(media.play).not.toHaveBeenCalled();
    rerender(<CompanyCard company={withVideo} autoplayVideo />);
    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it('starts muted when the browser blocks autoplay with sound', async () => {
    const media = stubVideoPlayback();
    media.play.mockRejectedValueOnce(new DOMException('Sound needs a gesture', 'NotAllowedError'));
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    expect(video.muted).toBe(false);
    media.showVideo(video, 0.6);
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(2));
    expect(video.muted).toBe(true);
    expect(video.paused).toBe(false);
  });

  it("doesn't retry muted when the start was interrupted rather than blocked", async () => {
    const media = stubVideoPlayback();
    media.play.mockRejectedValueOnce(new DOMException('Interrupted by pause()', 'AbortError'));
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    media.showVideo(video, 0.6);
    await new Promise((r) => setTimeout(r, 0));
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(false);
  });

  it('pauses below half visible, and resumes what it paused when scrolled back', () => {
    const media = stubVideoPlayback();
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    media.showVideo(video, 1);
    media.showVideo(video, 0.3);
    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(video.paused).toBe(true);
    media.showVideo(video, 0.7);
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(video.paused).toBe(false);
  });

  it("doesn't resume a video the viewer paused, or one that ended", () => {
    const media = stubVideoPlayback();
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    media.showVideo(video, 1);
    media.stopByViewer(video);
    media.showVideo(video, 0);
    media.showVideo(video, 1);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.pause).not.toHaveBeenCalled();
  });

  it('stops watching the video when the card goes away', () => {
    const media = stubVideoPlayback();
    const { container, unmount } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    expect(media.watching(video)).toBe(1);
    unmount();
    expect(media.watching(video)).toBe(0);
  });

  it('still falls back to "Pitch video coming soon" when the video fails to load', () => {
    const media = stubVideoPlayback();
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    const video = videoOf(container);
    fireEvent.error(video);
    expect(screen.getByText('Pitch video coming soon')).toBeInTheDocument();
    expect(media.watching(video)).toBe(0);
  });

  it('does nothing where IntersectionObserver is missing', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    expect(typeof IntersectionObserver).toBe('undefined');
    const { container } = render(<CompanyCard company={withVideo} autoplayVideo />);
    expect(container.querySelector('video')).not.toBeNull();
    expect(play).not.toHaveBeenCalled();
  });
});
