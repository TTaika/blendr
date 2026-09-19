// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fixtureCompany } from '../test/fixtures';
import { CompanyCard } from './CompanyCard';

const chipLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('.chip-label')].map((el) => el.textContent);

describe('CompanyCard', () => {
  it('shows name, values, stage, raise and match score', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} score={80} matched={['nordics']} />);
    expect(screen.getByRole('article', { name: 'Fixture Co' })).toBeInTheDocument();
    expect(container.querySelector('.card-values')).toHaveTextContent(fixtureCompany.values.join(' / '));
    expect(screen.getByText('Seed · raising €2.5M')).toBeInTheDocument();
    expect(screen.getByText('80% match')).toBeInTheDocument();
  });

  it('hides the match score in random mode', () => {
    render(<CompanyCard company={fixtureCompany} />);
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it('shows no scroll hint', () => {
    render(<CompanyCard company={fixtureCompany} />);
    expect(screen.queryByText(/Scroll for more/)).not.toBeInTheDocument();
  });

  it('shows the top 4 keywords with matched ones first', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} matched={['nordics', 'technical']} />);
    expect(chipLabels(container)).toEqual(['✓ Nordics', '✓ Technical depth', 'Climate & energy', 'B2B SaaS']);
  });

  it('can show every keyword', () => {
    const { container } = render(<CompanyCard company={fixtureCompany} allKeywords />);
    expect(chipLabels(container)).toHaveLength(fixtureCompany.keywords.length);
  });

  it('renders the scroll-down details', () => {
    render(<CompanyCard company={fixtureCompany} />);
    for (const text of [fixtureCompany.problem, fixtureCompany.solution, fixtureCompany.team, fixtureCompany.whyInvest]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText('€620k')).toBeInTheDocument();
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
