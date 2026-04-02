// app/lib/publicMedia.ts
/**
 * Canonical adapter that converts the public API payload (videoSocial / videos)
 * into the simple MediaData shape expected by <PublicMedia />.
 *
 * Extremely defensive: supports legacy shapes:
 * - localVideos [{ id, title, publicUrl }]
 * - uploadedVideos / uploads / videoFiles (array of url|string|{url,publicUrl,title})
 * - externalVideos [{ id, title, url }]
 * - links / videoLinks (array of url|string|{url,title})
 * - social: { xHandle, instagramHandle, youtubeChannelUrl }
 * - or direct urls: xUrl / instagramUrl / youtubeUrl / youtubeChannel
 */

export type MediaData = {
  email?: string | null;
  phone?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  chatUrl?: string | null;

  gameChangerUrl?: string | null;
  maxPrepsUrl?: string | null;
  rapsodoUrl?: string | null;
  trackmanUrl?: string | null;
  pocketRadarUrl?: string | null;

  uploadedVideos?: { url: string; title?: string | null }[];
  externalVideos?: { url: string; title?: string | null }[];
};

type VideoSocialPayload = any;

function normArray<T = any>(x: any): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter(Boolean);
  return [x].filter(Boolean);
}

function toEntry(x: any): { url: string; title?: string | null } | null {
  if (!x) return null;
  if (typeof x === "string") return x.trim() ? { url: x.trim(), title: null } : null;
  const url = String(x?.url || x?.publicUrl || "").trim();
  if (!url) return null;
  const title = x?.title ?? x?.name ?? null;
  return { url, title };
}

function dedupeByUrl(list: { url: string; title?: string | null }[]) {
  const seen = new Set<string>();
  return list.filter((v) => (seen.has(v.url) ? false : (seen.add(v.url), true)));
}

function handleToUrl(handle?: string | null, base?: string) {
  const h = (handle || "").trim();
  if (!h) return null;
  const clean = h.replace(/^@+/, "");
  return base ? `${base}${clean}` : null;
}

export function toPublicMedia(
  input: VideoSocialPayload,
  opts?: { email?: string | null; phone?: string | null; chatUrl?: string | null }
): MediaData {
  const payload = input || {};

  // ---- SOCIAL ----
  const xFromHandle = handleToUrl(payload?.social?.xHandle, "https://twitter.com/");
  const igFromHandle = handleToUrl(payload?.social?.instagramHandle, "https://instagram.com/");
  const ytFromHandle = (payload?.social?.youtubeChannelUrl || "").trim() || null;

  const xUrl: string | null =
    payload?.xUrl?.trim?.() ||
    payload?.twitter?.trim?.() ||
    payload?.x?.trim?.() ||
    payload?.social?.xUrl?.trim?.() ||
    xFromHandle ||
    null;

  const instagramUrl: string | null =
    payload?.instagramUrl?.trim?.() ||
    payload?.instagram?.trim?.() ||
    payload?.social?.instagramUrl?.trim?.() ||
    igFromHandle ||
    null;

  const youtubeUrl: string | null =
    payload?.youtubeUrl?.trim?.() ||
    payload?.youtubeChannel?.trim?.() ||
    payload?.social?.youtubeUrl?.trim?.() ||
    ytFromHandle ||
    null;

  const gameChangerUrl: string | null =
    payload?.gameChangerUrl?.trim?.() ||
    payload?.gamechangerUrl?.trim?.() ||
    payload?.social?.gameChangerUrl?.trim?.() ||
    payload?.social?.gamechangerUrl?.trim?.() ||
    null;

  const maxPrepsUrl: string | null =
    payload?.maxPrepsUrl?.trim?.() ||
    payload?.maxprepsUrl?.trim?.() ||
    payload?.social?.maxPrepsUrl?.trim?.() ||
    payload?.social?.maxprepsUrl?.trim?.() ||
    null;

  const rapsodoUrl: string | null =
    payload?.rapsodoUrl?.trim?.() ||
    payload?.social?.rapsodoUrl?.trim?.() ||
    null;

  const trackmanUrl: string | null =
    payload?.trackmanUrl?.trim?.() ||
    payload?.trackManUrl?.trim?.() ||
    payload?.social?.trackmanUrl?.trim?.() ||
    payload?.social?.trackManUrl?.trim?.() ||
    null;

  const pocketRadarUrl: string | null =
    payload?.pocketRadarUrl?.trim?.() ||
    payload?.pocketradarUrl?.trim?.() ||
    payload?.social?.pocketRadarUrl?.trim?.() ||
    payload?.social?.pocketradarUrl?.trim?.() ||
    null;

  // ---- UPLOADED / LOCAL ----
  const localA = normArray(payload?.localVideos).map(toEntry).filter(Boolean) as { url: string; title?: string | null }[];

  // Legacy: uploadedVideos / uploads / videoFiles (string or {url/publicUrl,title})
  const legacyUploads = [
    ...normArray(payload?.uploadedVideos),
    ...normArray(payload?.uploads),
    ...normArray(payload?.videoFiles),
  ]
    .map(toEntry)
    .filter(Boolean) as { url: string; title?: string | null }[];

  const uploadedVideos = dedupeByUrl([...localA, ...legacyUploads]);

  // ---- EXTERNAL ----
  const extA = normArray(payload?.externalVideos)
    .map((e: any) => ({ url: String(e?.url || "").trim(), title: e?.title ?? null }))
    .filter((e) => !!e.url);

  const legacyLinks = [
    ...normArray(payload?.links),
    ...normArray(payload?.videoLinks),
  ]
    .map(toEntry)
    .filter(Boolean) as { url: string; title?: string | null }[];

  const externalVideos = dedupeByUrl([...extA, ...legacyLinks]);

  return {
    email: opts?.email ?? null,
    phone: opts?.phone ?? null,
    chatUrl: (opts?.chatUrl ?? payload?.chatUrl ?? payload?.social?.chatUrl ?? null) || null,
    xUrl,
    instagramUrl,
    youtubeUrl,
    gameChangerUrl,
    maxPrepsUrl,
    rapsodoUrl,
    trackmanUrl,
    pocketRadarUrl,
    uploadedVideos,
    externalVideos,
  };
}
