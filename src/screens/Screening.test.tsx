// @vitest-environment jsdom
import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Answers, KeywordResult, Role } from '../../shared/types';
import { Screening, type ScreeningProps } from './Screening';

const founderAnswers: Answers = {
  companyName: 'Acme',
  values: ['Payments trust', 'Baker-first support', 'Simple pricing'],
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

function setup(props: Partial<ScreeningProps> = {}) {
  const handlers = { onAnswer: vi.fn(), onGenerated: vi.fn(), onManual: vi.fn(), generate: vi.fn(async () => result) };
  const utils = render(<Screening role="founder" answers={{}} {...handlers} {...props} />);
  return { user: userEvent.setup(), ...handlers, ...props, ...utils };
}

interface ControlledProps {
  role: Role;
  initial?: Answers;
  generate?: ScreeningProps['generate'];
  onGenerated?: ScreeningProps['onGenerated'];
}

function Controlled({ role, initial = {}, generate, onGenerated = vi.fn() }: ControlledProps) {
  const [answers, setAnswers] = useState<Answers>(initial);
  return (
    <Screening
      role={role}
      answers={answers}
      onAnswer={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
      onGenerated={onGenerated}
      onManual={vi.fn()}
      generate={generate}
    />
  );
}

/** Clicks Next repeatedly until the button reads "Generate my profile" (only safe when every step is already answered). */
async function goToLastStep(user: UserEvent) {
  while (screen.queryByRole('button', { name: 'Next' })) {
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
}

describe('Screening', () => {
  it('shows only the first founder question, with progress 1 / 11', () => {
    setup({ role: 'founder' });
    expect(screen.getByRole('heading', { name: 'Tell us about your startup' })).toBeInTheDocument();
    expect(screen.getByText('1 / 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
    expect(screen.queryByLabelText(/website/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: "Choose your company's three main values" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Question progress' });
    expect(bar).toHaveAttribute('aria-valuemin', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '11');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
  });

  it('shows only the first investor question, with progress 1 / 9', () => {
    setup({ role: 'investor' });
    expect(screen.getByRole('heading', { name: 'Tell us about your investing' })).toBeInTheDocument();
    expect(screen.getByText('1 / 9')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fund or firm')).not.toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Question progress' });
    expect(bar).toHaveAttribute('aria-valuemax', '9');
  });

  it('blocks Next on an empty required question and shows an alert, staying on step 1', async () => {
    const { user } = setup({ role: 'founder' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please answer this question to continue.');
    expect(screen.getByText('1 / 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('advances to the next question once answered, and updates the progress bar', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" />);
    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 11')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: "Choose your company's three main values" })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Question progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
  });

  it('goes back to the previous question and keeps its value, clearing the error', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ companyName: 'Acme' }} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 11')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('1 / 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toHaveValue('Acme');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('shows the values step as 14 checkbox options', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ companyName: 'Acme' }} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const group = screen.getByRole('group', { name: "Choose your company's three main values" });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(14);
  });

  it('disables unselected options once 3 are picked, keeps selected ones enabled, and shows the count', async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        role="founder"
        initial={{ companyName: 'Acme', values: ['transparency', 'speed', 'integrity'] }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const craftsmanship = screen.getByLabelText('Craftsmanship');
    expect(craftsmanship).toBeDisabled();
    expect(craftsmanship.closest('label')).toHaveClass('option-disabled');
    const transparency = screen.getByLabelText('Transparency');
    expect(transparency).toBeEnabled();
    expect(transparency.closest('label')).not.toHaveClass('option-disabled');
    expect(screen.getByText('3 / 3 selected')).toBeInTheDocument();
  });

  it('reports a one-element array when picking the first value option', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <Screening
        role="founder"
        answers={{ companyName: 'Acme' }}
        onAnswer={onAnswer}
        onGenerated={vi.fn()}
        onManual={vi.fn()}
        generate={vi.fn(async () => result)}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByLabelText('Transparency'));
    expect(onAnswer).toHaveBeenLastCalledWith('values', ['transparency']);
  });

  it('toggles multi-choice options for the investor stages question', async () => {
    const user = userEvent.setup();
    render(<Controlled role="investor" initial={{ investorName: 'Sara', fundName: 'Birch', stages: ['seed'] }} />);
    await user.click(screen.getByRole('button', { name: 'Next' })); // -> fundName
    await user.click(screen.getByRole('button', { name: 'Next' })); // -> stages
    expect(screen.getByRole('group', { name: 'Which stages do you invest in?' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Series A'));
    expect(screen.getByLabelText('Series A')).toBeChecked();
    await user.click(screen.getByLabelText('Seed'));
    expect(screen.getByLabelText('Seed')).not.toBeChecked();
  });

  it('reaches the last step, calls generate(role, answers), shows loading, then onGenerated', async () => {
    let resolve!: (r: KeywordResult) => void;
    const generate = vi.fn(() => new Promise<KeywordResult>((r) => { resolve = r; }));
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<Screening role="founder" answers={founderAnswers} onAnswer={vi.fn()} onGenerated={onGenerated} onManual={vi.fn()} generate={generate} />);
    await goToLastStep(user);
    expect(screen.getByText('11 / 11')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate my profile' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(generate).toHaveBeenCalledWith('founder', founderAnswers);
    expect(screen.getByRole('button', { name: 'Analysing your answers…' })).toBeDisabled();
    resolve(result);
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
  });

  it('runs a backstop missingRequired check on generate and jumps to the first missing question', async () => {
    const generate = vi.fn(async () => result);
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    const { stage: _stage, ...withoutStage } = founderAnswers;
    const { rerender } = render(
      <Screening role="founder" answers={founderAnswers} onAnswer={vi.fn()} onGenerated={onGenerated} onManual={vi.fn()} generate={generate} />,
    );
    await goToLastStep(user);
    // Simulate an earlier answer becoming invalid without stepping back through it.
    rerender(
      <Screening role="founder" answers={withoutStage} onAnswer={vi.fn()} onGenerated={onGenerated} onManual={vi.fn()} generate={generate} />,
    );
    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(screen.getByText('3 / 11')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Please answer this question to continue.');
    expect(generate).not.toHaveBeenCalled();
  });

  it('offers retry and manual keywords when the API fails', async () => {
    const generate = vi.fn().mockRejectedValueOnce(new Error('Keyword generation failed. Please retry.')).mockResolvedValueOnce(result);
    const onGenerated = vi.fn();
    const onManual = vi.fn();
    const user = userEvent.setup();
    render(<Screening role="founder" answers={founderAnswers} onAnswer={vi.fn()} onGenerated={onGenerated} onManual={onManual} generate={generate} />);
    await goToLastStep(user);
    await user.click(screen.getByRole('button', { name: 'Generate my profile' }));
    expect(await screen.findByText('Keyword generation failed. Please retry.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add keywords manually' }));
    expect(onManual).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('submits the current step via Enter (form submit) like the primary button', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ companyName: 'Acme' }} />);
    screen.getByLabelText('Company name').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('2 / 11')).toBeInTheDocument();
  });
});
