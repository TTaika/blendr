import { describe, expect, it, vi } from 'vitest';
import { MAX_WEBSITE_CHARS, createWebsiteFetcher, htmlToText, normalizeUrl } from './website';

const response = (body: string, ok = true) => ({ ok, text: async () => body }) as Response;

describe('htmlToText', () => {
  it('drops scripts, styles and tags and decodes common entities', () => {
    const html =
      '<html><head><style>p{}</style><script>alert(1)</script></head>' +
      '<body><h1>Hi &amp; welcome</h1><p>We&#39;re   <b>here</b>&nbsp;now</p></body></html>';
    expect(htmlToText(html)).toBe("Hi & welcome We're here now");
  });
});

describe('normalizeUrl', () => {
  it('adds https, keeps http(s) and rejects everything else', () => {
    expect(normalizeUrl('acme.example')).toBe('https://acme.example/');
    expect(normalizeUrl(' http://acme.example/about ')).toBe('http://acme.example/about');
    expect(normalizeUrl('ftp://acme.example')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('localhost')).toBeNull();
  });
});

describe('createWebsiteFetcher', () => {
  it('fetches the page, converts it to text and truncates it', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => response(`<p>${'a'.repeat(MAX_WEBSITE_CHARS + 50)}</p>`));
    const text = await createWebsiteFetcher(fetchImpl as unknown as typeof fetch)('acme.example');
    expect(fetchImpl).toHaveBeenCalledWith('https://acme.example/', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(text).toHaveLength(MAX_WEBSITE_CHARS);
  });

  it('returns null on HTTP errors, network errors and invalid urls', async () => {
    const notOk = createWebsiteFetcher((async () => response('x', false)) as unknown as typeof fetch);
    const offline = createWebsiteFetcher((async () => { throw new Error('offline'); }) as unknown as typeof fetch);
    const spy = vi.fn();
    expect(await notOk('acme.example')).toBeNull();
    expect(await offline('acme.example')).toBeNull();
    expect(await createWebsiteFetcher(spy as unknown as typeof fetch)('not a url')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
