import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app';

const noWebsite = async () => null;
const okModel = async () => JSON.stringify({ summary: 'Grid software', keywords: [{ id: 'climate', reason: 'Grid' }] });

describe('POST /api/keywords', () => {
  it('returns validated keywords', async () => {
    const app = createApp({ model: okModel, fetchWebsite: noWebsite });
    const res = await request(app).post('/api/keywords').send({ role: 'founder', answers: { companyName: 'Acme' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: 'Grid software', keywords: [{ id: 'climate', reason: 'Grid' }], websiteUsed: false });
  });

  it('rejects malformed requests with 400', async () => {
    const app = createApp({ model: okModel, fetchWebsite: noWebsite });
    for (const body of [{ role: 'admin', answers: {} }, { role: 'founder', answers: 'x' }, { role: 'founder', answers: { a: 1 } }]) {
      expect((await request(app).post('/api/keywords').send(body)).status).toBe(400);
    }
  });

  it('returns 503 when no Gemini key is configured', async () => {
    const app = createApp({ model: null, fetchWebsite: noWebsite });
    const res = await request(app).post('/api/keywords').send({ role: 'investor', answers: {} });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/GEMINI_API_KEY/);
  });

  it('returns 502 when the model fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp({ model: async () => { throw new Error('boom'); }, fetchWebsite: noWebsite });
    const res = await request(app).post('/api/keywords').send({ role: 'founder', answers: {} });
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Keyword generation failed. Please retry.' });
    errors.mockRestore();
  });
});

describe('POST /api/keywords rate limit', () => {
  it('allows 20 requests per IP per minute, checked before validation', async () => {
    let now = 1_000_000;
    const app = createApp({ model: okModel, fetchWebsite: noWebsite, now: () => now });
    const post = (body: object = { role: 'founder', answers: {} }) => request(app).post('/api/keywords').send(body);

    for (let i = 0; i < 20; i++) expect((await post()).status).toBe(200);
    const limited = await post();
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many requests. Please wait a minute and retry.' });
    expect((await post({ role: 'admin' })).status).toBe(429);
    expect((await request(app).get('/api/health')).status).toBe(200);

    now += 60_000;
    expect((await post()).status).toBe(200);
  });

  it('behind a trusted proxy (Render), limits each visitor separately', async () => {
    const app = createApp({ model: okModel, fetchWebsite: noWebsite, trustProxy: 1, now: () => 1_000_000 });
    const postFrom = (ip: string) =>
      request(app).post('/api/keywords').set('X-Forwarded-For', ip).send({ role: 'founder', answers: {} });

    for (let i = 0; i < 20; i++) expect((await postFrom('203.0.113.1')).status).toBe(200);
    expect((await postFrom('203.0.113.1')).status).toBe(429);
    expect((await postFrom('203.0.113.2')).status).toBe(200);
  });

  it('without a trusted proxy, ignores X-Forwarded-For so it cannot be spoofed', async () => {
    const app = createApp({ model: okModel, fetchWebsite: noWebsite, now: () => 1_000_000 });
    const postFrom = (ip: string) =>
      request(app).post('/api/keywords').set('X-Forwarded-For', ip).send({ role: 'founder', answers: {} });

    for (let i = 0; i < 20; i++) expect((await postFrom(`198.51.100.${i}`)).status).toBe(200);
    expect((await postFrom('198.51.100.99')).status).toBe(429);
  });
});

describe('GET /api/health', () => {
  const health = async (app: ReturnType<typeof createApp>) => (await request(app).get('/api/health')).body;

  it('reports whether Gemini is configured', async () => {
    expect(await health(createApp({ model: okModel, fetchWebsite: noWebsite }))).toEqual({ ok: true, gemini: true, selfTest: { status: 'skipped' } });
    expect(await health(createApp({ model: null, fetchWebsite: noWebsite }))).toEqual({ ok: true, gemini: false, selfTest: { status: 'skipped' } });
  });

  it('reports the Gemini self-test result when there is a key', async () => {
    const selfTest = { status: 'ok', ms: 812, keywords: 7 } as const;
    expect(await health(createApp({ model: okModel, fetchWebsite: noWebsite, getSelfTest: () => selfTest }))).toEqual({ ok: true, gemini: true, selfTest });
    expect(await health(createApp({ model: null, fetchWebsite: noWebsite, getSelfTest: () => selfTest }))).toEqual({ ok: true, gemini: false, selfTest: { status: 'skipped' } });
  });
});

describe('static hosting', () => {
  it('serves the built app and falls back to index.html, but not for /api', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'blender-dist-'));
    writeFileSync(path.join(dir, 'index.html'), '<h1>Blender</h1>');
    const app = createApp({ model: null, fetchWebsite: noWebsite, staticDir: dir });
    expect((await request(app).get('/')).text).toContain('Blender');
    expect((await request(app).get('/some/deep/link')).text).toContain('Blender');
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});
