// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COMPANY_BY_ID } from '../data/companies';
import { CompanyCard } from './CompanyCard';

const northlight = COMPANY_BY_ID.get('northlight-grid')!;
const chipLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('.chip-label')].map((el) => el.textContent);

describe('CompanyCard', () => {
  it('shows name, values, stage, raise and match score', () => {
    render(<CompanyCard company={northlight} score={80} matched={['nordics']} />);
    expect(screen.getByRole('article', { name: 'Northlight Grid' })).toBeInTheDocument();
    expect(screen.getByText(northlight.values.join(' · '))).toBeInTheDocument();
    expect(screen.getByText('Seed · raising €2M – €5M')).toBeInTheDocument();
    expect(screen.getByText('80% match')).toBeInTheDocument();
  });

  it('hides the match score in random mode', () => {
    render(<CompanyCard company={northlight} />);
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it('shows no scroll hint', () => {
    render(<CompanyCard company={northlight} />);
    expect(screen.queryByText(/Scroll for more/)).not.toBeInTheDocument();
  });

  it('shows the top 4 keywords with matched ones first', () => {
    const { container } = render(<CompanyCard company={northlight} matched={['nordics', 'technical']} />);
    expect(chipLabels(container)).toEqual(['✓ Nordics', '✓ Technical depth', 'Climate & energy', 'B2B SaaS']);
  });

  it('can show every keyword', () => {
    const { container } = render(<CompanyCard company={northlight} allKeywords />);
    expect(chipLabels(container)).toHaveLength(northlight.keywords.length);
  });

  it('renders the scroll-down details', () => {
    render(<CompanyCard company={northlight} />);
    for (const text of [northlight.problem, northlight.solution, northlight.team, northlight.whyInvest]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText('€620k')).toBeInTheDocument();
  });

  it('shows contact details only when asked', () => {
    const { rerender } = render(<CompanyCard company={northlight} />);
    expect(screen.queryByText(northlight.contact.email)).not.toBeInTheDocument();
    rerender(<CompanyCard company={northlight} showContact />);
    expect(screen.getByRole('link', { name: northlight.contact.email })).toHaveAttribute('href', `mailto:${northlight.contact.email}`);
    expect(screen.getByText(`${northlight.contact.name} · ${northlight.contact.title}`)).toBeInTheDocument();
  });

  it('renders a video only when the company has one', () => {
    const { container, rerender } = render(<CompanyCard company={northlight} />);
    expect(container.querySelector('video')).toBeNull();
    rerender(<CompanyCard company={{ ...northlight, videoUrl: '/videos/pitch.mp4' }} />);
    expect(container.querySelector('video')).toHaveAttribute('src', '/videos/pitch.mp4');
  });
});
