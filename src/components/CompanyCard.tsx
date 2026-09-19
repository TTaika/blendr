import { Fragment, useEffect, useRef, useState } from 'react';
import { formatAmountInline, formatRangeInline } from '../../shared/questions';
import { getKeyword, stageLabel } from '../../shared/taxonomy';
import type { Company } from '../../shared/types';
import { FIT_LABELS, sharedPersonality, topKeywords, type PersonalityFit } from '../lib/matching';
import { KeywordList } from './KeywordList';

export interface CompanyCardProps {
  company: Company;
  matched?: string[];
  fit?: PersonalityFit;
  showContact?: boolean;
  allKeywords?: boolean;
  /** The card the viewer is looking at: its pitch video plays by itself once half of it is on screen. */
  autoplayVideo?: boolean;
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

const labelOf = (id: string) => getKeyword(id)?.label ?? id;

// Until a company's video file exists, the request fails (a 404, or index.html from the SPA
// fallback): show a quiet placeholder instead of a broken player.
function PitchVideo({ src, autoplay }: { src: string; autoplay: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="video-placeholder">Pitch video coming soon</p>;
  return <AutoplayVideo src={src} active={autoplay} onError={() => setFailed(true)} />;
}

// On the active card, the video plays once at least half of it is on screen and pauses when it
// scrolls away. It only resumes a video it paused itself: one the viewer paused, or one that ended,
// waits for the native controls. Browsers that block autoplay with sound (iPhone Safari without a
// tap on the video) get a muted start instead; the controls unmute it.
function AutoplayVideo({ src, active, onError }: { src: string; active: boolean; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(active);
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;
    let visible = false;
    let resume = true; // play when next shown: at first, and after we paused it
    const sync = () => {
      if (visible && activeRef.current) {
        if (!resume || !video.paused) return;
        resume = false;
        video.play().catch((err: unknown) => {
          if ((err as Error)?.name !== 'NotAllowedError' || !visible || !activeRef.current) return;
          video.muted = true;
          video.play().catch(() => {});
        });
      } else if (!video.paused) {
        video.pause();
        resume = true;
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].intersectionRatio >= 0.5;
        sync();
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    syncRef.current = sync;
    return () => {
      observer.disconnect();
      syncRef.current = null;
    };
  }, []);

  // A card that becomes active (the under card coming to the top) plays if its video is already on screen.
  useEffect(() => {
    activeRef.current = active;
    syncRef.current?.();
  }, [active]);

  return <video ref={videoRef} className="card-video" src={src} controls playsInline preload="metadata" onError={onError} />;
}

export function CompanyCard({
  company,
  matched = [],
  fit,
  showContact = false,
  allKeywords = false,
  autoplayVideo = false,
}: CompanyCardProps) {
  const { contact } = company;
  const personalityKeywords = company.keywords.filter((k) => getKeyword(k.id)?.category === 'personality');
  const nonPersonalityKeywords = company.keywords.filter((k) => getKeyword(k.id)?.category !== 'personality');
  const focusKeywords = topKeywords(
    { ...company, keywords: nonPersonalityKeywords },
    matched,
    allKeywords ? nonPersonalityKeywords.length : 4,
  );
  const sharedTraits = sharedPersonality(company, matched);

  return (
    <article className="card" aria-label={company.name}>
      <header className="card-head">
        <h2>{company.name}</h2>
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
        {fit && (
          <div className={`fit fit-${fit}`}>
            <p className="fit-label">{FIT_LABELS[fit]}</p>
            {sharedTraits.length > 0 && (
              <p className="fit-shared">You both: {sharedTraits.map(labelOf).join(' · ')}</p>
            )}
          </div>
        )}
        {personalityKeywords.length > 0 && (
          <div className="card-personality">
            <h3>Team personality</h3>
            <KeywordList keywords={personalityKeywords} matchedIds={matched} />
          </div>
        )}
        <p className="card-meta muted">
          {stageLabel(company.stage)}
          {company.raised !== undefined && ` · raised ${formatAmountInline(company.raised)}`} · raising {formatRangeInline(company.raise)}
        </p>
        <div className="card-focus">
          <h3>Focus</h3>
          <KeywordList keywords={focusKeywords} matchedIds={matched} />
        </div>
      </header>

      <section className="card-details">
        <Detail title={company.solution.trim() ? 'Problem' : 'Problem & solution'} text={company.problem} />
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
            <PitchVideo key={company.videoUrl} src={company.videoUrl} autoplay={autoplayVideo} />
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
