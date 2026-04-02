// app/dashboard/player/profile/TabVideoSocial.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";

/** ---------- NEW: payload & handle types for atomic save ---------- */
export type PlanTier = "Redshirt" | "Walk-On" | "All-American" | "Teams";

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

export type VideoSocialHandle = { getPayload: () => VideoSocialPayload };

/**
 * Tab 6: Video / Social Media (LOCAL DEV UPLOADS)
 */

// ---------- Types ----------
type ExternalVideo = {
  id: string;
  title?: string;
  url: string;
  source: "youtube" | "vimeo" | "mp4" | "gamechanger" | "unknown";
  addedAt: number;
};

type UploadStatus = "queued" | "uploading" | "done" | "error";

type LocalVideo = {
  id: string;
  title?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  previewUrl?: string;
  publicUrl?: string;
  progress?: number;
  status?: UploadStatus;
  errorMsg?: string;
  addedAt: number;
};

type SocialLinks = {
  xHandle?: string;
  instagramHandle?: string;
  youtubeChannelUrl?: string;

  gameChangerUrl?: string;
  maxPrepsUrl?: string;
  rapsodoUrl?: string;
  trackmanUrl?: string;
  pocketRadarUrl?: string;
};

type PrimaryRef = { kind: "local" | "external"; id: string } | null;

type VideoSocialState = {
  externalVideos: ExternalVideo[];
  localVideos: LocalVideo[];
  social: SocialLinks;
  primary?: PrimaryRef;
};

// ---------- Plan rules ----------
const PLAN_RULES: Record<
  PlanTier,
  {
    enabled: boolean;
    canUploadLocal: boolean;
    maxLocal: number | "unlimited";
    canExternal: boolean;
    canSocial: boolean;
  }
> = {
  Redshirt: { enabled: false, canUploadLocal: false, maxLocal: 0, canExternal: false, canSocial: false },
  "Walk-On": { enabled: true, canUploadLocal: true, maxLocal: 3, canExternal: true, canSocial: true },
  "All-American": { enabled: true, canUploadLocal: true, maxLocal: "unlimited", canExternal: true, canSocial: true },
  Teams: { enabled: true, canUploadLocal: true, maxLocal: "unlimited", canExternal: true, canSocial: true },
};

// ---------- Helpers ----------
const KEY_PREFIX = "scoutlineVideoSocial";
function storageKey(email?: string | null) {
  const safe = (email ?? "anon").toLowerCase().trim();
  return `${KEY_PREFIX}:${safe}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MAX_MB = 500;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/ogg"];

function normalizeHandle(handle?: string) {
  if (!handle) return "";
  return handle.replace(/^@+/, "").trim();
}

function isValidUrlMaybe(u: string) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function classifyExternal(url: string): ExternalVideo["source"] {
  const u = url.trim();
  if (/youtube\.com\/watch\?v=|youtu\.be\//i.test(u)) return "youtube";
  if (/vimeo\.com\/\d+/i.test(u)) return "vimeo";
  if (/\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i.test(u)) return "mp4";
  if (/gamechanger\.com|gc\.com/i.test(u)) return "gamechanger";
  return "unknown";
}

/* ---------- NEW: robust YouTube/Vimeo + file helpers (fixes Error 153) ---------- */
const isYouTubeUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)youtube\.com$/i.test(hostname) || /(^|\.)youtu\.be$/i.test(hostname);
  } catch {
    return false;
  }
};

const getYouTubeId = (url: string): string | null => {
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

const isVimeoUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)vimeo\.com$/i.test(hostname);
  } catch {
    return false;
  }
};

const getVimeoId = (url: string): string | null => {
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

const isDirectVideoFile = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test((url || "").split("?")[0].toLowerCase());

const guessVideoType = (url: string): string | undefined => {
  const ext = (url || "").split("?")[0].split(".").pop()?.toLowerCase() || "";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov" || ext === "m4v") return "video/quicktime";
  if (ext === "ogg" || ext === "ogv") return "video/ogg";
  return undefined;
};

/* ---------- UPDATED: embed renderer for external videos ---------- */
function embedForExternalVideo(v: ExternalVideo): React.ReactNode {
  const { url } = v;
  const label = v.title?.trim() || url;

  // Responsive wrapper for iframes/videos
  const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      style={{
        position: "relative",
        paddingTop: "56.25%",
        borderRadius: 12,
        overflow: "hidden",
        background: "#111",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );

  // Prefer robust detection rather than only trusting v.source
  if (isYouTubeUrl(url)) {
    const id = getYouTubeId(url);
    const origin = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
    const src = id
      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${
          origin ? `&origin=${origin}` : ""
        }`
      : null;

    if (src) {
      return (
        <Wrap>
          <iframe
            src={src}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        </Wrap>
      );
    }
  }

  if (isVimeoUrl(url)) {
    const id = getVimeoId(url);
    const src = id ? `https://player.vimeo.com/video/${id}` : null;
    if (src) {
      return (
        <Wrap>
          <iframe
            src={src}
            title={label}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        </Wrap>
      );
    }
  }

  if (isDirectVideoFile(url)) {
    const t = guessVideoType(url);
    return (
      <Wrap>
        <video controls preload="metadata" playsInline style={{ width: "100%", height: "100%", display: "block" }}>
          {t ? <source src={url} type={t} /> : <source src={url} />}
          Your browser can’t play this video.
        </video>
      </Wrap>
    );
  }

  // Fallback: just link out (styled as a pill button)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
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
      aria-label={`Open ${label}`}
    >
      Open Video
    </a>
  );
}

// ---------- Persistence (localStorage for now) ----------
function loadState(email?: string | null): VideoSocialState {
  const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey(email)) : null;
  if (!raw) return { externalVideos: [], localVideos: [], social: {}, primary: null };
try {
  const parsed = JSON.parse(raw) as VideoSocialState;
  return {
    ...parsed,
    externalVideos: Array.isArray(parsed?.externalVideos) ? parsed.externalVideos : [],
    localVideos: Array.isArray(parsed?.localVideos) ? parsed.localVideos : [],
    social: parsed?.social ?? {},
    primary: parsed?.primary ?? null,
  };
} catch {
  return { externalVideos: [], localVideos: [], social: {}, primary: null };
}
}
function saveState(email: string | null | undefined, state: VideoSocialState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(email), JSON.stringify(state));
}

// ---------- Component ----------
const TabVideoSocial = React.forwardRef<VideoSocialHandle, { email?: string | null; planTier?: PlanTier }>(
  function TabVideoSocial(props, ref) {
    const planTier: PlanTier = props.planTier ?? "All-American";
    const PLAN = PLAN_RULES[planTier];

    // ---- Stable storage key + hydration guard + anon→email migration ----
    const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
    const prevKeyRef = useRef<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
      const fromProp = (props.email ?? "").trim() || null;
      const fromLS =
        typeof window !== "undefined" ? (localStorage.getItem("scoutlineEmail") || "").trim() || null : null;
      const key = fromProp ?? fromLS ?? "anon";
      setResolvedEmail(key);
    }, [props.email]);

    useEffect(() => {
      if (!resolvedEmail) return;
      const prevKey = prevKeyRef.current;
      if (prevKey && prevKey !== resolvedEmail) {
        const prevState = loadState(prevKey);
        const newState = loadState(resolvedEmail);
        const newIsEmpty =
          newState.externalVideos.length === 0 &&
          newState.localVideos.length === 0 &&
          Object.keys(newState.social).length === 0 &&
          !newState.primary;

        if (newIsEmpty) {
          saveState(resolvedEmail, prevState); // migrate existing anon data
        }
      }
      prevKeyRef.current = resolvedEmail;
    }, [resolvedEmail]);

    const [state, setState] = useState<VideoSocialState>({
      externalVideos: [],
      localVideos: [],
      social: {},
      primary: null,
    });

    useEffect(() => {
      if (!resolvedEmail) return;
      const loaded = loadState(resolvedEmail);
      setState(loaded);
      setHydrated(true);
    }, [resolvedEmail]);

    useEffect(() => {
      if (!hydrated || !resolvedEmail) return;
      saveState(resolvedEmail, state);
    }, [state, hydrated, resolvedEmail]);

    // ----- UI messaging -----
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ----- External Videos -----
    const [extUrl, setExtUrl] = useState("");
    const [extTitle, setExtTitle] = useState("");

    function addExternalVideo() {
      if (!PLAN.canExternal) {
        setErr(`${planTier} plan cannot add external videos.`);
        return;
      }
      setErr(null);
      const url = extUrl.trim();
      if (!isValidUrlMaybe(url)) {
        setErr("Please enter a valid http(s) URL.");
        return;
      }
      const v: ExternalVideo = {
        id: uid(),
        title: extTitle.trim() || undefined,
        url,
        source: classifyExternal(url),
        addedAt: Date.now(),
      };
      setState((s) => ({ ...s, externalVideos: [v, ...s.externalVideos] }));
      setExtUrl("");
      setExtTitle("");
      flashMsg("External video added.");
    }

    function removeExternal(id: string) {
      setState((s) => {
        const wasPrimary = s.primary?.kind === "external" && s.primary.id === id;
        const next = { ...s, externalVideos: s.externalVideos.filter((v) => v.id !== id) };
        if (wasPrimary) next.primary = null;
        return next;
      });
    }

    // ----- Video uploads (POST /api/upload/video) -----
    async function uploadLocalDev(file: File, draftId: string) {
      return new Promise<void>((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);
        form.append("userSlug", resolvedEmail || "player");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload/video", true);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setState((s) => ({
              ...s,
              localVideos: s.localVideos.map((lv) =>
                lv.id === draftId ? { ...lv, progress: pct, status: "uploading" } : lv
              ),
            }));
          }
        };

        xhr.onload = () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const json = JSON.parse(xhr.responseText) as {
                ok: boolean;
                files?: { publicUrl: string; filename: string; size: number; type: string }[];
                error?: string;
              };
              if (!json.ok || !json.files?.length) {
                throw new Error(json.error || "Upload failed");
              }
              const { publicUrl } = json.files[0];

              setState((s) => ({
                ...s,
                localVideos: s.localVideos.map((lv) =>
                  lv.id === draftId ? { ...lv, publicUrl, progress: 100, status: "done" } : lv
                ),
              }));
              resolve();
            } else {
              reject(new Error(`Upload failed (status ${xhr.status})`));
            }
          } catch (e: any) {
            reject(e);
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(form);
      });
    }

    // Entire choose→validate→draft→upload flow
    async function onChooseLocalVideos(files: FileList | null) {
      if (!files || files.length === 0) return;
      if (!PLAN.canUploadLocal) {
        setErr(`${planTier} plan cannot upload local videos.`);
        return;
      }

      // enforce plan limit
      const existing = state.localVideos.length;
      const max = PLAN.maxLocal === "unlimited" ? Number.POSITIVE_INFINITY : PLAN.maxLocal;
      const remainingSlots = Math.max(0, max - existing);

      const rejected: string[] = [];
      const pickedAll = Array.from(files).filter((f) => {
        const sizeMB = f.size / (1024 * 1024);
        const okType = ALLOWED_VIDEO_TYPES.includes(f.type);
        const okSize = sizeMB <= MAX_MB;
        if (!okType || !okSize) {
          rejected.push(`${f.name} (${okType ? `${sizeMB.toFixed(1)}MB > ${MAX_MB}MB` : f.type || "unknown type"})`);
          return false;
        }
        return true;
      });

      const picked = pickedAll.slice(0, remainingSlots || pickedAll.length);

      // Drafts for optimistic UI
      const drafts: LocalVideo[] = picked
        .filter((f) => f.type.startsWith("video/"))
        .map((f) => ({
          id: uid(),
          title: f.name.replace(/\.[^.]+$/, ""),
          fileName: f.name,
          fileSize: f.size,
          fileType: f.type,
          previewUrl: URL.createObjectURL(f),
          progress: 0,
          status: "queued",
          addedAt: Date.now(),
        }));

      const skippedCount = pickedAll.length - picked.length;
      const messages: string[] = [];
      if (rejected.length) messages.push(`Skipped (type/size): ${rejected.join("; ")}`);
      if (skippedCount > 0) messages.push(`Limit reached: only ${remainingSlots} slot(s) available for ${planTier}`);
      if (messages.length) {
        setErr(messages.join(" | "));
        setTimeout(() => setErr(null), 4000);
      }

      if (!drafts.length) return;

      setState((s) => ({ ...s, localVideos: [...drafts, ...s.localVideos] }));

      // Upload sequentially
      for (const draft of drafts) {
        const file = Array.from(files).find((f) => f.name === draft.fileName && f.size === draft.fileSize);
        if (!file) continue;

        try {
          setState((s) => ({
            ...s,
            localVideos: s.localVideos.map((lv) => (lv.id === draft.id ? { ...lv, status: "uploading" } : lv)),
          }));
          await uploadLocalDev(file, draft.id);
          flashMsg(`Uploaded: ${draft.fileName}`);
        } catch (e: any) {
          setState((s) => ({
            ...s,
            localVideos: s.localVideos.map((lv) =>
              lv.id === draft.id ? { ...lv, status: "error", errorMsg: e?.message || "Upload failed" } : lv
            ),
          }));
          setErr(`Upload failed for ${draft.fileName}: ${e?.message || "Unknown error"}`);
        }
      }
    }

    async function removeLocal(id: string) {
      setState((s) => {
        const wasPrimary = s.primary?.kind === "local" && s.primary.id === id;
        const target = s.localVideos.find((v) => v.id === id);
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
        const next: VideoSocialState = { ...s, localVideos: s.localVideos.filter((v) => v.id !== id) };
        if (wasPrimary) next.primary = null;
        return next;
      });

      // Best-effort: delete local file on server
      const target = state.localVideos.find((v) => v.id === id);
      const toDeleteUrl = target?.publicUrl;
      if (toDeleteUrl && toDeleteUrl.startsWith("/uploads/videos/")) {
        try {
          await fetch("/api/uploads/local/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicUrl: toDeleteUrl }),
          });
        } catch {}
      }
    }

    // ----- Reorder & Primary -----
    function moveLocal(id: string, dir: -1 | 1) {
      setState((s) => {
        const arr = s.localVideos.slice();
        const idx = arr.findIndex((i) => i.id === id);
        if (idx < 0) return s;
        const to = idx + dir;
        if (to < 0 || to >= arr.length) return s;
        const tmp = arr[idx];
        arr[idx] = arr[to];
        arr[to] = tmp;
        return { ...s, localVideos: arr };
      });
    }

    function moveExternal(id: string, dir: -1 | 1) {
      setState((s) => {
        const arr = s.externalVideos.slice();
        const idx = arr.findIndex((i) => i.id === id);
        if (idx < 0) return s;
        const to = idx + dir;
        if (to < 0 || to >= arr.length) return s;
        const tmp = arr[idx];
        arr[idx] = arr[to];
        arr[to] = tmp;
        return { ...s, externalVideos: arr };
      });
    }

    function setPrimary(kind: "local" | "external", id: string) {
      setState((s) => ({ ...s, primary: { kind, id } }));
      flashMsg("Set as primary highlight.");
    }

    function isPrimaryLocal(id: string) {
      return state.primary?.kind === "local" && state.primary.id === id;
    }
    function isPrimaryExternal(id: string) {
      return state.primary?.kind === "external" && state.primary.id === id;
    }

    // ----- Social -----
    const [xHandle, setXHandle] = useState(state.social.xHandle ?? "");
    const [igHandle, setIgHandle] = useState(state.social.instagramHandle ?? "");
    const [ytUrl, setYtUrl] = useState(state.social.youtubeChannelUrl ?? "");
    const [gameChangerUrl, setGameChangerUrl] = useState(state.social.gameChangerUrl ?? "");
    const [maxPrepsUrl, setMaxPrepsUrl] = useState(state.social.maxPrepsUrl ?? "");
    const [rapsodoUrl, setRapsodoUrl] = useState(state.social.rapsodoUrl ?? "");
    const [trackmanUrl, setTrackmanUrl] = useState(state.social.trackmanUrl ?? "");
    const [pocketRadarUrl, setPocketRadarUrl] = useState(state.social.pocketRadarUrl ?? "");
useEffect(() => {
  setXHandle(state.social.xHandle ?? "");
  setIgHandle(state.social.instagramHandle ?? "");
  setYtUrl(state.social.youtubeChannelUrl ?? "");

  setGameChangerUrl(state.social.gameChangerUrl ?? "");
  setMaxPrepsUrl(state.social.maxPrepsUrl ?? "");
  setRapsodoUrl(state.social.rapsodoUrl ?? "");
  setTrackmanUrl(state.social.trackmanUrl ?? "");
  setPocketRadarUrl(state.social.pocketRadarUrl ?? "");
}, [state.social]);

    // --- keep state.social in sync with the inputs so it persists between tab switches
    function onXChange(v: string) {
      setXHandle(v);
      setState((s) => ({ ...s, social: { ...s.social, xHandle: v } }));
    }
    function onIgChange(v: string) {
      setIgHandle(v);
      setState((s) => ({ ...s, social: { ...s.social, instagramHandle: v } }));
    }
function onYtChange(v: string) {
  setYtUrl(v);
  setState((s) => ({ ...s, social: { ...s.social, youtubeChannelUrl: v } }));
}
function onGameChangerChange(v: string) {
  setGameChangerUrl(v);
  setState((s) => ({ ...s, social: { ...s.social, gameChangerUrl: v } }));
}
function onMaxPrepsChange(v: string) {
  setMaxPrepsUrl(v);
  setState((s) => ({ ...s, social: { ...s.social, maxPrepsUrl: v } }));
}
function onRapsodoChange(v: string) {
  setRapsodoUrl(v);
  setState((s) => ({ ...s, social: { ...s.social, rapsodoUrl: v } }));
}
function onTrackmanChange(v: string) {
  setTrackmanUrl(v);
  setState((s) => ({ ...s, social: { ...s.social, trackmanUrl: v } }));
}
function onPocketRadarChange(v: string) {
  setPocketRadarUrl(v);
  setState((s) => ({ ...s, social: { ...s.social, pocketRadarUrl: v } }));
}

/* ---------- NEW: clear/remove social values ---------- */
function clearX() {
  setXHandle("");
  setState((s) => ({ ...s, social: { ...s.social, xHandle: undefined } }));
}
function clearIg() {
  setIgHandle("");
  setState((s) => ({ ...s, social: { ...s.social, instagramHandle: undefined } }));
}
function clearYt() {
  setYtUrl("");
  setState((s) => ({ ...s, social: { ...s.social, youtubeChannelUrl: undefined } }));
}
function clearGameChanger() {
  setGameChangerUrl("");
  setState((s) => ({ ...s, social: { ...s.social, gameChangerUrl: undefined } }));
}
function clearMaxPreps() {
  setMaxPrepsUrl("");
  setState((s) => ({ ...s, social: { ...s.social, maxPrepsUrl: undefined } }));
}
function clearRapsodo() {
  setRapsodoUrl("");
  setState((s) => ({ ...s, social: { ...s.social, rapsodoUrl: undefined } }));
}
function clearTrackman() {
  setTrackmanUrl("");
  setState((s) => ({ ...s, social: { ...s.social, trackmanUrl: undefined } }));
}
function clearPocketRadar() {
  setPocketRadarUrl("");
  setState((s) => ({ ...s, social: { ...s.social, pocketRadarUrl: undefined } }));
}

function saveSocial() {
      if (!PLAN.canSocial) {
        setErr(`${planTier} plan cannot save social profiles.`);
        return;
      }
      const next: SocialLinks = {
  xHandle: normalizeHandle(xHandle),
  instagramHandle: normalizeHandle(igHandle),
  youtubeChannelUrl: ytUrl.trim() || undefined,

  gameChangerUrl: gameChangerUrl.trim() || undefined,
  maxPrepsUrl: maxPrepsUrl.trim() || undefined,
  rapsodoUrl: rapsodoUrl.trim() || undefined,
  trackmanUrl: trackmanUrl.trim() || undefined,
  pocketRadarUrl: pocketRadarUrl.trim() || undefined,
};
      setState((s) => ({ ...s, social: next }));
      // reflect normalized values back into the inputs
      setXHandle(next.xHandle ?? "");
setIgHandle(next.instagramHandle ?? "");
setYtUrl(next.youtubeChannelUrl ?? "");
setGameChangerUrl(next.gameChangerUrl ?? "");
setMaxPrepsUrl(next.maxPrepsUrl ?? "");
setRapsodoUrl(next.rapsodoUrl ?? "");
setTrackmanUrl(next.trackmanUrl ?? "");
setPocketRadarUrl(next.pocketRadarUrl ?? "");
      flashMsg("Social links saved.");
    }

    const socialPreview = useMemo(() => {
      const links: { label: string; href: string }[] = [];
      const x = normalizeHandle(xHandle || state.social.xHandle);
      const ig = normalizeHandle(igHandle || state.social.instagramHandle);
      const yt = (ytUrl || state.social.youtubeChannelUrl)?.trim();
      const gc = (gameChangerUrl || state.social.gameChangerUrl)?.trim();
      const mp = (maxPrepsUrl || state.social.maxPrepsUrl)?.trim();
      const rap = (rapsodoUrl || state.social.rapsodoUrl)?.trim();
      const tm = (trackmanUrl || state.social.trackmanUrl)?.trim();
      const pr = (pocketRadarUrl || state.social.pocketRadarUrl)?.trim();

      if (x) links.push({ label: "Follow on X", href: `https://twitter.com/${x}` });
      if (ig) links.push({ label: "Follow on Instagram", href: `https://instagram.com/${ig}` });
      if (yt && isValidUrlMaybe(yt)) links.push({ label: "YouTube Channel", href: yt });
      if (gc && isValidUrlMaybe(gc)) links.push({ label: "GameChanger Profile", href: gc });
      if (mp && isValidUrlMaybe(mp)) links.push({ label: "MaxPreps Profile", href: mp });
      if (rap && isValidUrlMaybe(rap)) links.push({ label: "Rapsodo Profile", href: rap });
      if (tm && isValidUrlMaybe(tm)) links.push({ label: "TrackMan Profile", href: tm });
      if (pr && isValidUrlMaybe(pr)) links.push({ label: "Pocket Radar Profile", href: pr });

      return links;
    }, [xHandle, igHandle, ytUrl, gameChangerUrl, maxPrepsUrl, rapsodoUrl, trackmanUrl, pocketRadarUrl, state.social]);

    // ----- Flash Msg -----
    function flashMsg(text: string) {
      setMsg(text);
      setTimeout(() => setMsg(null), 1600);
    }

    // derived flags for UI
    const localCount = state.localVideos.length;
    const isUnlimited = PLAN.maxLocal === "unlimited";
    const maxLocalNum: number =
      isUnlimited ? Infinity : typeof PLAN.maxLocal === "number" ? PLAN.maxLocal : 0;

    const atLocalLimit = !isUnlimited && localCount >= maxLocalNum;
    const uploadsDisabled = !PLAN.canUploadLocal || atLocalLimit;

    /** ---------- NEW: expose atomic payload ---------- */
    useImperativeHandle(
      ref,
      (): VideoSocialHandle => ({
        getPayload: () => {
          // Only persist local videos that have a resolvable URL (upload completed)
          const locals = state.localVideos
            .filter((v) => !!v.publicUrl)
            .map((v) => ({
              id: v.id,
              title: v.title,
              publicUrl: v.publicUrl as string,
              fileType: v.fileType,
              fileSize: v.fileSize,
              addedAt: v.addedAt,
            }));

          const externals = state.externalVideos.map((v) => ({
            id: v.id,
            title: v.title,
            url: v.url,
            source: v.source,
            addedAt: v.addedAt,
          }));

          // Normalize social on the way out (reflect unsaved edits)
          const social: SocialLinks = {
  xHandle: normalizeHandle(xHandle || state.social.xHandle),
  instagramHandle: normalizeHandle(igHandle || state.social.instagramHandle),
  youtubeChannelUrl: (ytUrl || state.social.youtubeChannelUrl)?.trim() || undefined,

  gameChangerUrl: (gameChangerUrl || state.social.gameChangerUrl)?.trim() || undefined,
  maxPrepsUrl: (maxPrepsUrl || state.social.maxPrepsUrl)?.trim() || undefined,
  rapsodoUrl: (rapsodoUrl || state.social.rapsodoUrl)?.trim() || undefined,
  trackmanUrl: (trackmanUrl || state.social.trackmanUrl)?.trim() || undefined,
  pocketRadarUrl: (pocketRadarUrl || state.social.pocketRadarUrl)?.trim() || undefined,
};

          // Keep primary only if it still points at an existing item
          const primary: PrimaryRef = (() => {
            if (!state.primary) return null;
            if (state.primary.kind === "local") {
              return locals.some((l) => l.id === state.primary!.id) ? state.primary : null;
            } else {
              return externals.some((e) => e.id === state.primary!.id) ? state.primary : null;
            }
          })();

          return { externalVideos: externals, localVideos: locals, social, primary };
        },
      }),
      [state, xHandle, igHandle, ytUrl, gameChangerUrl, maxPrepsUrl, rapsodoUrl, trackmanUrl, pocketRadarUrl]
    );

    // ----- Render -----
    return (
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "8px 0 32px" }}>
        {/* ---------- Info header (matches Metrics/Stats) ---------- */}
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#f8fafc",
            color: "#334155",
            marginBottom: 12,
            lineHeight: 1.35,
          }}
        >
          <div>
            <strong>Who can edit?</strong> Player, Parent, and Team Admin can upload videos and player's social media
            profiles.
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Plan Features:</strong> Video uploads, social media connection, and coach emailing are available with
            Walk-On (up to 3 videos), All-American (unlimited videos), and Teams (unlimited videos) plans. Direct
            Messaging and Response Assistant are available with All-American and Teams plans. Not available with Redshirt
            plan.
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Public Visibility:</strong> Videos and Social Media are visible to anyone viewing your ScoutLine
            profile. Coach emailing and direct messaging is visible only to the people in communication.
          </div>
        </div>

        {/* ----- Redshirt gating ----- */}
        {!PLAN.enabled && (
          <div style={{ ...cardStyle, background: "#f9fafb" }}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>Video / Social Unavailable</span>
              <span style={pillStyle}>Redshirt</span>
            </div>
            <p style={{ margin: 0, color: "#4b5563" }}>
              The Redshirt plan doesn’t include uploads, external video links, or social profile connections. Upgrade to
              Walk-On, All-American, or Teams to enable these features.
            </p>

            {(msg || err) && (
              <div style={{ marginTop: 12, minHeight: 24 }}>
                {msg ? <span style={{ color: "#15803d", fontWeight: 700 }}>{msg}</span> : null}
                {err ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>{err}</span> : null}
              </div>
            )}
          </div>
        )}

        {PLAN.enabled && (
          <>
           {/* ---------- Local Uploads (DEV backend) ---------- */}
<div style={cardStyle}>
  <div style={cardHeaderStyle}>
    <span style={cardTitleStyle}>Upload Video Files</span>
    <span style={pillStyle}>
      {PLAN.maxLocal === "unlimited"
        ? "Local Uploads • Unlimited"
        : `Local Uploads • ${state.localVideos.length}/${PLAN.maxLocal} used`}
    </span>
  </div>
  <p style={{ margin: "8px 0 16px", color: "#4b5563" }}>
    Uploaded videos are stored securely and will appear on the public profile after Save Profile.
  </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  disabled={!PLAN.canUploadLocal || (! (PLAN.maxLocal === "unlimited") && state.localVideos.length >= PLAN.maxLocal)}
                  onChange={(e) => onChooseLocalVideos(e.target.files)}
                  style={{ display: "none" }}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!PLAN.canUploadLocal || (!(PLAN.maxLocal === "unlimited") && state.localVideos.length >= PLAN.maxLocal)}
                  aria-disabled={!PLAN.canUploadLocal || (!(PLAN.maxLocal === "unlimited") && state.localVideos.length >= PLAN.maxLocal)}
                  style={{
                    ...buttonStyle,
                    opacity:
                      PLAN.canUploadLocal &&
                      ((PLAN.maxLocal === "unlimited") || state.localVideos.length < PLAN.maxLocal)
                        ? 1
                        : 0.5,
                    cursor:
                      PLAN.canUploadLocal &&
                      ((PLAN.maxLocal === "unlimited") || state.localVideos.length < PLAN.maxLocal)
                        ? "pointer"
                        : "not-allowed",
                  }}
                  title={
                    !PLAN.canUploadLocal
                      ? `${planTier} plan cannot upload`
                      : !(PLAN.maxLocal === "unlimited") && state.localVideos.length >= PLAN.maxLocal
                      ? `Limit reached (${state.localVideos.length}/${PLAN.maxLocal})`
                      : "Select videos"
                  }
                >
                  Select Videos
                </button>
              </div>

              {state.localVideos.length > 0 ? (
                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    alignItems: "start",
                  }}
                >
                  {state.localVideos.map((v, idx) => {
                    const atTop = idx === 0;
                    const atBottom = idx === state.localVideos.length - 1;
                    const _isPrimary = isPrimaryLocal(v.id);
                    const titleText = v.title || v.fileName;
                    const titleId = `local-title-${v.id}`;

                    return (
                      <div
                        key={v.id}
                        style={tileStyle}
                        role="group"
                        aria-labelledby={titleId}
                        aria-roledescription="Video card"
                        aria-describedby={_isPrimary ? `${titleId}-primary` : undefined}
                      >
                        {_isPrimary && (
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                            <span id={`${titleId}-primary`} style={primaryPillStyle}>
                              PRIMARY
                            </span>
                          </div>
                        )}

                        {v.publicUrl ? (
                          <video
                            controls
                            preload="metadata"
                            style={{
                              width: "100%",
                              aspectRatio: "16 / 9",
                              height: "auto",
                              borderRadius: 12,
                              background: "#111",
                              display: "block",
                            }}
                            src={v.publicUrl}
                            aria-label={`${titleText} video`}
                          />
                        ) : v.previewUrl ? (
                          <video
                            controls
                            preload="metadata"
                            style={{
                              width: "100%",
                              aspectRatio: "16 / 9",
                              height: "auto",
                              borderRadius: 12,
                              background: "#111",
                              display: "block",
                            }}
                            src={v.previewUrl}
                            aria-label={`${titleText} preview`}
                          />
                        ) : (
                          <div style={emptyStyle}>Preparing preview…</div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                          <div>
                            <div id={titleId} style={{ fontWeight: 700 }}>
                              {titleText}
                            </div>
                            <div style={{ color: "#6b7280", fontSize: 12 }}>
                              {v.fileType} • {(v.fileSize / (1024 * 1024)).toFixed(1)} MB
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLocal(v.id)}
                            style={removeButtonStyle}
                            aria-label={`Remove Video ${titleText}`}
                          >
                            Remove Video
                          </button>
                        </div>

                        {/* Reorder / Primary controls */}
                        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => moveLocal(v.id, -1)}
                            disabled={atTop}
                            aria-disabled={atTop}
                            style={{ ...smallGhostButtonStyle, opacity: atTop ? 0.4 : 1 }}
                            title="Move up"
                            aria-label={`Move up: ${titleText}`}
                          >
                            ↑ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLocal(v.id, +1)}
                            disabled={atBottom}
                            aria-disabled={atBottom}
                            style={{ ...smallGhostButtonStyle, opacity: atBottom ? 0.4 : 1 }}
                            title="Move down"
                            aria-label={`Move down: ${titleText}`}
                          >
                            ↓ Down
                          </button>
                          {!_isPrimary ? (
                            <button
                              type="button"
                              onClick={() => setPrimary("local", v.id)}
                              style={smallPrimaryButtonStyle}
                              aria-label={`Set ${titleText} as primary highlight`}
                            >
                              Set as Primary
                            </button>
                          ) : null}
                        </div>

                        {/* Open link (local dev) */}
                        {v.publicUrl && (
                          <div style={{ marginTop: 8 }}>
                            <a
                              href={`/view-video?src=${encodeURIComponent(v.publicUrl)}&type=${encodeURIComponent(
                                v.fileType
                              )}&title=${encodeURIComponent(titleText)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={smallPrimaryButtonStyle}
                              aria-label={`Open file ${titleText} in a new tab`}
                            >
                              Open File
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={emptyStyle}>No uploads yet.</div>
              )}
            </div>

            {/* ---------- External Links ---------- */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={cardTitleStyle}>Add External Video Links</span>
                <span style={pillStyle}>YouTube, Vimeo, MP4, GameChanger</span>
              </div>

              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr auto" }}>
                <input
                  placeholder="Optional title (e.g., 2025 Summer Highlights)"
                  value={extTitle}
                  onChange={(e) => setExtTitle(e.target.value)}
                  style={inputStyle}
                  disabled={!PLAN.canExternal}
                />
                <input
                  placeholder="https://youtu.be/… or https://vimeo.com/… or https://…/clip.mp4"
                  value={extUrl}
                  onChange={(e) => setExtUrl(e.target.value)}
                  style={inputStyle}
                  disabled={!PLAN.canExternal}
                />
                <button
                  type="button"
                  onClick={addExternalVideo}
                  disabled={!PLAN.canExternal}
                  aria-disabled={!PLAN.canExternal}
                  style={{ ...buttonStyle, opacity: PLAN.canExternal ? 1 : 0.5, cursor: PLAN.canExternal ? "pointer" : "not-allowed" }}
                >
                  Add
                </button>
              </div>

              {state.externalVideos.length > 0 ? (
                <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
                  {state.externalVideos.map((v, idx) => {
                    const atTop = idx === 0;
                    const atBottom = idx === state.externalVideos.length - 1;
                    const _isPrimary = isPrimaryExternal(v.id);
                    const titleText = v.title || v.url;
                    const titleId = `ext-title-${v.id}`;

                    return (
                      <div
                        key={v.id}
                        style={tileStyle}
                        role="group"
                        aria-labelledby={titleId}
                        aria-roledescription="Video card"
                        aria-describedby={_isPrimary ? `${titleId}-primary` : undefined}
                      >
                        {_isPrimary && (
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                            <span id={`${titleId}-primary`} style={primaryPillStyle}>
                              PRIMARY
                            </span>
                          </div>
                        )}

                        <div style={{ marginBottom: 8 }}>
                          {v.title ? (
                            <div id={titleId} style={{ fontWeight: 800, marginBottom: 6 }}>
                              {v.title}
                            </div>
                          ) : null}
                          {embedForExternalVideo(v)}
                        </div>

                        {/* Reorder / Primary */}
                        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => moveExternal(v.id, -1)}
                            disabled={atTop}
                            aria-disabled={atTop}
                            style={{ ...smallGhostButtonStyle, opacity: atTop ? 0.4 : 1 }}
                            title="Move up"
                            aria-label={`Move up: ${titleText}`}
                          >
                            ↑ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExternal(v.id, +1)}
                            disabled={atBottom}
                            aria-disabled={atBottom}
                            style={{ ...smallGhostButtonStyle, opacity: atBottom ? 0.4 : 1 }}
                            title="Move down"
                            aria-label={`Move down: ${titleText}`}
                          >
                            ↓ Down
                          </button>
                          {!_isPrimary ? (
                            <button
                              type="button"
                              onClick={() => setPrimary("external", v.id)}
                              style={smallPrimaryButtonStyle}
                              aria-label={`Set ${titleText} as primary highlight`}
                            >
                              Set as Primary
                            </button>
                          ) : null}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={badgeMuted}>{v.source.toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => removeExternal(v.id)}
                            style={removeButtonStyle}
                            aria-label={`Remove external video ${titleText}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={emptyStyle}>
                  {PLAN.canExternal ? "No external videos yet." : `${planTier} plan cannot add external videos.`}
                </div>
              )}
            </div>

            {/* ---------- Social Connections ---------- */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={cardTitleStyle}>Connect Social Profiles</span>
                <span style={pillStyle}>
  X / Instagram / YouTube / GameChanger / MaxPreps / Rapsodo / TrackMan / Pocket Radar
</span>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                  <label style={labelStyle}>X (Twitter) Handle</label>
                  <input
                    placeholder="@firstlast"
                    value={xHandle}
                    onChange={(e) => onXChange(e.target.value)}
                    style={inputStyle}
                    disabled={!PLAN.canSocial}
                  />
                </div>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                  <label style={labelStyle}>Instagram Handle</label>
                  <input
                    placeholder="@firstlast"
                    value={igHandle}
                    onChange={(e) => onIgChange(e.target.value)}
                    style={inputStyle}
                    disabled={!PLAN.canSocial}
                  />
                </div>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                  <label style={labelStyle}>YouTube Channel URL</label>
                  <input
                    placeholder="https://youtube.com/@yourchannel"
                    value={ytUrl}
                    onChange={(e) => onYtChange(e.target.value)}
                    style={inputStyle}
                    disabled={!PLAN.canSocial}
                  />
                </div>

<div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
  <label style={labelStyle}>GameChanger URL</label>
  <input
    placeholder="https://gc.com/..."
    value={gameChangerUrl}
    onChange={(e) => onGameChangerChange(e.target.value)}
    style={inputStyle}
    disabled={!PLAN.canSocial}
  />
</div>

<div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
  <label style={labelStyle}>MaxPreps URL</label>
  <input
    placeholder="https://www.maxpreps.com/..."
    value={maxPrepsUrl}
    onChange={(e) => onMaxPrepsChange(e.target.value)}
    style={inputStyle}
    disabled={!PLAN.canSocial}
  />
</div>

<div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
  <label style={labelStyle}>Rapsodo URL</label>
  <input
    placeholder="https://..."
    value={rapsodoUrl}
    onChange={(e) => onRapsodoChange(e.target.value)}
    style={inputStyle}
    disabled={!PLAN.canSocial}
  />
</div>

<div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
  <label style={labelStyle}>TrackMan URL</label>
  <input
    placeholder="https://..."
    value={trackmanUrl}
    onChange={(e) => onTrackmanChange(e.target.value)}
    style={inputStyle}
    disabled={!PLAN.canSocial}
  />
</div>

<div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
  <label style={labelStyle}>Pocket Radar URL</label>
  <input
    placeholder="https://..."
    value={pocketRadarUrl}
    onChange={(e) => onPocketRadarChange(e.target.value)}
    style={inputStyle}
    disabled={!PLAN.canSocial}
  />
</div>

<div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
  <button
    type="button"
    onClick={saveSocial}
    disabled={!PLAN.canSocial}
    aria-disabled={!PLAN.canSocial}
    style={{ ...buttonStyle, opacity: PLAN.canSocial ? 1 : 0.5, cursor: PLAN.canSocial ? "pointer" : "not-allowed" }}
  >
    Save Social
  </button>

  {/* X pill (if present) */}
  {normalizeHandle(xHandle || state.social.xHandle) ? (
    <span style={pillWrap}>
      <a
        href={`https://twitter.com/${normalizeHandle(xHandle || state.social.xHandle)}`}
        target="_blank"
        rel="noreferrer"
        style={linkButtonStyle}
      >
        Follow on X
      </a>
      <button
        type="button"
        onClick={clearX}
        aria-label="Remove X handle"
        title="Remove X handle"
        style={closeXButtonStyle}
      >
        ×
      </button>
    </span>
  ) : null}

  {/* Instagram pill (if present) */}
  {normalizeHandle(igHandle || state.social.instagramHandle) ? (
    <span style={pillWrap}>
      <a
        href={`https://instagram.com/${normalizeHandle(igHandle || state.social.instagramHandle)}`}
        target="_blank"
        rel="noreferrer"
        style={linkButtonStyle}
      >
        Follow on Instagram
      </a>
      <button
        type="button"
        onClick={clearIg}
        aria-label="Remove Instagram handle"
        title="Remove Instagram handle"
        style={closeXButtonStyle}
      >
        ×
      </button>
    </span>
  ) : null}

  {/* YouTube pill (if present) */}
  {(ytUrl || state.social.youtubeChannelUrl)?.trim() ? (
    <span style={pillWrap}>
      <a
        href={(ytUrl || state.social.youtubeChannelUrl)!.trim()}
        target="_blank"
        rel="noreferrer"
        style={linkButtonStyle}
      >
        YouTube Channel
      </a>
      <button
        type="button"
        onClick={clearYt}
        aria-label="Remove YouTube channel"
        title="Remove YouTube channel"
        style={closeXButtonStyle}
      >
        ×
      </button>
    </span>
  ) : null}

  {(gameChangerUrl || state.social.gameChangerUrl)?.trim() ? (
  <span style={pillWrap}>
    <a
      href={(gameChangerUrl || state.social.gameChangerUrl)!.trim()}
      target="_blank"
      rel="noreferrer"
      style={linkButtonStyle}
    >
      GameChanger Profile
    </a>
    <button
      type="button"
      onClick={clearGameChanger}
      aria-label="Remove GameChanger URL"
      title="Remove GameChanger URL"
      style={closeXButtonStyle}
    >
      ×
    </button>
  </span>
) : null}

{(maxPrepsUrl || state.social.maxPrepsUrl)?.trim() ? (
  <span style={pillWrap}>
    <a
      href={(maxPrepsUrl || state.social.maxPrepsUrl)!.trim()}
      target="_blank"
      rel="noreferrer"
      style={linkButtonStyle}
    >
      MaxPreps Profile
    </a>
    <button
      type="button"
      onClick={clearMaxPreps}
      aria-label="Remove MaxPreps URL"
      title="Remove MaxPreps URL"
      style={closeXButtonStyle}
    >
      ×
    </button>
  </span>
) : null}

{(rapsodoUrl || state.social.rapsodoUrl)?.trim() ? (
  <span style={pillWrap}>
    <a
      href={(rapsodoUrl || state.social.rapsodoUrl)!.trim()}
      target="_blank"
      rel="noreferrer"
      style={linkButtonStyle}
    >
      Rapsodo Profile
    </a>
    <button
      type="button"
      onClick={clearRapsodo}
      aria-label="Remove Rapsodo URL"
      title="Remove Rapsodo URL"
      style={closeXButtonStyle}
    >
      ×
    </button>
  </span>
) : null}

{(trackmanUrl || state.social.trackmanUrl)?.trim() ? (
  <span style={pillWrap}>
    <a
      href={(trackmanUrl || state.social.trackmanUrl)!.trim()}
      target="_blank"
      rel="noreferrer"
      style={linkButtonStyle}
    >
      TrackMan Profile
    </a>
    <button
      type="button"
      onClick={clearTrackman}
      aria-label="Remove TrackMan URL"
      title="Remove TrackMan URL"
      style={closeXButtonStyle}
    >
      ×
    </button>
  </span>
) : null}

{(pocketRadarUrl || state.social.pocketRadarUrl)?.trim() ? (
  <span style={pillWrap}>
    <a
      href={(pocketRadarUrl || state.social.pocketRadarUrl)!.trim()}
      target="_blank"
      rel="noreferrer"
      style={linkButtonStyle}
    >
      Pocket Radar Profile
    </a>
    <button
      type="button"
      onClick={clearPocketRadar}
      aria-label="Remove Pocket Radar URL"
      title="Remove Pocket Radar URL"
      style={closeXButtonStyle}
    >
      ×
    </button>
  </span>
) : null}
</div>
              </div>
            </div>
          </>
        )}

        {(msg || err) && (
          <div style={{ marginTop: 12, minHeight: 24 }} aria-live="polite" aria-atomic="true" role="status">
            {msg ? <span style={{ color: "#15803d", fontWeight: 700 }}>{msg}</span> : null}
            {err ? (
              <span style={{ color: "#b91c1c", fontWeight: 700 }} role="alert">
                {err}
              </span>
            ) : null}
          </div>
        )}
      </section>
    );
  }
);

export default TabVideoSocial;

/** ---------- Styles ---------- */
const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  marginTop: 16,
  background: "#fff",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.05rem",
};

const pillStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#374151",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#e0f2fe",
  color: "#0f172a",
  fontWeight: 800,
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#111827",
  fontWeight: 800,
  borderRadius: 12,
  padding: "10px 14px",
  textDecoration: "none",
};

const tileStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  borderRadius: 16,
  padding: 10,
  background: "#fff",
  overflow: "hidden",
  boxSizing: "border-box",
};

const badgeMuted: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  border: "1px solid #0ea5e9",
  padding: "2px 8px",
  borderRadius: 999,
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  paddingTop: 8,
};

const emptyStyle: React.CSSProperties = {
  marginTop: 12,
  fontStyle: "italic",
  color: "#6b7280",
};

const smallPrimaryButtonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#e0f2fe",
  color: "#0f172a",
  fontWeight: 800,
  borderRadius: 12,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const smallGhostButtonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  borderRadius: 12,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const removeButtonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 800,
  borderRadius: 12,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const progressWrap: React.CSSProperties = {
  width: "100%",
  height: 8,
  background: "#f3f4f6",
  borderRadius: 999,
  overflow: "hidden",
};

const progressBar: React.CSSProperties = {
  height: "100%",
  background: "#e0f2fe",
};

/* ---------- NEW: pill wrapper + red close button ---------- */
const pillWrap: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const closeXButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: -10,               // inside the pill (top-right corner)
  right: 2,             // inside the pill (top-right corner)
  width: 16,
  height: 16,
  lineHeight: "14px",
  textAlign: "center",
  borderRadius: "999px",
  border: "1px solid #64748b",
  background: "#fff",
  color: "#ef4444",
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  boxShadow: "0 0 0 1px #fff", // keeps separation from pill bg
};
