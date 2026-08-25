// app/components/public/PublicMedia.tsx
"use client";

import * as React from "react";
import ContactActionRow from "@/app/components/public/ContactActionRow";

/** ---------------- shared types ---------------- */
export type MediaLink = {
  url: string;
  title?: string | null;
};

export type MediaData = {
  // connect
  email?: string | null;
  phone?: string | null;

  // social / external profiles
  xUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  chatUrl?: string | null;

  gameChangerUrl?: string | null;
  maxPrepsUrl?: string | null;
  rapsodoUrl?: string | null;
  trackmanUrl?: string | null;
  pocketRadarUrl?: string | null;

  // videos
  uploadedVideos?: { url: string; title?: string | null; category?: string | null }[];
  externalVideos?: { url: string; title?: string | null }[];
};

/** When the caller passes the dashboard-saved payload directly */
export type VideoSocialPayload = {
  externalVideos: {
    id: string;
    title?: string;
    url: string;
    source: "youtube" | "vimeo" | "mp4" | "gamechanger" | "unknown";
    addedAt: number;
  }[];
  localVideos: {
    id: string;
    title?: string;
    publicUrl: string;
    fileType: string;
    fileSize: number;
    addedAt: number;
    category?: "Hitting" | "Fielding" | "Pitching" | "Baserunning" | null;
  }[];
  social: {
    xHandle?: string;
    instagramHandle?: string;
    youtubeChannelUrl?: string;
    gameChangerUrl?: string;
    maxPrepsUrl?: string;
    rapsodoUrl?: string;
    trackmanUrl?: string;
    pocketRadarUrl?: string;
  };
  primary: { kind: "local" | "external"; id: string } | null;
};

type BaseProps = {
  title?: string;

  // match section styling tokens from the rest of the page
  cardStyle?: React.CSSProperties;
  h2Style?: React.CSSProperties;
  pillStyle?: React.CSSProperties;

  /** Primary item’s URL to feature as a hero + badge */
  primaryUrl?: string | null;

  /** If false, do not render the primary hero card at the top */
  showPrimaryHero?: boolean;

  /** If true, hide the primary item from the grids to avoid duplication (default: true) */
  hidePrimaryInGrid?: boolean;

  /** If true, render only the primary hero and suppress the other grids */
  showOnlyPrimary?: boolean;

  /** If true, hide the connect/social icon row */
  hideConnectRow?: boolean;
};

type Props =
  | (BaseProps & {
      /** Preferred: pass a ready-to-render public media object */
      media: MediaData;
    })
  | (BaseProps & {
      /** Convenience: pass the payload we save on the dashboard + optional direct connects */
      payload: VideoSocialPayload;
      email?: string | null;
      phone?: string | null;
      chatUrl?: string | null;
    });

/** ---------------- helpers ---------------- */
function normArray<T = any>(x: any): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter(Boolean);
  return [x].filter(Boolean);
}

function fileNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || url;
    const qsName = u.searchParams.get("filename");
    return qsName || last;
  } catch {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1] || url;
  }
}

function isMovLike(u: string) {
  try {
    const ext = u.split("?")[0].split(".").pop()?.toLowerCase() || "";
    return ext === "mov" || ext === "m4v";
  } catch {
    return false;
  }
}

const isYouTube = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)youtube\.com$/i.test(hostname) || /(^|\.)youtu\.be$/i.test(hostname);
  } catch {
    return false;
  }
};

const youTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (/youtu\.be$/i.test(u.hostname)) {
      return u.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (/youtube\.com$/i.test(u.hostname)) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") return parts[1] || null;
    }
    return null;
  } catch {
    return null;
  }
};

const isVimeo = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)vimeo\.com$/i.test(hostname);
  } catch {
    return false;
  }
};

const vimeoId = (url: string): string | null => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "video");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    const last = parts[parts.length - 1];
    return /^\d+$/.test(last) ? last : null;
  } catch {
    return null;
  }
};

const isDirectVideoFile = (url: string) => {
  const clean = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(clean);
};

const guessVideoType = (url: string): string | undefined => {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov" || ext === "m4v") return "video/quicktime";
  if (ext === "ogg" || ext === "ogv") return "video/ogg";
  return undefined;
};

function sameUrl(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  try {
    const strip = (u: string) => u.replace(/^https?:\/\/[^/]+/i, "");
    return decodeURIComponent(strip(a.trim())) === decodeURIComponent(strip(b.trim()));
  } catch {
    return a.trim() === b.trim();
  }
}

function dedupeByUrl<T extends { url: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const key = (() => {
      try {
        const u = new URL(it.url, "http://x");
        return decodeURIComponent(u.pathname + u.search);
      } catch {
        return it.url.trim();
      }
    })();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

/** Map dashboard payload → public MediaData */
function payloadToMediaData(
  payload: VideoSocialPayload,
  opts?: { email?: string | null; phone?: string | null; chatUrl?: string | null }
): MediaData {
  const uploadedVideos =
    payload.localVideos?.filter((v) => !!v.publicUrl).map((v) => ({
      url: v.publicUrl,
      title: v.title,
      category: (v as any).category ?? null,
    })) ?? [];
  const externalVideos = payload.externalVideos?.map((v) => ({ url: v.url, title: v.title })) ?? [];

  const xHandle = payload.social?.xHandle?.trim();
  const igHandle = payload.social?.instagramHandle?.trim();
  const ytChannel = payload.social?.youtubeChannelUrl?.trim();

  const gameChangerUrl = payload.social?.gameChangerUrl?.trim() || null;
  const maxPrepsUrl = payload.social?.maxPrepsUrl?.trim() || null;
  const rapsodoUrl = payload.social?.rapsodoUrl?.trim() || null;
  const trackmanUrl = payload.social?.trackmanUrl?.trim() || null;
  const pocketRadarUrl = payload.social?.pocketRadarUrl?.trim() || null;

  const xUrl = xHandle ? `https://twitter.com/${xHandle.replace(/^@+/, "")}` : null;
  const instagramUrl = igHandle ? `https://instagram.com/${igHandle.replace(/^@+/, "")}` : null;
  const youtubeUrl = ytChannel || null;

  return {
    email: opts?.email ?? null,
    phone: opts?.phone ?? null,
    chatUrl: opts?.chatUrl ?? null,
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

/** ---------- Reusable note shown under <video> elements ---------- */
const VideoCompatibilityNote: React.FC = () => (
  <div
    style={{
      marginTop: 6,
      fontSize: 12,
      color: "#6b7280",
      fontStyle: "italic",
      lineHeight: 1.4,
    }}
  >
    Some browsers can’t play certain .MOV QuickTime codecs inline. If playback fails, use <strong>Open Video File</strong>.
  </div>
);

/** ---------------- component ---------------- */
export default function PublicMedia(props: Props) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const media: MediaData = (() => {
    if ("media" in props) return props.media || {};
    if ("payload" in props) {
      return payloadToMediaData(props.payload, {
        email: props.email,
        phone: props.phone,
        chatUrl: props.chatUrl,
      });
    }
    return {};
  })();

  const {
    uploadedVideos = [],
    externalVideos = [],
  } = media || {};

  const title = ("title" in props && props.title) || "Videos";
  const cardStyle =
    ("cardStyle" in props && props.cardStyle) || ("cardStyle" in (props as any) && (props as any).cardStyle);
  const h2Style =
    ("h2Style" in props && props.h2Style) || ("h2Style" in (props as any) && (props as any).h2Style);
  const pillStyle =
    ("pillStyle" in props && props.pillStyle) || ("pillStyle" in (props as any) && (props as any).pillStyle);
  const primaryUrl = ("primaryUrl" in props && props.primaryUrl) || null;
  const showPrimaryHero =
    ("showPrimaryHero" in props ? (props as any).showPrimaryHero : undefined) ?? true;
  const hidePrimaryInGrid =
    ("hidePrimaryInGrid" in props ? (props as any).hidePrimaryInGrid : undefined) ?? true;
  const showOnlyPrimary =
    ("showOnlyPrimary" in props ? (props as any).showOnlyPrimary : undefined) ?? false;
  const hideConnectRow =
    ("hideConnectRow" in props ? (props as any).hideConnectRow : undefined) ?? false;

  const safeCard: React.CSSProperties = {
    marginTop: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    overflow: "hidden",
    ...(cardStyle || {}),
  };

  const safeH2: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    ...(h2Style || {}),
  };

  const pill: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "5px 10px",
    whiteSpace: "nowrap",
    ...(pillStyle || {}),
  };

  const mediaCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: isMobile ? 8 : 10,
  background: "#ffffff",
  display: "grid",
  gap: 8,
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};

const mediaTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#0f172a",
  fontSize: isMobile ? 13 : 14,
  lineHeight: 1.25,
  minWidth: 0,
  maxWidth: "100%",
  overflow: isMobile ? "hidden" : "visible",
  textOverflow: isMobile ? "ellipsis" : "clip",
  whiteSpace: isMobile ? "nowrap" : "normal",
  overflowWrap: isMobile ? "normal" : "anywhere",
  wordBreak: isMobile ? "normal" : "break-word",
};

const responsiveVideoShell: React.CSSProperties = {
  position: "relative",
  paddingTop: "56.25%",
  borderRadius: 8,
  overflow: "hidden",
  background: "#111",
  width: "100%",
  maxWidth: "100%",
};

  const primaryPillStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#0f172a",
    border: "1px solid #e5e7eb",
  };

  const LinkPill = ({
    href,
    children,
    title,
  }: {
    href: string;
    children: React.ReactNode;
    title?: string;
  }) => (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      style={{ ...pill, textDecoration: "none", display: "inline-block" }}
      title={title}
    >
      {children}
    </a>
  );

  const hasPrimary = !!primaryUrl;
  const primaryLabel = React.useMemo(() => {
    if (!primaryUrl) return null;
    const fromUploads = (uploadedVideos || []).find((v) => v.url && sameUrl(v.url, primaryUrl));
    const fromLinks = (externalVideos || []).find((v) => v.url && sameUrl(v.url, primaryUrl));
    const candidate = fromUploads || fromLinks;
    if (candidate?.title?.trim()) return candidate.title.trim();
    try {
      return fileNameFromUrl(primaryUrl);
    } catch {
      return primaryUrl;
    }
  }, [primaryUrl, uploadedVideos, externalVideos]);

  const renderPrimaryHero = () => {
    if (!primaryUrl) return null;

    if (isYouTube(primaryUrl)) {
      const id = youTubeId(primaryUrl);
      const origin = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
      const src = id
        ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${
            origin ? `&origin=${origin}` : ""
          }`
        : null;
      return src ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            background: "#ffffff",
          }}
        >
<div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              marginBottom: 8,
              gap: 8,
              minWidth: 0,
            }}
          >
<div
  style={{
    fontWeight: 900,
    fontSize: isMobile ? 14 : 16,
    color: "#0f172a",
    minWidth: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  }}
>
              {primaryLabel || "Primary Highlight"}
            </div>
            <span style={primaryPillStyle}>PRIMARY</span>
          </div>
<div style={responsiveVideoShell}>
            <iframe
              src={src}
              title={primaryLabel || "Primary Highlight"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                textDecoration: "none",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
                padding: "5px 10px",
                whiteSpace: "nowrap",
              }}
            >
              Open on YouTube
            </a>
          </div>
        </div>
      ) : null;
    }

    if (isVimeo(primaryUrl)) {
      const id = vimeoId(primaryUrl);
      const src = id ? `https://player.vimeo.com/video/${id}` : null;
      return src ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            background: "#ffffff",
          }}
        >
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 8,
    minWidth: 0,
  }}
>
<div
  style={{
    fontWeight: 900,
    fontSize: isMobile ? 14 : 16,
    color: "#0f172a",
    minWidth: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  }}
>
              {primaryLabel || "Primary Highlight"}
            </div>
            <span style={primaryPillStyle}>PRIMARY</span>
          </div>
<div style={responsiveVideoShell}>
            <iframe
              src={src}
              title={primaryLabel || "Primary Highlight"}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </div>
        </div>
      ) : null;
    }

    if (isDirectVideoFile(primaryUrl)) {
      const t = guessVideoType(primaryUrl);
      return (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            background: "#ffffff",
          }}
        >
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
    marginBottom: 8,
  }}
>
<div
  style={{
    fontWeight: 900,
    fontSize: isMobile ? 14 : 16,
    color: "#0f172a",
    minWidth: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  }}
>
              {primaryLabel || "Primary Highlight"}
            </div>
            <span style={primaryPillStyle}>PRIMARY</span>
          </div>

          <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#111" }}>
            <video
              controls
              playsInline
              preload="metadata"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            >
              {isMovLike(primaryUrl)
                ? <source src={primaryUrl} />
                : (t ? <source src={primaryUrl} type={t} /> : <source src={primaryUrl} />)}
              Your browser can’t play this video.
            </video>
          </div>

          <VideoCompatibilityNote />

          <div style={{ marginTop: 8 }}>
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 13,
                color: "#0f172a",
                background: "#e0f2fe",
                border: "1px solid #0ea5e9",
                borderRadius: 12,
                padding: "6px 10px",
              }}
            >
              Open Video File
            </a>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          background: "#ffffff",
        }}
      >
<div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 8,
            minWidth: 0,
            marginBottom: 8,
          }}
        >
<div
  style={{
    fontWeight: 900,
    fontSize: isMobile ? 14 : 16,
    color: "#0f172a",
    minWidth: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  }}
>
            {primaryLabel || "Primary Highlight"}
          </div>
          <span style={primaryPillStyle}>PRIMARY</span>
        </div>
        <a
          href={primaryUrl!}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...pill, textDecoration: "none" }}
        >
          Open Highlight
        </a>
      </div>
    );
  };

  const isPrimary = (url: string | undefined | null) => sameUrl(url, primaryUrl);

  const uploadsAll = dedupeByUrl(normArray<any>(uploadedVideos));
  const [activeUploadedCategory, setActiveUploadedCategory] = React.useState<"Hitting" | "Fielding" | "Pitching" | "Baserunning">("Hitting");
  const linksAll = dedupeByUrl(normArray<MediaLink>(externalVideos));

  const uploadsBase =
    hidePrimaryInGrid && primaryUrl ? uploadsAll.filter((v: any) => !isPrimary(v.url)) : uploadsAll;

    const uploads = uploadsBase.filter((v: any) => {
    const cat = v?.category ?? null;
    return cat === activeUploadedCategory;
  });
  const links =
    hidePrimaryInGrid && primaryUrl ? linksAll.filter((v) => !isPrimary(v.url)) : linksAll;

  return (
    <section style={safeCard}>
      <h2 style={safeH2}>{title}</h2>

      {!hideConnectRow ? (
        <div style={{ marginTop: 10 }}>
          <ContactActionRow
            email={media.email}
            phoneDigits={media.phone}
            xUrl={media.xUrl}
            instagramUrl={media.instagramUrl}
            youtubeUrl={media.youtubeUrl}
            gameChangerUrl={media.gameChangerUrl}
            maxPrepsUrl={media.maxPrepsUrl}
            rapsodoUrl={media.rapsodoUrl}
            trackmanUrl={media.trackmanUrl}
            pocketRadarUrl={media.pocketRadarUrl}
            chatUrl={media.chatUrl}
          />
        </div>
      ) : null}

      {hasPrimary && showPrimaryHero && renderPrimaryHero()}

      {!showOnlyPrimary ? (
        <>
          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#334155", fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
              Uploaded Videos
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {(["Hitting", "Fielding", "Pitching", "Baserunning"] as const).map((cat) => {
                const active = activeUploadedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveUploadedCategory(cat)}
                    style={{
                      fontSize: 12,
                      fontWeight: active ? 900 : 700,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: active ? "1px solid #0ea5e9" : "1px solid #cbd5e1",
                      background: active ? "#e0f2fe" : "#fff",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {uploads.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                {uploadsAll.length > 0 && hidePrimaryInGrid && hasPrimary
                  ? "Primary highlight is from uploads (hidden here)."
                  : "No videos available."}
              </div>
            ) : (
              <div
  style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))",
    gap: 12,
    minWidth: 0,
    maxWidth: "100%",
  }}
>
                {uploads.map((v, idx) => {
                  const url = v.url;
                  const label = (v.title?.trim() || fileNameFromUrl(url)) ?? "Video";
                  const type = guessVideoType(url);

                  return (
                    <div
                      key={`upload-${idx}-${url}`}
                      style={mediaCardStyle}
                      aria-roledescription="Video card"
                    >
                      <div style={mediaTitleStyle}>{label}</div>

<div style={responsiveVideoShell}>
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            display: "block",
                          }}
                        >
                          {type ? <source src={url} type={type} /> : null}
                          <source src={url} />
                          Your browser can’t play this video.
                        </video>
                      </div>

                      <VideoCompatibilityNote />

                      <div style={{ marginTop: 8 }}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            textDecoration: "none",
                            background: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            borderRadius: 999,
                            color: "#475569",
                            fontSize: 13,
                            fontWeight: 700,
                            padding: "5px 10px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Open Video File
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#334155", fontSize: 13, fontWeight: 800, marginBottom: 6 }}>External Videos</div>

            {links.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                {linksAll.length > 0 && hidePrimaryInGrid && hasPrimary
                  ? "Primary highlight is from external links (hidden here)."
                  : "No Videos available."}
              </div>
            ) : (
              <div
  style={{
    display: "grid",
    gridTemplateColumns: isMobile
  ? "1fr"
  : "repeat(2, minmax(0, 1fr))",
    gap: 12,
    minWidth: 0,
    maxWidth: "100%",
  }}
>
                {links.map((v, idx) => {
                  const url = v.url;
                  const label = v.title?.trim() || url;

                  if (isYouTube(url)) {
                    const id = youTubeId(url);
                    const origin =
                      typeof window !== "undefined"
                        ? encodeURIComponent(window.location.origin)
                        : "";
                    const src = id
                      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${
                          origin ? `&origin=${origin}` : ""
                        }`
                      : null;

                    return (
                      <div
                        key={`ext-${idx}-${url}`}
                        style={mediaCardStyle}
                        aria-roledescription="Video card"
                      >
                        <div style={mediaTitleStyle}>{label}</div>

                        {src ? (
                          <div style={responsiveVideoShell}>
                            <iframe
                              src={src}
                              title={label}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allowFullScreen
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                border: 0,
                                borderRadius: 8,
                                background: "#111",
                              }}
                            />
                          </div>
                        ) : (
                          <LinkPill href={url}>Open Video</LinkPill>
                        )}

                        <div style={{ marginTop: 8 }}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              textDecoration: "none",
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: 999,
                              color: "#475569",
                              fontSize: 13,
                              fontWeight: 700,
                              padding: "5px 10px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Open on YouTube
                          </a>
                        </div>
                      </div>
                    );
                  }

                  if (isVimeo(url)) {
                    const id = vimeoId(url);
                    const src = id ? `https://player.vimeo.com/video/${id}` : null;
                    return (
                      <div
                        key={`ext-${idx}-${url}`}
                        style={mediaCardStyle}
                        aria-roledescription="Video card"
                      >
                        <div style={mediaTitleStyle}>{label}</div>
                        {src ? (
                          <div style={responsiveVideoShell}>
                            <iframe
                              src={src}
                              title={label}
                              allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                              allowFullScreen
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                border: 0,
                                borderRadius: 8,
                                background: "#111",
                              }}
                            />
                          </div>
                        ) : (
                          <LinkPill href={url}>Open Video</LinkPill>
                        )}
                      </div>
                    );
                  }

                  if (isDirectVideoFile(url)) {
                    const type = guessVideoType(url);
                    return (
                      <div
                        key={`ext-${idx}-${url}`}
                        style={mediaCardStyle}
                        aria-roledescription="Video card"
                      >
                        <div style={mediaTitleStyle}>{label}</div>
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          style={{
                            width: "100%",
                            aspectRatio: "16/9",
                            height: "auto",
                            borderRadius: 8,
                            display: "block",
                            background: "#111",
                          }}
                        >
                          {type ? <source src={url} type={type} /> : <source src={url} />}
                          Your browser can’t play this video.
                        </video>

                        <VideoCompatibilityNote />

                        <div style={{ marginTop: 8 }}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              textDecoration: "none",
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: 999,
                              color: "#475569",
                              fontSize: 13,
                              fontWeight: 700,
                              padding: "5px 10px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Open Video File
                          </a>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`ext-${idx}-${url}`}
                      style={mediaCardStyle}
                      aria-roledescription="Video card"
                    >
                      <div style={mediaTitleStyle}>{label}</div>
                      <LinkPill href={url}>Open Video</LinkPill>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}