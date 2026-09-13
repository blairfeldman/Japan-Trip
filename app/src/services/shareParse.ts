import { describeSharedLink } from '../utils/shareLink';

/**
 * Best-effort read of a shared video, using TikTok's public oEmbed endpoint —
 * no API key, no account, no backend. It returns the caption, the author and a
 * cover image, which is most of what you need to save a place: the caption
 * usually names it.
 *
 * This is deliberately *not* the pipeline in `backend/`. That one sends the
 * caption to a model and geocodes what it names, so the pin lands on a real
 * address. This just hands you a filled-in name field you can correct — it is
 * what runs when no backend is configured, and what runs first either way so
 * the sheet isn't empty while the server works.
 *
 * Instagram goes through Meta's `instagram_oembed`. That needed an app access
 * token and App Review from October 2020 until 15 June 2026, when Meta made
 * the oEmbed APIs tokenless again — so it now needs no account, app or key
 * either. If Meta reverses that, the call 401s and the app falls back to the
 * by-hand flow on its own.
 * https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis/
 *
 * Every failure path returns null — if TikTok changes or blocks this, the app
 * quietly goes back to the manual flow rather than breaking.
 */

export interface ParsedShare {
  caption: string;
  suggestedName: string;
  handle: string;
  thumbnailUrl?: string;
}

const OEMBED_TIMEOUT_MS = 7000;

const OEMBED_ENDPOINT: Record<'TikTok' | 'Instagram', (url: string) => string> = {
  TikTok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  // Tokenless since 2026-06-15; pinned to a version so a default bump can't
  // silently change the response shape.
  Instagram: (url) => `https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(url)}&omitscript=true`,
};

/**
 * Strips a TikTok caption down to something usable as a place name: hashtags,
 * links, emoji and @mentions carry no information here and just have to be
 * deleted by hand otherwise.
 */
export function placeNameFromCaption(caption: string): string {
  const cleaned = caption
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/#[^\s#]+/g, ' ')
    .replace(/@[A-Za-z0-9._]+/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}]|[\u{2190}-\u{2BFF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E6}-\u{1F1FF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Captions often run "Best ramen in Tokyo | Ichiran Shibuya" or use a dash.
  // The longest segment is the most descriptive one more often than not.
  const segments = cleaned
    .split(/[|·•–—]|(?:\s-\s)/)
    .map((x) => x.trim())
    .filter(Boolean);
  const best = segments.sort((a, b) => b.length - a.length)[0] ?? cleaned;

  return best.slice(0, 80).trim();
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Both services answer in oEmbed's shape; only the handle field differs. */
export function parseOEmbedPayload(json: any, fallbackHandle: string): ParsedShare | null {
  const caption = typeof json?.title === 'string' ? json.title : '';
  // TikTok names it author_unique_id; Instagram uses author_name.
  const rawHandle: unknown = json?.author_unique_id ?? json?.author_name;
  const handle = typeof rawHandle === 'string' && rawHandle ? `@${String(rawHandle).replace(/^@/, '')}` : fallbackHandle;
  const suggestedName = placeNameFromCaption(caption);
  if (!suggestedName && handle === fallbackHandle) return null;
  return {
    caption,
    suggestedName,
    handle,
    thumbnailUrl: typeof json?.thumbnail_url === 'string' ? json.thumbnail_url : undefined,
  };
}

export async function parseSharedVideo(rawUrl: string): Promise<ParsedShare | null> {
  const link = describeSharedLink(rawUrl);
  if (link.platform !== 'TikTok' && link.platform !== 'Instagram') return null;

  try {
    const res = await fetchWithTimeout(OEMBED_ENDPOINT[link.platform](link.url), OEMBED_TIMEOUT_MS);
    if (!res.ok) return null;
    return parseOEmbedPayload(await res.json(), link.handle);
  } catch {
    // Offline, blocked, rate-limited, or the endpoint changed shape — the
    // caller falls back to the by-hand flow.
    return null;
  }
}
