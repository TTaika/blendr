import { Fragment } from 'react';
import { formatRange } from '../../shared/questions';
import { stageLabel } from '../../shared/taxonomy';
import type { Company } from '../../shared/types';
import { topKeywords } from '../lib/matching';
import { KeywordList } from './KeywordList';

export interface CompanyCardProps {
  company: Company;
  score?: number;
  matched?: string[];
  showContact?: boolean;
  allKeywords?: boolean;
}

function Detail({ title, text }: { title: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function CompanyCard({ company, score, matched = [], showContact = false, allKeywords = false }: CompanyCardProps) {
  const keywords = topKeywords(company, matched, allKeywords ? company.keywords.length : 4);
  const { contact } = company;

  return (
    <article className="card" aria-label={company.name}>
      <header className="card-head">
        <div className="row">
          <h2>{company.name}</h2>
          <span className="spacer" />
          {score !== undefined && <span className="match">{score}% match</span>}
        </div>
        <p className="card-values">
          {company.values.map((value, i) => (
            <Fragment key={value}>
              {i > 0 && (
                <span className="slash" aria-hidden="true">
                  {' / '}
                </span>
              )}
              <span>{value}</span>
            </Fragment>
          ))}
        </p>
        <p className="card-meta muted">
          {stageLabel(company.stage)} · raising {formatRange(company.raise)}
        </p>
        <KeywordList keywords={keywords} matchedIds={matched} />
      </header>

      <section className="card-details">
        <Detail title="Problem" text={company.problem} />
        <Detail title="Solution" text={company.solution} />
        <Detail title="Team" text={company.team} />
        {company.keyNumbers.length > 0 && (
          <div>
            <h3>Key numbers</h3>
            <dl className="numbers">
              {company.keyNumbers.map((n) => (
                <div key={n.label}>
                  <dt>{n.label}</dt>
                  <dd>{n.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <Detail title="Why invest" text={company.whyInvest} />
        {company.videoUrl && (
          <div>
            <h3>Pitch video</h3>
            <video className="card-video" src={company.videoUrl} controls playsInline preload="metadata" />
          </div>
        )}
        {showContact && (
          <div className="contact">
            <h3>Contact</h3>
            <p>
              {contact.name} · {contact.title}
            </p>
            <p>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>
            {contact.phone && (
              <p>
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
              </p>
            )}
            {contact.linkedin && (
              <p>
                <a href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              </p>
            )}
            {company.website && (
              <p>
                <a href={company.website} target="_blank" rel="noreferrer">
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </p>
            )}
          </div>
        )}
      </section>
    </article>
  );
}
