import { useState } from 'react';
import { missingRequired, questionsFor, type Question } from '../../shared/questions';
import type { AnswerValue, Answers, KeywordResult, Role } from '../../shared/types';
import { requestKeywords, type RequestKeywords } from '../lib/api';

export interface ScreeningProps {
  role: Role;
  answers: Answers;
  onAnswer: (id: string, value: AnswerValue) => void;
  onGenerated: (result: KeywordResult) => void;
  onManual: () => void;
  generate?: RequestKeywords;
}

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string };

export function Screening({ role, answers, onAnswer, onGenerated, onManual, generate = requestKeywords }: ScreeningProps) {
  const questions = questionsFor(role);
  const total = questions.length;
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [invalidStep, setInvalidStep] = useState(false);

  const question = questions[step];
  const isLast = step === total - 1;
  const pct = ((step + 1) / total) * 100;

  function isCurrentMissing(q: Question) {
    return missingRequired(role, answers).some((m) => m.id === q.id);
  }

  async function runGenerate() {
    const stillMissing = missingRequired(role, answers);
    if (stillMissing.length > 0) {
      const firstIndex = questions.findIndex((q) => q.id === stillMissing[0].id);
      setStep(firstIndex < 0 ? 0 : firstIndex);
      setInvalidStep(true);
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'loading' });
    try {
      const result = await generate(role, answers);
      setStatus({ kind: 'idle' });
      onGenerated(result);
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  }

  function goNext() {
    if (isCurrentMissing(question)) {
      setInvalidStep(true);
      return;
    }
    setInvalidStep(false);
    if (isLast) {
      void runGenerate();
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    setInvalidStep(false);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="screen">
      <header>
        <p className="muted">{role === 'founder' ? 'Founder profile' : 'Investor profile'}</p>
        <h1>Tell us about {role === 'founder' ? 'your startup' : 'your investing'}</h1>
      </header>
      <p className="muted">
        {step + 1} / {total}
      </p>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label="Question progress"
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        <Field key={question.id} question={question} value={answers[question.id]} invalid={invalidStep} onChange={(v) => onAnswer(question.id, v)} />
        {invalidStep && (
          <p className="error" role="alert">
            Please answer this question to continue.
          </p>
        )}
        {status.kind === 'error' ? (
          <div className="panel" role="alert">
            <p className="error">{status.message}</p>
            <div className="row">
              <button type="submit" className="btn btn-primary">Retry</button>
              <button type="button" className="btn btn-ghost" onClick={onManual}>Add keywords manually</button>
            </div>
          </div>
        ) : (
          <div className="row">
            {step > 0 && (
              <button type="button" className="btn" onClick={goBack}>
                Back
              </button>
            )}
            <span className="spacer" />
            <button type="submit" className="btn btn-primary" disabled={status.kind === 'loading'}>
              {isLast ? (status.kind === 'loading' ? 'Analysing your answers…' : 'Generate my profile') : 'Next'}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}

interface FieldProps {
  question: Question;
  value: AnswerValue | undefined;
  invalid: boolean;
  onChange: (value: AnswerValue) => void;
}

function Field({ question: q, value, invalid, onChange }: FieldProps) {
  const id = `q-${q.id}`;
  const label = q.required ? q.label : `${q.label} (optional)`;

  if (q.kind === 'values') {
    const existing = Array.isArray(value) ? value : [];
    const vals = [0, 1, 2].map((i) => existing[i] ?? '');
    return (
      <fieldset className="field" aria-invalid={invalid || undefined}>
        <legend>{label}</legend>
        {q.help && <p className="help">{q.help}</p>}
        {vals.map((v, i) => (
          <label key={i} className="value-input">
            {`Value ${i + 1}`}
            <input
              type="text"
              maxLength={q.maxLength}
              value={v}
              aria-invalid={invalid || undefined}
              onChange={(e) => {
                const next = [...vals];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          </label>
        ))}
      </fieldset>
    );
  }

  if (q.kind === 'single' || q.kind === 'multi') {
    const selected = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <fieldset className="field" aria-invalid={invalid || undefined}>
        <legend>{label}</legend>
        {q.help && <p className="help">{q.help}</p>}
        <div className="options">
          {(q.options ?? []).map((o) => {
            const checked = selected.includes(o.id);
            const next: AnswerValue =
              q.kind === 'single' ? o.id : checked ? selected.filter((s) => s !== o.id) : [...selected, o.id];
            return (
              <label key={o.id} className={checked ? 'option option-on' : 'option'}>
                <input type={q.kind === 'single' ? 'radio' : 'checkbox'} name={id} value={o.id} checked={checked} onChange={() => onChange(next)} />
                {o.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  const text = typeof value === 'string' ? value : '';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {q.help && <p className="help">{q.help}</p>}
      {q.kind === 'longtext' ? (
        <textarea id={id} rows={3} maxLength={q.maxLength} value={text} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          type={q.kind === 'url' ? 'url' : 'text'}
          inputMode={q.kind === 'url' ? 'url' : undefined}
          maxLength={q.maxLength}
          value={text}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {q.maxLength && q.kind !== 'url' && (
        <p className="counter muted">
          {text.length}/{q.maxLength}
        </p>
      )}
    </div>
  );
}
