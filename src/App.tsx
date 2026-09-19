import { useMemo, useState } from 'react';
import type { Company, KeywordResult } from '../shared/types';
import { COMPANIES, COMPANY_BY_ID } from './data/companies';
import { requestKeywords, type RequestKeywords } from './lib/api';
import { criteriaFromProfile, randomFeed, rankFeed } from './lib/matching';
import type { ReadVideoDuration } from './lib/pitchVideo';
import { clearPitchVideo } from './lib/videoStore';
import { Connect } from './screens/Connect';
import { FounderPreview } from './screens/FounderPreview';
import { ProfileReview } from './screens/ProfileReview';
import { RoleSelect } from './screens/RoleSelect';
import { Screening } from './screens/Screening';
import { Swipe } from './screens/Swipe';
import { type Mode, remainingFeed, resolveScreen } from './state/demo';
import { useDemo } from './state/useDemo';

export interface AppProps {
  generate?: RequestKeywords;
  random?: () => number;
  swipeExitMs?: number;
  readVideoDuration?: ReadVideoDuration;
}

export default function App({ generate = requestKeywords, random = Math.random, swipeExitMs, readVideoDuration }: AppProps) {
  const [state, dispatch] = useDemo();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const screen = resolveScreen(state);
  const likedCompanies = useMemo(
    () => state.likedIds.map((id) => COMPANY_BY_ID.get(id)).filter((c): c is Company => c !== undefined),
    [state.likedIds],
  );

  function choose(mode: Mode) {
    if (mode === 'skip') dispatch({ type: 'skipToSwiping', feed: randomFeed(COMPANIES, random) });
    else dispatch({ type: 'chooseRole', role: mode });
  }

  function onGenerated(result: KeywordResult) {
    dispatch({
      type: 'profileDrafted',
      summary: result.summary,
      keywords: result.keywords.map((k) => ({ ...k, source: 'ai' as const })),
    });
  }

  // Asked in-app: window.confirm() is blocked (always "cancel") in the sandboxed claude.ai frame.
  function startOver() {
    setConfirmingReset(true);
  }

  function confirmReset() {
    setConfirmingReset(false);
    void clearPitchVideo();
    dispatch({ type: 'reset' });
  }

  function submitProfile() {
    if (state.profile?.role === 'founder') dispatch({ type: 'submitFounderProfile' });
    else if (state.profile?.role === 'investor') {
      dispatch({ type: 'submitInvestorProfile', feed: rankFeed(criteriaFromProfile(state.profile), COMPANIES) });
    }
  }

  function renderScreen() {
    switch (screen) {
      case 'screening':
        if (state.mode !== 'founder' && state.mode !== 'investor') break;
        return (
          <Screening
            role={state.mode}
            answers={state.answers}
            onAnswer={(id, value) => dispatch({ type: 'setAnswer', id, value })}
            onGenerated={onGenerated}
            onManual={() => dispatch({ type: 'profileDrafted', summary: '', keywords: [] })}
            generate={generate}
            readVideoDuration={readVideoDuration}
          />
        );
      case 'review':
        if (!state.profile) break;
        return (
          <ProfileReview
            profile={state.profile}
            onAdd={(keyword) => dispatch({ type: 'addKeyword', keyword })}
            onRemove={(id) => dispatch({ type: 'removeKeyword', id })}
            onEditAnswers={() => dispatch({ type: 'editAnswers' })}
            onSubmit={submitProfile}
          />
        );
      case 'founder-preview':
        if (!state.profile) break;
        return <FounderPreview profile={state.profile} onStartOver={startOver} />;
      case 'swipe': {
        const fundName = state.profile?.answers.fundName;
        const subtitle =
          state.mode === 'investor' && typeof fundName === 'string' && fundName
            ? `Ranked for ${fundName}`
            : 'Random order';
        return (
          <Swipe
            entries={remainingFeed(state).filter((e) => COMPANY_BY_ID.has(e.companyId))}
            companies={COMPANY_BY_ID}
            subtitle={subtitle}
            likedCount={likedCompanies.length}
            showConnectPrompt={state.showConnectPrompt}
            onLike={(companyId) => dispatch({ type: 'like', companyId })}
            onDiscard={(companyId) => dispatch({ type: 'discard', companyId })}
            onOpenConnect={() => dispatch({ type: 'openConnect' })}
            onDismissPrompt={() => dispatch({ type: 'dismissConnectPrompt' })}
            onReviewPassed={() => dispatch({ type: 'reviewPassed' })}
            exitMs={swipeExitMs}
          />
        );
      }
      case 'connect':
        return <Connect companies={likedCompanies} onBackToSwiping={() => dispatch({ type: 'openSwipe' })} />;
    }
    return <RoleSelect onChoose={choose} />;
  }

  return (
    <>
      {renderScreen()}
      {screen !== 'role' && screen !== 'founder-preview' && (
        // Screens with a sticky Back/Next bar get the link at the top instead, clear of Back.
        <button
          type="button"
          className={screen === 'screening' || screen === 'review' ? 'reset reset-top' : 'reset'}
          onClick={startOver}
        >
          Start over
        </button>
      )}
      {confirmingReset && (
        <div className="overlay">
          <div
            className="panel dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-over-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setConfirmingReset(false);
            }}
          >
            <h2 id="start-over-title">Start over?</h2>
            <p className="muted">This clears your answers, profile and likes on this phone.</p>
            <div className="row">
              <button type="button" className="btn btn-ghost" autoFocus onClick={() => setConfirmingReset(false)}>
                Cancel
              </button>
              <span className="spacer" />
              <button type="button" className="btn btn-primary" onClick={confirmReset}>
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
