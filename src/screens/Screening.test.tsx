// @vitest-environment jsdom
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Answers, KeywordResult, Role } from '../../shared/types';
import { Screening, type ScreeningProps } from './Screening';

const founderAnswers: Answers = {
  companyName: 'Acme',
  contactName: 'Ada Lovelace',
  contactEmail: 'ada@acme.example',
  values: ['Payments trust', 'Baker-first support', 'Simple pricing'],
  stage: 'seed',
  raise: ['2000', '5000'],
  problemSolution: 'P and S',
  traction: 'T',
  team: 'Team',
  involvement: ['hands-on'],
  whyInvest: 'W',
  pressure: '7',
  transparency: '6',
  leadership: '5',
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
  it('shows all four basics fields on the first founder step, with progress 1 / 12', () => {
    setup({ role: 'founder' });
    expect(screen.getByRole('heading', { name: 'Tell us about your startup' })).toBeInTheDocument();
    expect(screen.getByText('1 / 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
    expect(screen.getByLabelText('Company website (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Point of contact')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact email')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: "Choose your company's three main values" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Question progress' });
    expect(bar).toHaveAttribute('aria-valuemin', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '12');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
  });

  it('gives the contact email input type=email, inputMode=email and autoComplete=email', () => {
    setup({ role: 'founder' });
    expect(screen.getByLabelText('Contact email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Contact email')).toHaveAttribute('inputMode', 'email');
    expect(screen.getByLabelText('Contact email')).toHaveAttribute('autoComplete', 'email');
    expect(screen.getByLabelText('Company name')).toHaveAttribute('autoComplete', 'organization');
    expect(screen.getByLabelText('Company website (optional)')).toHaveAttribute('autoComplete', 'url');
    expect(screen.getByLabelText('Point of contact')).toHaveAttribute('autoComplete', 'name');
  });

  it('shows only the first investor question, with progress 1 / 11', () => {
    setup({ role: 'investor' });
    expect(screen.getByRole('heading', { name: 'Tell us about your investing' })).toBeInTheDocument();
    expect(screen.getByText('1 / 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fund or firm')).not.toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Question progress' });
    expect(bar).toHaveAttribute('aria-valuemax', '11');
  });

  it('blocks Next when every basics field is empty, showing "Please fill in the required fields." and staying on step 1', async () => {
    const { user } = setup({ role: 'founder' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please fill in the required fields.');
    expect(screen.getByText('1 / 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Point of contact')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Contact email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Company website (optional)')).not.toHaveAttribute('aria-invalid');
  });

  it('Next with an empty required name shows "Please fill in the required fields." and stays on the step', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ contactName: 'Ada Lovelace', contactEmail: 'ada@acme.example' }} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please fill in the required fields.');
    expect(screen.getByText('1 / 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Point of contact')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Contact email')).not.toHaveAttribute('aria-invalid');
  });

  it('shows "Enter a valid email address." when a malformed email is the only invalid basics field', async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        role="founder"
        initial={{ companyName: 'Acme', contactName: 'Ada Lovelace', contactEmail: 'not-an-email' }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(screen.getByText('1 / 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Company name')).not.toHaveAttribute('aria-invalid');
  });

  it('advances valid basics to the values step, and updates the progress bar', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" />);
    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.type(screen.getByLabelText('Point of contact'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Contact email'), 'ada@acme.example');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 12')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: "Choose your company's three main values" })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Question progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
  });

  it('goes back to the previous step and keeps its values, clearing the error', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ companyName: 'Acme', contactName: 'Ada Lovelace', contactEmail: 'ada@acme.example' }} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('1 / 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toHaveValue('Acme');
    expect(screen.getByLabelText('Contact email')).toHaveValue('ada@acme.example');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('shows the values step as 13 checkbox options', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ companyName: 'Acme', contactName: 'Ada Lovelace', contactEmail: 'ada@acme.example' }} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const group = screen.getByRole('group', { name: "Choose your company's three main values" });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(13);
    expect(within(group).queryByLabelText('Ownership')).not.toBeInTheDocument();
  });

  it('disables unselected options once 3 are picked, keeps selected ones enabled, and shows the count', async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        role="founder"
        initial={{ companyName: 'Acme', contactName: 'Ada Lovelace', contactEmail: 'ada@acme.example', values: ['transparency', 'speed', 'integrity'] }}
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
        answers={{ companyName: 'Acme', contactName: 'Ada Lovelace', contactEmail: 'ada@acme.example' }}
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

  it('reports an array with both when two founder involvement options are picked, and removes one clicked again', async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        role="founder"
        initial={{
          companyName: 'Acme',
          contactName: 'Ada Lovelace',
          contactEmail: 'ada@acme.example',
          values: ['transparency', 'speed', 'integrity'],
          stage: 'seed',
          raise: ['2000', '5000'],
          problemSolution: 'P and S',
          traction: 'T',
          team: 'Team',
        }}
      />,
    );
    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByRole('group', { name: 'What kind of investor involvement do you want?' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Hands-on: weekly sparring and operational help'));
    await user.click(screen.getByLabelText('Network: intros to customers, hires and investors'));
    expect(screen.getByLabelText('Hands-on: weekly sparring and operational help')).toBeChecked();
    expect(screen.getByLabelText('Network: intros to customers, hires and investors')).toBeChecked();
    await user.click(screen.getByLabelText('Hands-on: weekly sparring and operational help'));
    expect(screen.getByLabelText('Hands-on: weekly sparring and operational help')).not.toBeChecked();
    expect(screen.getByLabelText('Network: intros to customers, hires and investors')).toBeChecked();
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
    expect(screen.getByText('12 / 12')).toBeInTheDocument();
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
    expect(screen.getByText('3 / 12')).toBeInTheDocument();
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
    render(<Controlled role="founder" initial={{ companyName: 'Acme', contactName: 'Ada Lovelace', contactEmail: 'ada@acme.example' }} />);
    screen.getByLabelText('Company name').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('2 / 12')).toBeInTheDocument();
  });
});

describe('Screening: founder raise range slider', () => {
  it('shows two sliders labelled Minimum raise and Maximum raise', async () => {
    const user = userEvent.setup();
    render(
      <Screening
        role="founder"
        answers={{
          companyName: 'Acme',
          contactName: 'Ada Lovelace',
          contactEmail: 'ada@acme.example',
          values: ['transparency', 'speed', 'integrity'],
          stage: 'seed',
        }}
        onAnswer={vi.fn()}
        onGenerated={vi.fn()}
        onManual={vi.fn()}
        generate={vi.fn(async () => result)}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Next' })); // basics -> values
    await user.click(screen.getByRole('button', { name: 'Next' })); // values -> stage
    await user.click(screen.getByRole('button', { name: 'Next' })); // stage -> raise
    expect(screen.getByLabelText('Minimum raise')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum raise')).toBeInTheDocument();
  });
});

describe('Screening: investor ticket range slider', () => {
  const baseAnswers: Answers = { investorName: 'Sara', fundName: 'Birch', stages: ['seed'] };

  async function goToTickets(user: UserEvent) {
    await user.click(screen.getByRole('button', { name: 'Next' })); // investorName -> fundName
    await user.click(screen.getByRole('button', { name: 'Next' })); // fundName -> stages
    await user.click(screen.getByRole('button', { name: 'Next' })); // stages -> tickets
  }

  it('shows two labelled sliders and defaults to the full range when unanswered', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <Screening role="investor" answers={baseAnswers} onAnswer={onAnswer} onGenerated={vi.fn()} onManual={vi.fn()} generate={vi.fn(async () => result)} />,
    );
    await goToTickets(user);
    expect(screen.getByLabelText('Minimum ticket')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum ticket')).toBeInTheDocument();
    expect(onAnswer).toHaveBeenLastCalledWith('tickets', ['0', '100000']);
  });

  it('shows the formatted range and clamps the minimum handle to the maximum', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <Screening
        role="investor"
        answers={{ ...baseAnswers, tickets: ['500', '5000'] }}
        onAnswer={onAnswer}
        onGenerated={vi.fn()}
        onManual={vi.fn()}
        generate={vi.fn(async () => result)}
      />,
    );
    await goToTickets(user);
    expect(screen.getByText('€500k – €5M')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Minimum ticket'), { target: { value: '6' } });
    expect(onAnswer).toHaveBeenLastCalledWith('tickets', ['5000', '5000']);
  });

  it("can't push the maximum handle below the minimum", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <Screening
        role="investor"
        answers={{ ...baseAnswers, tickets: ['500', '5000'] }}
        onAnswer={onAnswer}
        onGenerated={vi.fn()}
        onManual={vi.fn()}
        generate={vi.fn(async () => result)}
      />,
    );
    await goToTickets(user);
    fireEvent.change(screen.getByLabelText('Maximum ticket'), { target: { value: '0' } });
    expect(onAnswer).toHaveBeenLastCalledWith('tickets', ['500', '500']);
  });
});

describe('Screening: founder scale questions (pressure/transparency/leadership)', () => {
  const answeredThroughWhyInvest: Answers = {
    companyName: 'Acme',
    contactName: 'Ada Lovelace',
    contactEmail: 'ada@acme.example',
    values: ['transparency', 'speed', 'integrity'],
    stage: 'seed',
    raise: ['2000', '5000'],
    problemSolution: 'P and S',
    traction: 'T',
    team: 'Team',
    involvement: ['hands-on'],
    whyInvest: 'W',
  };

  async function goToPressure(user: UserEvent) {
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
  }

  it('shows 10 numbered radio options with both end labels on the pressure step', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={answeredThroughWhyInvest} />);
    await goToPressure(user);
    expect(screen.getByText('10 / 12')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'How do you handle high-pressure moments?' });
    expect(within(group).getAllByRole('radio')).toHaveLength(10);
    expect(within(group).getByLabelText('7')).toBeInTheDocument();
    expect(within(group).getByText('I need calm to think clearly')).toBeInTheDocument();
    expect(within(group).getByText('I do my best work under fire')).toBeInTheDocument();
  });

  it('blocks Next until an option is tapped', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={answeredThroughWhyInvest} />);
    await goToPressure(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please answer this question to continue.');
    expect(screen.getByText('10 / 12')).toBeInTheDocument();
  });

  it('clicking "7" reports onAnswer(\'pressure\', \'7\')', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <Screening
        role="founder"
        answers={answeredThroughWhyInvest}
        onAnswer={onAnswer}
        onGenerated={vi.fn()}
        onManual={vi.fn()}
        generate={vi.fn(async () => result)}
      />,
    );
    await goToPressure(user);
    await user.click(screen.getByLabelText('7'));
    expect(onAnswer).toHaveBeenLastCalledWith('pressure', '7');
  });

  it('marks the preset option as selected', async () => {
    const user = userEvent.setup();
    render(<Controlled role="founder" initial={{ ...answeredThroughWhyInvest, pressure: '7' }} />);
    await goToPressure(user);
    expect(screen.getByLabelText('7').closest('label')).toHaveClass('scale-option on');
  });
});
