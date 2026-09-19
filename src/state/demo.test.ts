import { describe, expect, it } from 'vitest';
import type { FeedEntry, ProfileKeyword } from '../../shared/types';
import { type DemoAction, type DemoState, demoReducer, initialState, isDemoState, remainingFeed, resolveScreen } from './demo';

const run = (actions: DemoAction[], from: DemoState = initialState) => actions.reduce(demoReducer, from);
const feed = (...ids: string[]): FeedEntry[] => ids.map((companyId) => ({ companyId, matched: [] }));
const kw = (id: string): ProfileKeyword => ({ id, reason: `because ${id}`, source: 'ai' });
const drafted: DemoAction = { type: 'profileDrafted', summary: 'Seed fund', keywords: [kw('fintech')] };

describe('demoReducer', () => {
  it('chooseRole starts a fresh screening for that role', () => {
    const s = run([{ type: 'skipToSwiping', feed: feed('a') }, { type: 'like', companyId: 'a' }, { type: 'chooseRole', role: 'investor' }]);
    expect(s).toEqual({ ...initialState, mode: 'investor', screen: 'screening' });
  });

  it('skipToSwiping opens the swipe screen with the given feed', () => {
    const s = run([{ type: 'skipToSwiping', feed: feed('b', 'a') }]);
    expect(s.mode).toBe('skip');
    expect(s.screen).toBe('swipe');
    expect(s.feed).toEqual(feed('b', 'a'));
  });

  it('stores answers and builds a draft profile from them', () => {
    const s = run([{ type: 'chooseRole', role: 'investor' }, { type: 'setAnswer', id: 'stages', value: ['seed'] }, drafted]);
    expect(s.screen).toBe('review');
    expect(s.profile).toEqual({ role: 'investor', answers: { stages: ['seed'] }, summary: 'Seed fund', keywords: [kw('fintech')] });
  });

  it('ignores profileDrafted in skip mode', () => {
    const before = run([{ type: 'skipToSwiping', feed: feed('a') }]);
    expect(demoReducer(before, drafted)).toBe(before);
  });

  it('adds keywords without duplicates and removes them', () => {
    const s = run([
      { type: 'chooseRole', role: 'founder' },
      drafted,
      { type: 'addKeyword', keyword: { id: 'nordics', reason: 'Added by you', source: 'user' } },
      { type: 'addKeyword', keyword: kw('fintech') },
      { type: 'removeKeyword', id: 'fintech' },
    ]);
    expect(s.profile?.keywords).toEqual([{ id: 'nordics', reason: 'Added by you', source: 'user' }]);
  });

  it('editAnswers goes back to screening', () => {
    expect(run([{ type: 'chooseRole', role: 'founder' }, drafted, { type: 'editAnswers' }]).screen).toBe('screening');
  });

  it('a submitted founder sees their preview and never gets a feed', () => {
    const s = run([{ type: 'chooseRole', role: 'founder' }, drafted, { type: 'submitFounderProfile' }]);
    expect(s.screen).toBe('founder-preview');
    expect(s.feed).toEqual([]);
  });

  it('a submitted investor starts swiping the ranked feed; founders cannot', () => {
    const investor = run([{ type: 'chooseRole', role: 'investor' }, drafted, { type: 'submitInvestorProfile', feed: feed('x', 'y') }]);
    expect(investor.screen).toBe('swipe');
    expect(investor.feed).toEqual(feed('x', 'y'));
    const founder = run([{ type: 'chooseRole', role: 'founder' }, drafted]);
    expect(demoReducer(founder, { type: 'submitInvestorProfile', feed: feed('x') })).toBe(founder);
  });

  it('tracks likes and discards once per company', () => {
    const s = run([
      { type: 'skipToSwiping', feed: feed('a', 'b', 'c') },
      { type: 'like', companyId: 'a' },
      { type: 'like', companyId: 'a' },
      { type: 'discard', companyId: 'b' },
      { type: 'like', companyId: 'b' },
    ]);
    expect(s.likedIds).toEqual(['a']);
    expect(s.seenIds).toEqual(['a', 'b']);
    expect(remainingFeed(s)).toEqual(feed('c'));
  });

  it('prompts to visit Connect after every 5th like', () => {
    const ids = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
    let s = run([{ type: 'skipToSwiping', feed: feed(...ids) }]);
    const prompts: boolean[] = [];
    for (const id of ids) {
      s = demoReducer(s, { type: 'like', companyId: id });
      prompts.push(s.showConnectPrompt);
      if (s.showConnectPrompt) s = demoReducer(s, { type: 'dismissConnectPrompt' });
    }
    expect(prompts).toEqual([false, false, false, false, true, false, false, false, false, true]);
  });

  it('openConnect closes the prompt; openSwipe returns', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((companyId): DemoAction => ({ type: 'like', companyId }));
    const s = run([{ type: 'skipToSwiping', feed: feed('a', 'b', 'c', 'd', 'e') }, ...five, { type: 'openConnect' }]);
    expect(s.screen).toBe('connect');
    expect(s.showConnectPrompt).toBe(false);
    expect(demoReducer(s, { type: 'openSwipe' }).screen).toBe('swipe');
  });

  it('reviewPassed brings discarded companies back but keeps liked ones out', () => {
    const s = run([
      { type: 'skipToSwiping', feed: feed('a', 'b') },
      { type: 'like', companyId: 'a' },
      { type: 'discard', companyId: 'b' },
      { type: 'reviewPassed' },
    ]);
    expect(remainingFeed(s)).toEqual(feed('b'));
    expect(s.likedIds).toEqual(['a']);
  });

  it('bookMeeting opens the My Slush hand-off, but only with likes', () => {
    const connect = run([{ type: 'skipToSwiping', feed: feed('a', 'b') }, { type: 'like', companyId: 'a' }, { type: 'openConnect' }]);
    const s = demoReducer(connect, { type: 'bookMeeting' });
    expect(s).toEqual({ ...connect, screen: 'my-slush' });
    expect(demoReducer(s, { type: 'reset' })).toEqual(initialState);
    const noLikes = run([{ type: 'skipToSwiping', feed: feed('a') }, { type: 'openConnect' }]);
    expect(demoReducer(noLikes, { type: 'bookMeeting' })).toBe(noLikes);
  });

  it('reset returns to the initial state', () => {
    expect(run([{ type: 'skipToSwiping', feed: feed('a') }, { type: 'reset' }])).toEqual(initialState);
  });
});

describe('isDemoState', () => {
  it('accepts saved states and rejects junk', () => {
    expect(isDemoState(initialState)).toBe(true);
    expect(isDemoState(JSON.parse(JSON.stringify(run([{ type: 'skipToSwiping', feed: feed('a') }]))))).toBe(true);
    expect(isDemoState(null)).toBe(false);
    expect(isDemoState({ ...initialState, version: 2 })).toBe(false);
    expect(isDemoState({ ...initialState, screen: 'my-slush', mode: 'investor' })).toBe(true);
    expect(isDemoState({ ...initialState, screen: 'nowhere' })).toBe(false);
    expect(isDemoState({ ...initialState, likedIds: 'a' })).toBe(false);
  });
});

describe('resolveScreen', () => {
  it('falls back to role select when the saved screen lacks its data', () => {
    expect(resolveScreen({ ...initialState, screen: 'review' })).toBe('role');
    expect(resolveScreen({ ...initialState, screen: 'founder-preview' })).toBe('role');
    expect(resolveScreen({ ...initialState, screen: 'screening', mode: 'skip' })).toBe('role');
    expect(resolveScreen({ ...initialState, screen: 'swipe', mode: null })).toBe('role');
    expect(resolveScreen(run([{ type: 'chooseRole', role: 'founder' }]))).toBe('screening');
    expect(resolveScreen(run([{ type: 'skipToSwiping', feed: feed('a') }]))).toBe('swipe');
    expect(resolveScreen({ ...initialState, screen: 'my-slush', mode: null })).toBe('role');
    expect(resolveScreen({ ...initialState, screen: 'my-slush', mode: 'skip' })).toBe('my-slush');
  });
});
