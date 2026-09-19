import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Company, FeedEntry } from '../../shared/types';
import { CompanyCard } from '../components/CompanyCard';

export const SWIPE_THRESHOLD = 100;

type Decision = 'like' | 'discard';

export function swipeDecision(dx: number, threshold = SWIPE_THRESHOLD): Decision | null {
  if (dx >= threshold) return 'like';
  if (dx <= -threshold) return 'discard';
  return null;
}

export interface SwipeProps {
  entries: FeedEntry[];
  companies: Map<string, Company>;
  subtitle: string;
  likedCount: number;
  showConnectPrompt: boolean;
  onLike: (companyId: string) => void;
  onDiscard: (companyId: string) => void;
  onOpenConnect: () => void;
  onDismissPrompt: () => void;
  onReviewPassed: () => void;
  exitMs?: number;
}

export function Swipe({
  entries,
  companies,
  subtitle,
  likedCount,
  showConnectPrompt,
  onLike,
  onDiscard,
  onOpenConnect,
  onDismissPrompt,
  onReviewPassed,
  exitMs = 220,
}: SwipeProps) {
  const top = entries[0];
  const company = top ? companies.get(top.companyId) : undefined;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<Decision | null>(null);
  const drag = useRef<{ startX: number; pointerId: number } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function decide(decision: Decision) {
    if (!top || exiting) return;
    setExiting(decision);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setExiting(null);
      setDx(0);
      if (decision === 'like') onLike(top.companyId);
      else onDiscard(top.companyId);
    }, exitMs);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // Let keyword chips, links and the video handle their own taps.
    if ((e.target as HTMLElement).closest('button, a, video')) return;
    drag.current = { startX: e.clientX, pointerId: e.pointerId };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === e.pointerId) setDx(e.clientX - drag.current.startX);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const decision = swipeDecision(dx);
    if (decision) decide(decision);
    else setDx(0);
  }

  function onPointerCancel() {
    // Fired when the browser takes over for vertical scrolling (touch-action: pan-y).
    drag.current = null;
    setDragging(false);
    setDx(0);
  }

  const offset = exiting === 'like' ? window.innerWidth : exiting === 'discard' ? -window.innerWidth : dx;
  const stampOpacity = (sign: 1 | -1) => Math.min(Math.max((sign * offset) / SWIPE_THRESHOLD, 0), 1);

  return (
    <main className="screen swipe">
      <header className="row">
        <div>
          <h1>Discover</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <span className="spacer" />
        <button type="button" className="btn btn-small" onClick={onOpenConnect}>
          Connect ({likedCount})
        </button>
      </header>

      {top && company ? (
        <>
          <div className="deck">
            <div
              key={top.companyId}
              className="swipe-card"
              style={{
                transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
                transition: dragging ? 'none' : `transform ${exitMs}ms ease`,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              <CompanyCard company={company} score={top.score} matched={top.matched} />
            </div>
            <span className="stamp stamp-like" aria-hidden="true" style={{ opacity: stampOpacity(1) }}>
              MATCH
            </span>
            <span className="stamp stamp-pass" aria-hidden="true" style={{ opacity: stampOpacity(-1) }}>
              PASS
            </span>
          </div>
          <div className="swipe-actions">
            <button type="button" className="btn round pass" aria-label="Pass" onClick={() => decide('discard')}>
              ✕
            </button>
            <button type="button" className="btn round like" aria-label="Like" onClick={() => decide('like')}>
              ♥
            </button>
          </div>
        </>
      ) : (
        <div className="panel empty">
          <h2>You've seen every company</h2>
          <p className="muted">Review your likes on Connect, or look at the companies you passed on again.</p>
          <button type="button" className="btn btn-primary" onClick={onOpenConnect}>
            Go to Connect
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReviewPassed}>
            See passed companies again
          </button>
        </div>
      )}

      {showConnectPrompt && (
        <div className="overlay">
          <div
            className="panel dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-prompt-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onDismissPrompt();
            }}
          >
            <h2 id="connect-prompt-title">Nice, {likedCount} likes!</h2>
            <p className="muted">Want to review them on the Connect page?</p>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={onDismissPrompt}>
                Keep swiping
              </button>
              <span className="spacer" />
              <button type="button" className="btn btn-primary" autoFocus onClick={onOpenConnect}>
                Go to Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
