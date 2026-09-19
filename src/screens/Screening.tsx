import { useEffect, useRef, useState } from 'react';
import { PAGE_TITLES, missingRequired, parseRange, questionSteps, type Question } from '../../shared/questions';
import type { AnswerValue, Answers, KeywordResult, Role } from '../../shared/types';
import { requestKeywords, type RequestKeywords } from '../lib/api';
import { checkPitchVideo, readVideoDuration as readDurationInBrowser, type ReadVideoDuration } from '../lib/pitchVideo';
import { clearPitchVideo, loadPitchVideo, savePitchVideo } from '../lib/videoStore';

export interface ScreeningProps {
  role: Role;
  answers: Answers;
  onAnswer: (id: string, value: AnswerValue) => void;
  onGenerated: (result: KeywordResult) => void;
  onManual: () => void;
  generate?: RequestKeywords;
  /** Reads a picked video's length. jsdom can't load media, so tests pass a fake. */
  readVideoDuration?: ReadVideoDuration;
}

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string };

/** The alert shown when `missing` (a subset of `stepQuestions`) fails Next/generate validation. */
function alertFor(stepQuestions: Question[], missing: Question[], answers: Answers): string {
  if (missing.length === 1 && missing[0].kind === 'email') {
    const raw = answers[missing[0].id];
    if (typeof raw === 'string' && raw.trim() !== '') {
      return 'Enter a valid email address.';
    }
  }
  return stepQuestions.length === 1 ? 'Please answer this question to continue.' : 'Please fill in the required fields.';
}

export function Screening({
  role,
  answers,
  onAnswer,
  onGenerated,
  onManual,
  generate = requestKeywords,
  readVideoDuration = readDurationInBrowser,
}: ScreeningProps) {
  const steps = questionSteps(role);
  const total = steps.length;
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const stepQuestions = steps[step];
  const isLast = step === total - 1;
  const stepPage = stepQuestions.length > 1 ? stepQuestions[0].page : undefined;

  function missingInStep(qs: Question[]) {
    const missing = missingRequired(role, answers);
    return qs.filter((q) => missing.some((m) => m.id === q.id));
  }

  async function runGenerate() {
    const stillMissing = missingRequired(role, answers);
    if (stillMissing.length > 0) {
      const targetIndex = steps.findIndex((qs) => qs.some((q) => q.id === stillMissing[0].id));
      const target = targetIndex < 0 ? 0 : targetIndex;
      const missingHere = stillMissing.filter((m) => steps[target].some((q) => q.id === m.id));
      setStep(target);
      setInvalidIds(new Set(missingHere.map((q) => q.id)));
      setAlertMessage(alertFor(steps[target], missingHere, answers));
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
    const missingHere = missingInStep(stepQuestions);
    if (missingHere.length > 0) {
      setInvalidIds(new Set(missingHere.map((q) => q.id)));
      setAlertMessage(alertFor(stepQuestions, missingHere, answers));
      return;
    }
    setInvalidIds(new Set());
    setAlertMessage(null);
    if (isLast) {
      void runGenerate();
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    setInvalidIds(new Set());
    setAlertMessage(null);
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
        {steps.map((qs, i) => (
          <span key={qs[0].id} className={i <= step ? 'progress-seg on' : 'progress-seg'} />
        ))}
      </div>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        {stepPage && (
          <>
            <h2 className="step-title">{PAGE_TITLES[stepPage]}</h2>
            {stepPage === 'metrics' && <p className="help">Fill in what applies. Leave the rest empty.</p>}
          </>
        )}
        {stepQuestions.map((q) =>
          q.kind === 'video' ? (
            <VideoField key={q.id} question={q} value={answers[q.id]} readDuration={readVideoDuration} onChange={(v) => onAnswer(q.id, v)} />
          ) : (
            <Field key={q.id} question={q} value={answers[q.id]} invalid={invalidIds.has(q.id)} onChange={(v) => onAnswer(q.id, v)} />
          ),
        )}
        {alertMessage && (
          <p className="error" role="alert">
            {alertMessage}
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
          <div className="step-actions">
            {step > 0 && (
              <button type="button" className="btn" onClick={goBack}>
                Back
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-next" disabled={status.kind === 'loading'}>
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

// Autocomplete hints for text-like fields whose kind alone doesn't imply one.
const AUTOCOMPLETE_BY_ID: Record<string, string> = {
  companyName: 'organization',
  website: 'url',
  contactName: 'name',
};

function Field({ question: q, value, invalid, onChange }: FieldProps) {
  const id = `q-${q.id}`;
  const label = q.required ? q.label : `${q.label} (optional)`;

  if (q.kind === 'range') {
    return <RangeField question={q} value={value} invalid={invalid} onChange={onChange} />;
  }

  if (q.kind === 'scale' && q.scale) {
    const { min, max, minLabel, maxLabel } = q.scale;
    const selected = typeof value === 'string' ? value : undefined;
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <fieldset className="field" aria-invalid={invalid || undefined}>
        <legend>{label}</legend>
        {q.help && <p className="help">{q.help}</p>}
        <div className="scale">
          {numbers.map((n) => {
            const numStr = String(n);
            const on = selected === numStr;
            return (
              <label key={n} className={on ? 'scale-option on' : 'scale-option'}>
                <input
                  type="radio"
                  className="sr-only"
                  name={id}
                  value={numStr}
                  checked={on}
                  aria-invalid={invalid || undefined}
                  onChange={() => onChange(numStr)}
                />
                {n}
              </label>
            );
          })}
        </div>
        <div className="scale-labels">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </fieldset>
    );
  }

  if (q.kind === 'single' || q.kind === 'multi') {
    const selected = Array.isArray(value) ? value : value ? [value] : [];
    const max = q.kind === 'multi' ? q.maxSelections : undefined;
    const atMax = max !== undefined && selected.length >= max;
    return (
      <fieldset className="field" aria-invalid={invalid || undefined}>
        <legend>{label}</legend>
        {q.help && <p className="help">{q.help}</p>}
        <div className="options">
          {(q.options ?? []).map((o) => {
            const checked = selected.includes(o.id);
            const disabled = q.kind === 'multi' && atMax && !checked;
            const next: AnswerValue =
              q.kind === 'single' ? o.id : checked ? selected.filter((s) => s !== o.id) : [...selected, o.id];
            return (
              <label key={o.id} className={[checked ? 'option option-on' : 'option', disabled ? 'option-disabled' : ''].filter(Boolean).join(' ')}>
                <input
                  type={q.kind === 'single' ? 'radio' : 'checkbox'}
                  name={id}
                  value={o.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(next)}
                />
                {o.label}
              </label>
            );
          })}
        </div>
        {max !== undefined && (
          <p className="help">
            {selected.length} / {max} selected
          </p>
        )}
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
          type={q.kind === 'url' ? 'url' : q.kind === 'email' ? 'email' : 'text'}
          inputMode={q.kind === 'url' ? 'url' : q.kind === 'email' ? 'email' : undefined}
          autoComplete={q.kind === 'email' ? 'email' : AUTOCOMPLETE_BY_ID[q.id]}
          maxLength={q.maxLength}
          placeholder={q.placeholder}
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

function RangeField({ question: q, value, invalid, onChange }: FieldProps) {
  const label = q.required ? q.label : `${q.label} (optional)`;
  const [minLabel, maxLabel] = q.rangeLabels ?? ['Minimum', 'Maximum'];
  const stops = q.stops ?? [];
  const lastIdx = stops.length - 1;
  const range = parseRange(value);
  const minIdx = range ? stops.findIndex((s) => s.value === range[0]) : 0;
  const maxIdx = range ? stops.findIndex((s) => s.value === range[1]) : lastIdx;

  // An untouched (or invalid/legacy) slider still counts as answered: default to the full range.
  useEffect(() => {
    if (!range) {
      onChange([String(stops[0].value), String(stops[lastIdx].value)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function report(nextMinIdx: number, nextMaxIdx: number) {
    onChange([String(stops[nextMinIdx].value), String(stops[nextMaxIdx].value)]);
  }

  const minPct = lastIdx === 0 ? 0 : (minIdx / lastIdx) * 100;
  const maxPct = lastIdx === 0 ? 100 : (maxIdx / lastIdx) * 100;

  return (
    <fieldset className="field" aria-invalid={invalid || undefined}>
      <legend>{label}</legend>
      {q.help && <p className="help">{q.help}</p>}
      <p className="range-value">
        {stops[minIdx]?.label} – {stops[maxIdx]?.label}
      </p>
      <div className="range">
        <div className="range-track" />
        <div className="range-fill" style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }} />
        <input
          type="range"
          min={0}
          max={lastIdx}
          step={1}
          value={minIdx}
          aria-label={minLabel}
          aria-valuetext={stops[minIdx]?.label}
          aria-invalid={invalid || undefined}
          onChange={(e) => report(Math.min(Number(e.target.value), maxIdx), maxIdx)}
        />
        <input
          type="range"
          min={0}
          max={lastIdx}
          step={1}
          value={maxIdx}
          aria-label={maxLabel}
          aria-valuetext={stops[maxIdx]?.label}
          aria-invalid={invalid || undefined}
          onChange={(e) => report(minIdx, Math.max(Number(e.target.value), minIdx))}
        />
      </div>
    </fieldset>
  );
}

interface VideoFieldProps {
  question: Question;
  value: AnswerValue | undefined;
  readDuration: ReadVideoDuration;
  onChange: (value: AnswerValue) => void;
}

// The answer is a short descriptor ("pitch.mov · 0:48"); the video itself is kept on the phone by
// videoStore. An empty answer means no video, whatever the store still holds.
function VideoField({ question: q, value, readDuration, onChange }: VideoFieldProps) {
  const descriptor = typeof value === 'string' ? value.trim() : '';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(descriptor !== '');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by every pick, Remove and unmount, so a slow check can't land after them.
  const pickSeq = useRef(0);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Back on this step: preview the kept video again.
  useEffect(() => {
    const seq = pickSeq.current;
    if (descriptor !== '') {
      void loadPitchVideo().then((blob) => {
        if (seq !== pickSeq.current) return;
        setRestoring(false);
        if (blob) setPreviewUrl(URL.createObjectURL(blob));
      });
    }
    return () => {
      pickSeq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(file: File) {
    const seq = ++pickSeq.current;
    setError(null);
    setChecking(true);
    const check = await checkPitchVideo(file, readDuration);
    if (seq !== pickSeq.current) return;
    setChecking(false);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    void savePitchVideo(file);
    setRestoring(false);
    setPreviewUrl(URL.createObjectURL(file));
    onChange(check.descriptor);
  }

  function remove() {
    pickSeq.current++;
    setChecking(false);
    setError(null);
    setRestoring(false);
    setPreviewUrl(null);
    void clearPitchVideo();
    onChange('');
  }

  const hasVideo = descriptor !== '';
  const lost = hasVideo && !previewUrl && !restoring;
  return (
    <fieldset className="field">
      <legend>{q.label}</legend>
      {q.help && <p className="help">{q.help}</p>}
      {hasVideo && previewUrl && <video className="card-video" src={previewUrl} controls playsInline preload="metadata" />}
      {hasVideo && <p className="video-name">{descriptor}</p>}
      {lost && <p className="help">This phone no longer has that video. Choose it again, or remove it.</p>}
      <div className="row">
        {(!hasVideo || lost) && (
          <label className="btn btn-file">
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ''; // lets the same file be picked again after an error
                if (file) void pick(file);
              }}
            />
            Record or choose a video
          </label>
        )}
        {hasVideo && (
          <button type="button" className="btn btn-ghost" onClick={remove}>
            Remove
          </button>
        )}
      </div>
      {checking && (
        <p className="help" role="status">
          Checking the video…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
