import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Company, FeedEntry } from '../../shared/types';
import { CompanyCard } from '../components/CompanyCard';
import { personalityFit } from '../lib/matching';

export const SWIPE_THRESHOLD = 100;

type Decision = 'like' | 'discard';

export function swipeDecision(dx: number, threshold = SWIPE_THRESHOLD): Decision | null {
  if (dx >= threshold) return 'like';
  if (dx <= -threshold) return 'discard';
  return null;
}

/** Largest tilt of the top card, in degrees, whatever the screen width. */
export const MAX_TILT = 14;

/** Card transform for a horizontal drag offset: follows the finger, tilt capped at MAX_TILT. */
export function cardTransform(dx: number): string {
  const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, dx / 12));
  return `translateX(${dx}px) rotate(${Math.round(tilt * 100) / 100}deg)`;
}

const EXIT_EASING = 'cubic-bezier(0.2, 0.7, 0.3, 1)';

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
  exitMs = 320,
}: SwipeProps) {
  const top = entries[0];
  const company = top ? companies.get(top.companyId) : undefined;
  const next = entries[1];
  const nextCompany = next ? companies.get(next.companyId) : undefined;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<Decision | null>(null);
  const [burst, setBurst] = useState<{ id: number; companyName: string } | null>(null);
  const drag = useRef<{ startX: number; pointerId: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<Animation | null>(null);
  const exitingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const burstId = useRef(0);

  useEffect(() => {
    return () => {
      // Unmounting cancels a pending decision instead of applying it later.
      animRef.current?.cancel();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  function decide(decision: Decision) {
    if (!top || exitingRef.current) return;
    exitingRef.current = true;
    setExiting(decision);
    if (decision === 'like' && company) {
      burstId.current += 1;
      setBurst({ id: burstId.current, companyName: company.name });
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
      burstTimerRef.current = window.setTimeout(() => {
        burstTimerRef.current = null;
        setBurst(null);
      }, 2000);
    }
    const finish = () => {
      animRef.current = null;
      timerRef.current = null;
      exitingRef.current = false;
      setExiting(null);
      setDx(0);
      if (decision === 'like') onLike(top.companyId);
      else onDiscard(top.companyId);
    };
    if (exitMs <= 0) {
      finish();
      return;
    }
    const el = cardRef.current;
    if (!el || typeof el.animate !== 'function') {
      timerRef.current = window.setTimeout(finish, exitMs);
      return;
    }
    // Throw the card about 1.2 card-widths from where the finger left it, fading out.
    // Distance and tilt depend on the card, not the window, so phone and laptop match.
    const sign = decision === 'like' ? 1 : -1;
    const distance = sign * (el.offsetWidth || 360) * 1.2;
    const anim = el.animate(
      [
        { transform: cardTransform(dx), opacity: 1 },
        { transform: `translateX(${distance}px) rotate(${sign * MAX_TILT}deg)`, opacity: 0 },
      ],
      { duration: exitMs, easing: EXIT_EASING, fill: 'forwards' },
    );
    animRef.current = anim;
    anim.finished.then(finish, () => {
      // Cancelled on unmount: drop the decision.
    });
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

  const dragRatio = exiting === 'like' ? 1 : exiting === 'discard' ? -1 : Math.max(-1, Math.min(1, dx / SWIPE_THRESHOLD));
  // Reveal progress of the next card: follows the drag, completes during the exit.
  const p = Math.abs(dragRatio);
  const stampOpacity = (sign: 1 | -1) => Math.max(sign * dragRatio, 0);
  const dragStyle = {
    '--drag': dragRatio,
    '--drag-right': Math.max(dragRatio, 0),
    '--drag-left': Math.max(-dragRatio, 0),
  } as CSSProperties;

  return (
    <main className="screen swipe" style={dragStyle}>
      <div className="swipe-bg" aria-hidden="true">
        <span className="aurora aurora-a" />
        <span className="aurora aurora-b" />
      </div>
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
            {next && nextCompany && (
              <div
                key={next.companyId}
                className="swipe-card under"
                aria-hidden="true"
                inert
                style={{
                  transform: `scale(${0.94 + 0.06 * p})`,
                  opacity: 0.55 + 0.45 * p,
                  transition: dragging ? 'none' : `transform ${exitMs}ms ${EXIT_EASING}, opacity ${exitMs}ms ${EXIT_EASING}`,
                }}
              >
                <div className="swipe-scroll">
                  <CompanyCard
                    company={nextCompany}
                    matched={next.matched}
                    fit={next.score !== undefined ? personalityFit(next.matched) : undefined}
                  />
                </div>
              </div>
            )}
            <div
              key={top.companyId}
              ref={cardRef}
              className="swipe-card"
              style={{
                transform: cardTransform(dx),
                transition: dragging || exiting ? 'none' : 'transform 200ms ease-out',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              <div className="swipe-scroll">
                <CompanyCard
                  company={company}
                  matched={top.matched}
                  fit={top.score !== undefined ? personalityFit(top.matched) : undefined}
                />
              </div>
              <span className="stamp stamp-like" aria-hidden="true" style={{ opacity: stampOpacity(1) }}>
                MATCH
              </span>
              <span className="stamp stamp-pass" aria-hidden="true" style={{ opacity: stampOpacity(-1) }}>
                PASS
              </span>
            </div>
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

      {burst && (
        <div key={burst.id} className="match-burst" role="status" aria-live="polite">
          <span className="match-band" aria-hidden="true" />
          <p className="match-word">MATCH</p>
          <p className="match-with">with {burst.companyName}</p>
        </div>
      )}
    </main>
  );
}
