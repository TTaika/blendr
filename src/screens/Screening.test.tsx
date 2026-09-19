// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Answers, KeywordResult } from '../../shared/types';
import { Screening } from './Screening';

const founderAnswers: Answers = {
  companyName: 'Acme',
  oneLiner: 'We do X',
  stage: 'seed',
  raise: 't-2m-5m',
  problem: 'P',
  solution: 'S',
  traction: 'T',
  team: 'Team',
  involvement: 'hands-on',
  whyInvest: 'W',
  workStyle: 'Fast',
};
const result: KeywordResult = { summary: 'Acme does X', keywords: [{ id: 'fintech', reason: 'r' }], websiteUsed: false };

function setup(props: Partial<Parameters<typeof Screening>[0]> = {}) {
  const handlers = { onAnswer: vi.fn(), onGenerated: vi.fn(), onManual: vi.fn(), generate: vi.fn(async () => result) };
  render(<Screening role="founder" answers={{}} {...handlers} {...props} />);
  return { user: userEvent.setup(), ...handlers, ...props };
}

describe('Screening', () => {
  it('renders the questions for the role', () => {
    setup({ role: 'investor' });
    expect(screen.getByRole('heading', { name: 'Tell us about your investing' })).toBeInTheDocument();
    expect(screen.getByLabelText('Fund or firm')).toBeInTheDocument();
    expect(screen.getByLabelText('Fund website (optional)')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Which stages do you invest in?' })).toBeInTheDocument();
  });

  it('reports text, single-choice and multi-choice answers', async () => {
    const { user, onAnswer } = setup();
    await user.type(screen.getByLabelText('Company name'), 'A');
    expect(onAnswer).toHaveBeenLastCalledWith('companyName', 'A');
    await user.click(screen.getByLabelText('Seed'));
    expect(onAnswer).toHaveBeenLastCalledWith('stage', 'seed');
  });

  it('toggles multi-choice options', async () => {
    const { user, onAnswer } = setup({ role: 'investor', answers: { stages: ['seed'] } });
    await user.click(screen.getByLabelText('Series A'));
    expect(onAnswer).toHaveBeenLastCalledWith('stages', ['seed', 'series-a']);
    await user.click(screen.getByLabelText('Seed'));
    expect(onAnswer).toHaveBeenLastCalledWith('stages', []);
  });

  it('lists unanswered required questions instead of calling the API', async () => {
    const { user, generate } = setup({ answers: { companyName: 'Acme' } });
    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please answer: What does your company do?');
    expect(generate).not.toHaveBeenCalled();
  });

  it('calls the API, shows progress and hands over the result', async () => {
    let resolve!: (r: KeywordResult) => void;
    const generate = vi.fn(() => new Promise<KeywordResult>((r) => { resolve = r; }));
    const { user, onGenerated } = setup({ answers: founderAnswers, generate });
    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(generate).toHaveBeenCalledWith('founder', founderAnswers);
    expect(screen.getByRole('button', { name: 'Analysing your answers…' })).toBeDisabled();
    resolve(result);
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
  });

  it('offers retry and manual keywords when the API fails', async () => {
    const generate = vi.fn().mockRejectedValueOnce(new Error('Keyword generation failed. Please retry.')).mockResolvedValueOnce(result);
    const { user, onGenerated, onManual } = setup({ answers: founderAnswers, generate });
    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(await screen.findByText('Keyword generation failed. Please retry.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add keywords manually' }));
    expect(onManual).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
