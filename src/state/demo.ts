import type { AnswerValue, Answers, FeedEntry, Profile, ProfileKeyword, Role } from '../../shared/types';

export type Mode = Role | 'skip';
export type Screen = 'role' | 'screening' | 'review' | 'founder-preview' | 'swipe' | 'connect';

const SCREENS: Screen[] = ['role', 'screening', 'review', 'founder-preview', 'swipe', 'connect'];

export interface DemoState {
  version: 1;
  screen: Screen;
  mode: Mode | null;
  answers: Answers;
  profile: Profile | null;
  feed: FeedEntry[];
  likedIds: string[]; // in like order
  seenIds: string[]; // liked + discarded
  showConnectPrompt: boolean;
}

export const LIKES_PER_PROMPT = 5;

export const initialState: DemoState = {
  version: 1,
  screen: 'role',
  mode: null,
  answers: {},
  profile: null,
  feed: [],
  likedIds: [],
  seenIds: [],
  showConnectPrompt: false,
};

export type DemoAction =
  | { type: 'chooseRole'; role: Role }
  | { type: 'skipToSwiping'; feed: FeedEntry[] }
  | { type: 'setAnswer'; id: string; value: AnswerValue }
  | { type: 'profileDrafted'; summary: string; keywords: ProfileKeyword[] }
  | { type: 'addKeyword'; keyword: ProfileKeyword }
  | { type: 'removeKeyword'; id: string }
  | { type: 'editAnswers' }
  | { type: 'submitFounderProfile' }
  | { type: 'submitInvestorProfile'; feed: FeedEntry[] }
  | { type: 'like'; companyId: string }
  | { type: 'discard'; companyId: string }
  | { type: 'dismissConnectPrompt' }
  | { type: 'openConnect' }
  | { type: 'openSwipe' }
  | { type: 'reviewPassed' }
  | { type: 'reset' };

const isRole = (mode: Mode | null): mode is Role => mode === 'founder' || mode === 'investor';

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'chooseRole':
      return { ...initialState, mode: action.role, screen: 'screening' };
    case 'skipToSwiping':
      return { ...initialState, mode: 'skip', feed: action.feed, screen: 'swipe' };
    case 'setAnswer':
      return { ...state, answers: { ...state.answers, [action.id]: action.value } };
    case 'profileDrafted':
      if (!isRole(state.mode)) return state;
      return {
        ...state,
        screen: 'review',
        profile: { role: state.mode, answers: state.answers, summary: action.summary, keywords: action.keywords },
      };
    case 'addKeyword':
      if (!state.profile || state.profile.keywords.some((k) => k.id === action.keyword.id)) return state;
      return { ...state, profile: { ...state.profile, keywords: [...state.profile.keywords, action.keyword] } };
    case 'removeKeyword':
      if (!state.profile) return state;
      return { ...state, profile: { ...state.profile, keywords: state.profile.keywords.filter((k) => k.id !== action.id) } };
    case 'editAnswers':
      return isRole(state.mode) ? { ...state, screen: 'screening' } : state;
    case 'submitFounderProfile':
      return state.mode === 'founder' && state.profile ? { ...state, screen: 'founder-preview' } : state;
    case 'submitInvestorProfile':
      if (state.mode !== 'investor' || !state.profile) return state;
      return { ...state, screen: 'swipe', feed: action.feed, likedIds: [], seenIds: [], showConnectPrompt: false };
    case 'like': {
      if (state.seenIds.includes(action.companyId)) return state;
      const likedIds = [...state.likedIds, action.companyId];
      return {
        ...state,
        likedIds,
        seenIds: [...state.seenIds, action.companyId],
        showConnectPrompt: likedIds.length % LIKES_PER_PROMPT === 0,
      };
    }
    case 'discard':
      if (state.seenIds.includes(action.companyId)) return state;
      return { ...state, seenIds: [...state.seenIds, action.companyId] };
    case 'dismissConnectPrompt':
      return { ...state, showConnectPrompt: false };
    case 'openConnect':
      return { ...state, screen: 'connect', showConnectPrompt: false };
    case 'openSwipe':
      return { ...state, screen: 'swipe' };
    case 'reviewPassed':
      return { ...state, seenIds: [...state.likedIds] };
    case 'reset':
      return initialState;
  }
}

export function remainingFeed(state: DemoState): FeedEntry[] {
  return state.feed.filter((e) => !state.seenIds.includes(e.companyId));
}

export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<DemoState>;
  return (
    v.version === 1 &&
    SCREENS.includes(v.screen as Screen) &&
    typeof v.answers === 'object' &&
    v.answers !== null &&
    Array.isArray(v.feed) &&
    Array.isArray(v.likedIds) &&
    Array.isArray(v.seenIds)
  );
}

/** Guards against saved states whose screen is missing the data it needs. */
export function resolveScreen(state: DemoState): Screen {
  switch (state.screen) {
    case 'screening':
      return isRole(state.mode) ? 'screening' : 'role';
    case 'review':
      return isRole(state.mode) && state.profile ? 'review' : 'role';
    case 'founder-preview':
      return state.mode === 'founder' && state.profile ? 'founder-preview' : 'role';
    case 'swipe':
    case 'connect':
      return state.mode === 'investor' || state.mode === 'skip' ? state.screen : 'role';
    default:
      return 'role';
  }
}
