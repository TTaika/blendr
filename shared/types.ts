import type { StageId, TicketId } from './taxonomy';

export type Role = 'founder' | 'investor';

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export interface ProfileKeyword {
  id: string; // taxonomy id
  reason: string; // why it was assigned; shown on tap/hover
  source: 'ai' | 'user';
}

/** Response body of POST /api/keywords. */
export interface KeywordResult {
  summary: string;
  keywords: { id: string; reason: string }[];
  websiteUsed: boolean;
}

export interface Profile {
  role: Role;
  answers: Answers;
  summary: string;
  keywords: ProfileKeyword[];
}

export interface KeyNumber {
  label: string;
  value: string;
}

export interface Contact {
  name: string;
  title: string;
  email: string;
  phone?: string;
  linkedin?: string;
}

export interface Company {
  id: string;
  name: string;
  oneLiner: string; // max 100 characters
  stage: StageId;
  raise: TicketId;
  keywords: { id: string; reason: string }[];
  problem: string;
  solution: string;
  team: string;
  keyNumbers: KeyNumber[];
  whyInvest: string;
  website: string;
  contact: Contact;
  videoUrl?: string; // e.g. '/videos/northlight.mp4' served from public/videos
}

/** One card in the swipe feed. `score` is undefined in random ("skip") mode. */
export interface FeedEntry {
  companyId: string;
  score?: number;
  matched: string[]; // keyword ids shared with the investor
}
