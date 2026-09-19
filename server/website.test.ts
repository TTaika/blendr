import { describe, expect, it, vi } from 'vitest';
import { MAX_HTML_BYTES, MAX_WEBSITE_CHARS, createWebsiteFetcher, htmlToText, normalizeUrl } from './website';

describe('htmlToText', () => {
  it('drops scripts, styles and tags and decodes common entities', () => {
    const html =
      '<html><head><style>p{}</style><script>alert(1)</script></head>' +
      '<body><h1>Hi &amp; welcome</h1><p>We&#39;re   <b>here</b>&nbsp;now</p></body></html>';
    expect(htmlToText(html)).toBe("Hi & welcome We're here now");
  });

  it('stays linear on unclosed tags (no ReDoS)', () => {
    for (const html of ['<script'.repeat(142000), '<'.repeat(1_000_000)]) {
      const start = performance.now();
      htmlToText(html);
      expect(performance.now() - start).toBeLessThan(200);
    }
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

  it('rejects IP literals and .local/.localhost hostnames', () => {
    expect(normalizeUrl('127.0.0.1')).toBeNull();
    expect(normalizeUrl('http://169.254.169.254/latest')).toBeNull();
    expect(normalizeUrl('0.0.0.0')).toBeNull();
    expect(normalizeUrl('http://[::1]/')).toBeNull();
    expect(normalizeUrl('printer.local')).toBeNull();
  });

  it('rejects localhost with trailing dots or in any case, and drops trailing dots', () => {
    expect(normalizeUrl('localhost.')).toBeNull();
    expect(normalizeUrl('http://localhost.:3999/x')).toBeNull();
    expect(normalizeUrl('LOCALHOST')).toBeNull();
    expect(normalizeUrl('Acme.Example.')).toBe('https://acme.example/');
  });

  it('rejects alternate IPv4 encodings (the URL parser normalises them to dotted form)', () => {
    for (const raw of ['http://0x7f000001/', 'http://2130706433/', 'http://0177.0.0.1/', 'http://127.1/']) {
      expect(normalizeUrl(raw)).toBeNull();
    }
  });
});

const asFetch = (f: unknown) => f as typeof fetch;
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const page = (html: string) => new Response(html, { status: 200 });
const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });

describe('createWebsiteFetcher', () => {
  it('fetches the page, converts it to text and truncates it', async () => {
    const body = `<p>${'a'.repeat(MAX_WEBSITE_CHARS + 50)}</p>`;
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status: 200 }));
    const lookup = vi.fn(publicLookup);
    const text = await createWebsiteFetcher(asFetch(fetchImpl), 5000, lookup)('acme.example');
    expect(lookup).toHaveBeenCalledWith('acme.example');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://acme.example/',
      expect.objectContaining({ signal: expect.any(AbortSignal), redirect: 'manual' }),
    );
    expect(text).toHaveLength(MAX_WEBSITE_CHARS);
  });

  it('returns null on HTTP errors, network errors and invalid urls', async () => {
    const notOk = createWebsiteFetcher(asFetch(async () => new Response('x', { status: 404 })), 5000, publicLookup);
    const offline = createWebsiteFetcher(asFetch(async () => { throw new Error('offline'); }), 5000, publicLookup);
    const spy = vi.fn();
    expect(await notOk('acme.example')).toBeNull();
    expect(await offline('acme.example')).toBeNull();
    expect(await createWebsiteFetcher(asFetch(spy), 5000, publicLookup)('not a url')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('handles large responses by capping bytes without error', async () => {
    const largeBody = '<p>' + 'x'.repeat(MAX_HTML_BYTES + 50000) + '</p>';
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response(largeBody, { status: 200 }));
    const text = await createWebsiteFetcher(asFetch(fetchImpl), 5000, publicLookup)('acme.example');
    expect(text).not.toBeNull();
    expect(text).toHaveLength(MAX_WEBSITE_CHARS);
  });

  it('never fetches a host that resolves to loopback', async () => {
    for (const address of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
      const fetchImpl = vi.fn(async () => page('<p>secret</p>'));
      const lookup = async () => [{ address, family: address.includes(':') ? 6 : 4 }];
      expect(await createWebsiteFetcher(asFetch(fetchImpl), 5000, lookup)('127.0.0.1.nip.io')).toBeNull();
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it('returns null when any resolved address is private, or the lookup fails', async () => {
    const fetchImpl = vi.fn(async () => page('<p>secret</p>'));
    const mixed = async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.1.2.3', family: 4 }];
    const failing = async (): Promise<{ address: string; family: number }[]> => { throw new Error('ENOTFOUND'); };
    expect(await createWebsiteFetcher(asFetch(fetchImpl), 5000, mixed)('acme.example')).toBeNull();
    expect(await createWebsiteFetcher(asFetch(fetchImpl), 5000, failing)('acme.example')).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns null when a redirect points at a private address', async () => {
    const toLiteral = vi.fn().mockResolvedValueOnce(redirect('http://127.0.0.1/secret')).mockResolvedValue(page('<p>secret</p>'));
    expect(await createWebsiteFetcher(asFetch(toLiteral), 5000, publicLookup)('acme.example')).toBeNull();
    expect(toLiteral).toHaveBeenCalledTimes(1);

    const lookup = async (host: string) => [{ address: host === 'internal.example' ? '127.0.0.1' : '93.184.216.34', family: 4 }];
    const toInternal = vi.fn().mockResolvedValueOnce(redirect('http://internal.example/secret')).mockResolvedValue(page('<p>secret</p>'));
    expect(await createWebsiteFetcher(asFetch(toInternal), 5000, lookup)('acme.example')).toBeNull();
    expect(toInternal).toHaveBeenCalledTimes(1);
  });

  it('follows redirects to public hosts, resolving relative locations', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(redirect('https://www.acme.example/', 301))
      .mockResolvedValueOnce(redirect('/about'))
      .mockResolvedValueOnce(page('<h1>About Acme</h1>'));
    expect(await createWebsiteFetcher(asFetch(fetchImpl), 5000, publicLookup)('acme.example')).toBe('About Acme');
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://acme.example/',
      'https://www.acme.example/',
      'https://www.acme.example/about',
    ]);
  });

  it('gives up after 3 redirects', async () => {
    const fetchImpl = vi.fn(async () => redirect('/next'));
    expect(await createWebsiteFetcher(asFetch(fetchImpl), 5000, publicLookup)('acme.example')).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});
