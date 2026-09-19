// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fixtureCompany } from '../test/fixtures';
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
    rerender(<CompanyCard company={{ ...fixtureCompany, videoUrl: '/videos/pitch.mp4' }} />);
    expect(container.querySelector('video')).toHaveAttribute('src', '/videos/pitch.mp4');
  });
});
