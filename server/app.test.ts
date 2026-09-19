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

describe('GET /api/health', () => {
  it('reports whether Gemini is configured', async () => {
    expect((await request(createApp({ model: okModel, fetchWebsite: noWebsite })).get('/api/health')).body).toEqual({ ok: true, gemini: true });
    expect((await request(createApp({ model: null, fetchWebsite: noWebsite })).get('/api/health')).body).toEqual({ ok: true, gemini: false });
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
