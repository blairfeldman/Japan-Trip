/**
 * What can be read off a shared link without any network call or backend.
 * The handle is right there in a TikTok/Instagram URL, so a pin saved from a
 * share can at least be credited properly and linked back to the video.
 */
export interface SharedLink {
  url: string;
  platform: 'TikTok' | 'Instagram' | 'link';
  handle: string;
}

export function describeSharedLink(raw: string): SharedLink {
  const url = raw.trim();

  const tiktok = url.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (tiktok) return { url, platform: 'TikTok', handle: `@${tiktok[1]}` };
  if (/tiktok\.com|vm\.tiktok/i.test(url)) return { url, platform: 'TikTok', handle: '@tiktok' };

  const insta = url.match(/instagram\.com\/(?:p|reel|reels)\/[^/?#]+/i);
  if (insta) return { url, platform: 'Instagram', handle: '@instagram' };
  const instaUser = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (instaUser) return { url, platform: 'Instagram', handle: `@${instaUser[1]}` };

  return { url, platform: 'link', handle: '@shared' };
}
