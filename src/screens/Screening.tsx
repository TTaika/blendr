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
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [missing, setMissing] = useState<Question[]>([]);
  const missingIds = new Set(missing.map((q) => q.id));

  async function submit() {
    const stillMissing = missingRequired(role, answers);
    setMissing(stillMissing);
    if (stillMissing.length > 0) {
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

  return (
    <main className="screen">
      <header>
        <p className="muted">{role === 'founder' ? 'Founder profile' : 'Investor profile'}</p>
        <h1>Tell us about {role === 'founder' ? 'your startup' : 'your investing'}</h1>
      </header>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {questionsFor(role).map((q) => (
          <Field key={q.id} question={q} value={answers[q.id]} invalid={missingIds.has(q.id)} onChange={(v) => onAnswer(q.id, v)} />
        ))}
        {missing.length > 0 && (
          <p className="error" role="alert">
            Please answer: {missing.map((q) => q.label).join(', ')}
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
          <button type="submit" className="btn btn-primary" disabled={status.kind === 'loading'}>
            {status.kind === 'loading' ? 'Analysing your answers…' : 'Generate my profile'}
          </button>
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
