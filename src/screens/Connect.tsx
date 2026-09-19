import { useState } from 'react';
import { stageLabel } from '../../shared/taxonomy';
import type { Company } from '../../shared/types';
import { CompanyCard } from '../components/CompanyCard';

export interface ConnectProps {
  companies: Company[];
  onBackToSwiping: () => void;
  onBookMeeting: () => void;
}

export function Connect({ companies, onBackToSwiping, onBookMeeting }: ConnectProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = companies.find((c) => c.id === selectedId);
  const backButton = (
    <button type="button" className="btn btn-small" onClick={onBackToSwiping}>
      Back to swiping
    </button>
  );

  if (selected) {
    return (
      <main className="screen">
        <div className="row">
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setSelectedId(null)}>
            ← All likes
          </button>
          <span className="spacer" />
          {backButton}
        </div>
        <CompanyCard company={selected} showContact allKeywords autoplayVideo />
      </main>
    );
  }

  return (
    <main className={companies.length > 0 ? 'screen connect-has-bar' : 'screen'}>
      <header className="row">
        <div>
          <h1>Connect</h1>
          <p className="muted">
            {companies.length} liked {companies.length === 1 ? 'company' : 'companies'}
          </p>
        </div>
        <span className="spacer" />
        {backButton}
      </header>
      {companies.length === 0 ? (
        <p className="panel muted">No likes yet. Swipe right on the companies you want to meet.</p>
      ) : (
        <>
          <ul className="liked-list">
            {companies.map((c) => (
              <li key={c.id}>
                <button type="button" className="liked-item" onClick={() => setSelectedId(c.id)}>
                  <span className="liked-name">{c.name}</span>
                  <span className="liked-meta muted">
                    {stageLabel(c.stage)} / {c.values.join(' / ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="step-actions connect-actions">
            <button type="button" className="btn btn-primary" onClick={onBookMeeting}>
              Book a meeting
            </button>
          </div>
        </>
      )}
    </main>
  );
}
