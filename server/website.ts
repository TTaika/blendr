export const MAX_WEBSITE_CHARS = 6000;

export type FetchWebsite = (url: string) => Promise<string | null>;

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

export function createWebsiteFetcher(fetchImpl: typeof fetch = fetch, timeoutMs = 5000): FetchWebsite {
  return async (raw) => {
    const url = normalizeUrl(raw);
    if (!url) return null;
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'BlenderDemo/0.1 (+keyword suggestions)' },
      });
      if (!res.ok) return null;
      const text = htmlToText(await res.text());
      return text ? text.slice(0, MAX_WEBSITE_CHARS) : null;
    } catch {
      return null;
    }
  };
}
