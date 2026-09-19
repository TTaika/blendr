export const MAX_WEBSITE_CHARS = 6000;
export const MAX_HTML_BYTES = 1_000_000;

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
    const hostname = url.hostname;

    // Reject IP literals (IPv4 and IPv6)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null; // IPv4
    if (hostname.startsWith('[')) return null; // IPv6

    // Reject .local and .localhost TLDs
    if (hostname.endsWith('.local') || hostname.endsWith('.localhost')) return null;

    // Require at least one dot to reject bare hostnames
    return hostname.includes('.') ? url.toString() : null;
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
      if (!res.body) return null;

      // Read body with byte cap
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.length;
          chunks.push(value);
          if (totalBytes > MAX_HTML_BYTES) {
            await reader.cancel();
            break;
          }
        }
      } catch {
        await reader.cancel();
        return null;
      }

      const buffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const htmlText = decoder.decode(buffer);
      const text = htmlToText(htmlText);
      return text ? text.slice(0, MAX_WEBSITE_CHARS) : null;
    } catch {
      return null;
    }
  };
}
