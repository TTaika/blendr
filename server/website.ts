import dns from 'node:dns';
import net from 'node:net';

export const MAX_WEBSITE_CHARS = 6000;
export const MAX_HTML_BYTES = 1_000_000;
export const MAX_HTML_CHARS = 200_000; // only this much decoded HTML is converted to text

export type FetchWebsite = (url: string) => Promise<string | null>;
export type Lookup = (hostname: string) => Promise<{ address: string; family: number }[]>;

const defaultLookup: Lookup = (hostname) => dns.promises.lookup(hostname, { all: true });
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// Linear-time removal of <script>/<style>/<noscript> blocks. A block without a
// closing tag drops the rest of the input (a regex would rescan it per tag: ReDoS).
function stripRawTextBlocks(html: string): string {
  const lower = html.replace(/[A-Z]+/g, (s) => s.toLowerCase()); // ASCII only, so indices match `html`
  const open = /<(script|style|noscript)/g;
  let out = '';
  let pos = 0;
  let match: RegExpExecArray | null;
  while ((match = open.exec(lower)) !== null) {
    out += html.slice(pos, match.index) + ' ';
    const close = `</${match[1]}>`;
    const end = lower.indexOf(close, open.lastIndex);
    if (end === -1) return out;
    pos = end + close.length;
    open.lastIndex = pos;
  }
  return out + html.slice(pos);
}

export function htmlToText(html: string): string {
  return stripRawTextBlocks(html)
    .replace(/<[^<>]*>/g, ' ')
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
    let end = url.hostname.length;
    while (end > 0 && url.hostname[end - 1] === '.') end--; // "localhost." is localhost
    const hostname = url.hostname.slice(0, end).toLowerCase();
    if (!hostname || hostname === 'localhost') return null;
    url.hostname = hostname;

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

const BLOCKED = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.168.0.0', 16], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) BLOCKED.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [['::1', 128], ['::', 128], ['fc00::', 7], ['fe80::', 10]] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv6');
}

function isBlockedAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address); // IPv4-mapped IPv6: check the embedded IPv4
  if (mapped) return isBlockedAddress(mapped[1]);
  const family = net.isIP(address);
  if (family === 0) return true; // not an IP address
  return BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6'); // also maps ::ffff:7f00:1 onto the IPv4 rules
}

// dns.lookup takes no AbortSignal: race it so DNS stays inside the fetch's time budget.
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

async function resolvesToPublic(hostname: string, lookup: Lookup, signal: AbortSignal): Promise<boolean> {
  const addresses = await untilAborted(lookup(hostname), signal);
  return addresses.length > 0 && !addresses.some((a) => isBlockedAddress(a.address));
}

// Every hop (initial request and each redirect) is re-validated and re-resolved;
// a host with any private address is refused.
async function fetchPublic(
  startUrl: string,
  fetchImpl: typeof fetch,
  lookup: Lookup,
  signal: AbortSignal,
): Promise<Response | null> {
  let url = startUrl;
  for (let redirects = 0; ; redirects++) {
    if (!(await resolvesToPublic(new URL(url).hostname, lookup, signal))) return null;
    const res = await fetchImpl(url, {
      signal,
      redirect: 'manual',
      headers: { 'user-agent': 'BlenderDemo/0.1 (+keyword suggestions)' },
    });
    if (!REDIRECT_STATUSES.has(res.status)) return res;
    await res.body?.cancel();
    const location = res.headers.get('location');
    const next = location && redirects < MAX_REDIRECTS ? normalizeUrl(new URL(location, url).href) : null;
    if (!next) return null;
    url = next;
  }
}

export function createWebsiteFetcher(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 5000,
  lookupImpl: Lookup = defaultLookup,
): FetchWebsite {
  return async (raw) => {
    const url = normalizeUrl(raw);
    if (!url) return null;
    try {
      const res = await fetchPublic(url, fetchImpl, lookupImpl, AbortSignal.timeout(timeoutMs));
      if (!res) return null;
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
      const text = htmlToText(htmlText.slice(0, MAX_HTML_CHARS));
      return text ? text.slice(0, MAX_WEBSITE_CHARS) : null;
    } catch {
      return null;
    }
  };
}
