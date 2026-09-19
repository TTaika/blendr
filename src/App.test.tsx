// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Answers, KeywordResult } from '../shared/types';
import App from './App';
import { COMPANIES, COMPANY_BY_ID } from './data/companies';
import { randomFeed } from './lib/matching';
import { STORAGE_KEY } from './lib/storage';
import { type DemoState, initialState } from './state/demo';

const investorAnswers: Answers = {
  investorName: 'Sara Lind',
  fundName: 'Birch Ventures',
  stages: ['seed'],
  tickets: ['t-2m-5m'],
  thesis: 'Climate software for the energy transition.',
  regions: 'Nordics',
  involvement: 'hands-on',
  founderFit: 'Technical founders.',
  workStyle: 'Hands-on and direct.',
};
const investorResult: KeywordResult = {
  summary: 'Nordic climate seed fund',
  keywords: [
    { id: 'climate', reason: 'Thesis is climate software.' },
    { id: 'usage-based', reason: 'Likes usage-based pricing.' },
    { id: 'nordics', reason: 'Invests in the Nordics.' },
    { id: 'hands-on', reason: 'You chose this in the questionnaire.' },
    { id: 'technical', reason: 'Backs technical founders.' },
  ],
  websiteUsed: false,
};
const founderAnswers: Answers = {
  companyName: 'Acme',
  oneLiner: 'Payments for bakeries',
  stage: 'seed',
  raise: 't-500k-2m',
  problem: 'P',
  solution: 'S',
  traction: 'T',
  team: 'Team',
  involvement: 'hands-on',
  whyInvest: 'W',
  workStyle: 'Fast',
};

const preload = (state: Partial<DemoState>) =>
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState, ...state }));
const saved = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as DemoState;
const topCardName = () => screen.getAllByRole('article')[0].getAttribute('aria-label');

describe('App', () => {
  it('starts on role select and opens the matching questionnaire', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Reset demo' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /I'm a founder/ }));
    expect(screen.getByRole('heading', { name: 'Tell us about your startup' })).toBeInTheDocument();
  });

  it('investor: screening → AI keywords → review → ranked feed', async () => {
    const user = userEvent.setup();
    preload({ screen: 'screening', mode: 'investor', answers: investorAnswers });
    const generate = vi.fn(async () => investorResult);
    render(<App generate={generate} swipeExitMs={0} />);

    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(generate).toHaveBeenCalledWith('investor', investorAnswers);
    expect(await screen.findByRole('heading', { name: 'Sara Lind · Birch Ventures' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit profile' }));
    expect(screen.getByText('Ranked for Birch Ventures')).toBeInTheDocument();
    expect(topCardName()).toBe('Northlight Grid');
    expect(screen.getByText('80% match')).toBeInTheDocument();
  });

  it('skip: random feed, prompt after 5 likes, Connect lists the likes', async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} swipeExitMs={0} />);
    await user.click(screen.getByRole('button', { name: /Skip to swiping/ }));
    expect(screen.getByText('Random order · demo mode')).toBeInTheDocument();
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();

    const order = randomFeed(COMPANIES, () => 0).map((e) => COMPANY_BY_ID.get(e.companyId)!.name);
    expect(topCardName()).toBe(order[0]);

    for (let i = 1; i <= 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Like' }));
      await screen.findByRole('button', { name: `Connect (${i})` });
    }
    const dialog = await screen.findByRole('dialog', { name: 'Nice, 5 likes!' });
    await user.click(within(dialog).getByRole('button', { name: 'Go to Connect' }));

    expect(screen.getByText('5 liked companies')).toBeInTheDocument();
    const listed = screen.getAllByRole('listitem').map((li) => li.querySelector('.liked-name')?.textContent);
    expect(listed).toEqual(order.slice(0, 5));

    await user.click(screen.getByRole('button', { name: 'Back to swiping' }));
    expect(topCardName()).toBe(order[5]);
  });

  it('founder: submitted profile is previewed and never enters the feed', async () => {
    const user = userEvent.setup();
    preload({ screen: 'screening', mode: 'founder', answers: founderAnswers });
    const generate = vi.fn(async (): Promise<KeywordResult> => ({
      summary: 'Payments for bakeries',
      keywords: [{ id: 'fintech', reason: 'Payments.' }],
      websiteUsed: false,
    }));
    render(<App generate={generate} />);

    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    await user.click(await screen.findByRole('button', { name: 'Submit profile' }));
    expect(screen.getByRole('heading', { name: "You're live!" })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Acme' })).toBeInTheDocument();
    expect(saved().feed).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByRole('button', { name: /I'm a founder/ })).toBeInTheDocument();
  });

  it('lets the user add keywords manually when Gemini fails', async () => {
    const user = userEvent.setup();
    preload({ screen: 'screening', mode: 'founder', answers: founderAnswers });
    const generate = vi.fn(async (): Promise<KeywordResult> => {
      throw new Error('Keyword generation failed. Please retry.');
    });
    render(<App generate={generate} />);

    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    await user.click(await screen.findByRole('button', { name: 'Add keywords manually' }));
    expect(screen.getByText('No keywords yet. Add at least one below.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Add a keyword'), 'fintech');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('button', { name: 'Submit profile' })).toBeEnabled();
  });

  it('keeps progress across reloads and resets on demand', async () => {
    const user = userEvent.setup();
    const first = render(<App random={() => 0} swipeExitMs={0} />);
    await user.click(screen.getByRole('button', { name: /Skip to swiping/ }));
    await user.click(screen.getByRole('button', { name: 'Like' }));
    await screen.findByRole('button', { name: 'Connect (1)' });
    first.unmount();

    render(<App />);
    expect(screen.getByRole('button', { name: 'Connect (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(screen.getByRole('button', { name: /Skip to swiping/ })).toBeInTheDocument();
    expect(saved()).toEqual(initialState);
  });
});
