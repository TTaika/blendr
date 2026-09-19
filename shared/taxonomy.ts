export type KeywordCategory = 'sector' | 'model' | 'geography' | 'involvement' | 'personality';

export interface TaxonomyEntry {
  id: string;
  label: string;
  category: KeywordCategory;
}

export const CATEGORY_ORDER: KeywordCategory[] = ['sector', 'model', 'geography', 'involvement', 'personality'];

export const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  sector: 'Sector',
  model: 'Business model',
  geography: 'Geography',
  involvement: 'Investor involvement',
  personality: 'Personality & work style',
};

export const TAXONOMY: TaxonomyEntry[] = [
  { id: 'fintech', label: 'Fintech', category: 'sector' },
  { id: 'healthtech', label: 'Healthtech', category: 'sector' },
  { id: 'climate', label: 'Climate & energy', category: 'sector' },
  { id: 'ai-ml', label: 'AI / ML', category: 'sector' },
  { id: 'b2b-saas', label: 'B2B SaaS', category: 'sector' },
  { id: 'deeptech', label: 'Deeptech', category: 'sector' },
  { id: 'consumer', label: 'Consumer', category: 'sector' },
  { id: 'mobility', label: 'Mobility & logistics', category: 'sector' },
  { id: 'foodtech', label: 'Food & agtech', category: 'sector' },
  { id: 'edtech', label: 'Edtech', category: 'sector' },
  { id: 'cybersecurity', label: 'Cybersecurity', category: 'sector' },
  { id: 'gaming', label: 'Gaming', category: 'sector' },
  { id: 'proptech', label: 'Proptech', category: 'sector' },
  { id: 'industrial', label: 'Industrial tech', category: 'sector' },
  { id: 'biotech', label: 'Biotech', category: 'sector' },

  { id: 'b2b', label: 'B2B', category: 'model' },
  { id: 'b2c', label: 'B2C', category: 'model' },
  { id: 'marketplace', label: 'Marketplace', category: 'model' },
  { id: 'subscription', label: 'Subscription', category: 'model' },
  { id: 'usage-based', label: 'Usage-based', category: 'model' },
  { id: 'hardware', label: 'Hardware', category: 'model' },

  { id: 'nordics', label: 'Nordics', category: 'geography' },
  { id: 'baltics', label: 'Baltics', category: 'geography' },
  { id: 'dach', label: 'DACH', category: 'geography' },
  { id: 'uk-ireland', label: 'UK & Ireland', category: 'geography' },
  { id: 'europe', label: 'Europe-wide', category: 'geography' },
  { id: 'north-america', label: 'North America', category: 'geography' },
  { id: 'global', label: 'Global', category: 'geography' },

  { id: 'hands-on', label: 'Hands-on support', category: 'involvement' },
  { id: 'board-seat', label: 'Board seat', category: 'involvement' },
  { id: 'network-access', label: 'Network & intros', category: 'involvement' },
  { id: 'light-touch', label: 'Light-touch', category: 'involvement' },

  { id: 'data-driven', label: 'Data-driven', category: 'personality' },
  { id: 'visionary', label: 'Visionary', category: 'personality' },
  { id: 'execution-focused', label: 'Execution-focused', category: 'personality' },
  { id: 'collaborative', label: 'Collaborative', category: 'personality' },
  { id: 'direct', label: 'Direct communicator', category: 'personality' },
  { id: 'long-term', label: 'Long-term thinker', category: 'personality' },
  { id: 'fast-mover', label: 'Fast mover', category: 'personality' },
  { id: 'mission-driven', label: 'Mission-driven', category: 'personality' },
  { id: 'technical', label: 'Technical depth', category: 'personality' },
];

export const KEYWORD_IDS: string[] = TAXONOMY.map((t) => t.id);

const KEYWORDS_BY_ID = new Map(TAXONOMY.map((t) => [t.id, t]));

export function getKeyword(id: string): TaxonomyEntry | undefined {
  return KEYWORDS_BY_ID.get(id);
}

export function isKeywordId(id: string): boolean {
  return KEYWORDS_BY_ID.has(id);
}

export const STAGES = [
  { id: 'pre-seed', label: 'Pre-seed' },
  { id: 'seed', label: 'Seed' },
  { id: 'series-a', label: 'Series A' },
  { id: 'series-b-plus', label: 'Series B+' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export function isStageId(value: unknown): value is StageId {
  return STAGES.some((s) => s.id === value);
}

export function stageLabel(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

export const TICKETS = [
  { id: 't-under-500k', label: 'Under €500k' },
  { id: 't-500k-2m', label: '€500k – €2M' },
  { id: 't-2m-5m', label: '€2M – €5M' },
  { id: 't-5m-15m', label: '€5M – €15M' },
  { id: 't-15m-plus', label: '€15M+' },
] as const;

export type TicketId = (typeof TICKETS)[number]['id'];

export function isTicketId(value: unknown): value is TicketId {
  return TICKETS.some((t) => t.id === value);
}

export function ticketLabel(id: string): string {
  return TICKETS.find((t) => t.id === id)?.label ?? id;
}
