import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Answers } from '../shared/types';
import { generateKeywords, type ModelCall } from './keywords';
import type { FetchWebsite } from './website';

export interface AppDeps {
  model: ModelCall | null; // null when GEMINI_API_KEY is missing
  fetchWebsite: FetchWebsite;
  staticDir?: string; // built SPA (dist/) in production
}

function isAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (v) => typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string')),
  );
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, gemini: deps.model !== null });
  });

  app.post('/api/keywords', async (req, res) => {
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
