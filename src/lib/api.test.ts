import { describe, expect, it, vi } from 'vitest';
import { requestKeywords } from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('requestKeywords', () => {
  it('posts the role and answers and returns the result', async () => {
    const result = { summary: 's', keywords: [{ id: 'fintech', reason: 'r' }], websiteUsed: false };
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => json(result));
    await expect(requestKeywords('founder', { companyName: 'Acme' }, fetchImpl as unknown as typeof fetch)).resolves.toEqual(result);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/keywords');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ role: 'founder', answers: { companyName: 'Acme' } });
  });

  it("throws the server's error message", async () => {
    const fetchImpl = async () => json({ error: 'Keyword generation failed. Please retry.' }, 502);
    await expect(requestKeywords('founder', {}, fetchImpl as unknown as typeof fetch)).rejects.toThrow('Keyword generation failed. Please retry.');
  });

  it('falls back to the status code when the body has no error', async () => {
    const fetchImpl = async () => new Response('oops', { status: 500 });
    await expect(requestKeywords('founder', {}, fetchImpl as unknown as typeof fetch)).rejects.toThrow('Request failed (500)');
  });

  it('explains network failures', async () => {
    const fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
    await expect(requestKeywords('investor', {}, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      'Could not reach the Blendr server. Check the Wi-Fi connection.',
    );
  });
});
