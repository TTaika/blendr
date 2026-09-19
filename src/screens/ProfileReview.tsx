import { useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_ORDER, TAXONOMY, getKeyword } from '../../shared/taxonomy';
import type { AnswerValue, Profile, ProfileKeyword } from '../../shared/types';
import { KeywordList } from '../components/KeywordList';

export interface ProfileReviewProps {
  profile: Profile;
  onAdd: (keyword: ProfileKeyword) => void;
  onRemove: (id: string) => void;
  onEditAnswers: () => void;
  onSubmit: () => void;
}

const text = (value: AnswerValue | undefined) => (typeof value === 'string' ? value : '');

export function ProfileReview({ profile, onAdd, onRemove, onEditAnswers, onSubmit }: ProfileReviewProps) {
  const [toAdd, setToAdd] = useState('');
  const chosen = new Set(profile.keywords.map((k) => k.id));
  const { answers } = profile;
  const title =
    profile.role === 'founder'
      ? text(answers.companyName)
      : [text(answers.investorName), text(answers.fundName)].filter(Boolean).join(' · ');

  return (
    <main className="screen">
      <header>
        <p className="muted">Review your profile</p>
        <h1>{title}</h1>
        {profile.summary && <p className="muted">{profile.summary}</p>}
      </header>
      <p>
        These keywords decide who you are matched with. Tap a keyword to see why it was chosen, remove the wrong ones
        and add anything missing.
      </p>

      {profile.keywords.length === 0 && <p className="panel muted">No keywords yet. Add at least one below.</p>}
      {CATEGORY_ORDER.map((category) => {
        const inCategory = profile.keywords.filter((k) => getKeyword(k.id)?.category === category);
        if (inCategory.length === 0) return null;
        return (
          <section key={category} aria-label={CATEGORY_LABELS[category]}>
            <h3>{CATEGORY_LABELS[category]}</h3>
            <KeywordList keywords={inCategory} onRemove={onRemove} />
          </section>
        );
      })}

      <div className="panel add-keyword">
        <label htmlFor="add-keyword">Add a keyword</label>
        <div className="row">
          <select id="add-keyword" value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
            <option value="">Choose…</option>
            {CATEGORY_ORDER.map((category) => (
              <optgroup key={category} label={CATEGORY_LABELS[category]}>
                {TAXONOMY.filter((t) => t.category === category && !chosen.has(t.id)).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-small"
            disabled={!toAdd}
            onClick={() => {
              onAdd({ id: toAdd, reason: 'Added by you.', source: 'user' });
              setToAdd('');
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={onEditAnswers}>
          Edit answers
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn-primary" disabled={profile.keywords.length === 0} onClick={onSubmit}>
          Submit profile
        </button>
      </div>
    </main>
  );
}
