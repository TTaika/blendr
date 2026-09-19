import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type RequestHandler } from 'express';
import type { Answers } from '../shared/types';
import { generateKeywords, type ModelCall } from './keywords';
import type { SelfTest } from './selfTest';
import type { FetchWebsite } from './website';

export interface AppDeps {
  model: ModelCall | null; // null when GEMINI_API_KEY is missing
  fetchWebsite: FetchWebsite;
  staticDir?: string; // built SPA (dist/) in production
  getSelfTest?: () => SelfTest; // startup Gemini check, reported by /api/health
  now?: () => number; // clock for the rate limiter (tests)
  /** Proxy hops to trust for the client IP (X-Forwarded-For). Set only behind a real proxy such as
   * Render; left unset when hosted directly, where a client could fake the header. */
  trustProxy?: number;
}

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

// In-memory fixed window per client IP, so one device cannot burn the Gemini quota.
function rateLimit(now: () => number): RequestHandler {
  const windows = new Map<string, { start: number; count: number }>();
  return (req, res, next) => {
    const key = req.ip ?? '';
    const t = now();
    const win = windows.get(key);
    if (!win || t - win.start >= RATE_WINDOW_MS) {
      windows.set(key, { start: t, count: 1 });
    } else if (win.count >= RATE_LIMIT) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute and retry.' });
      return;
    } else {
      win.count++;
    }
    next();
  };
}

function isAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (v) => typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string')),
  );
}

export function createApp(deps: AppDeps) {
  const app = express();
  if (deps.trustProxy) app.set('trust proxy', deps.trustProxy);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    const selfTest: SelfTest = deps.model && deps.getSelfTest ? deps.getSelfTest() : { status: 'skipped' };
    res.json({ ok: true, gemini: deps.model !== null, selfTest });
  });

  app.post('/api/keywords', rateLimit(deps.now ?? Date.now), async (req, res) => {
    const { role, answers } = req.body ?? {};
    if ((role !== 'founder' && role !== 'investor') || !isAnswers(answers)) {
      res.status(400).json({ error: 'Expected { role: "founder" | "investor", answers: object }' });
      return;
    }
    if (!deps.model) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }
    try {
      res.json(await generateKeywords(role, answers, { model: deps.model, fetchWebsite: deps.fetchWebsite }));
    } catch (err) {
      console.error('[keywords]', err);
      res.status(502).json({ error: 'Keyword generation failed. Please retry.' });
    }
  });

  if (deps.staticDir && existsSync(deps.staticDir)) {
    const dir = deps.staticDir;
    app.use(express.static(dir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(dir, 'index.html'));
    });
  }

  return app;
}
