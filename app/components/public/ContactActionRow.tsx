// app/components/public/ContactActionRow.tsx
"use client";

import React from "react";
import { Mail, Phone, MessageCircle } from "lucide-react";

function IconX(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#000000"
        d="M18.9 2H22l-6.78 7.74L23 22h-6.2l-4.86-6.36L6.3 22H3.2l7.26-8.3L1 2h6.36l4.4 5.75L18.9 2Zm-1.09 18h1.72L6.42 3.9H4.58L17.8 20Z"
      />
    </svg>
  );
}

function IconInstagram(props: { size?: number }) {
  const s = props.size ?? 18;
  const gid = "igGradient";
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>

      <path
        fill={`url(#${gid})`}
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6Zm6.25-2.5a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Z"
      />
    </svg>
  );
}

function IconYouTube(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#FF0000"
        d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.56 9.38.56 9.38.56s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8ZM9.6 15.5v-7l6.2 3.5-6.2 3.5Z"
      />
    </svg>
  );
}

function LogoIcon(props: {
  src: string;
  alt: string;
  size?: number;
  fallback: string;
}) {
  const s = props.size ?? 18;

  return (
    <img
      src={props.src}
      alt={props.alt}
      width={s}
      height={s}
      style={{
        width: s,
        height: s,
        objectFit: "contain",
        display: "block",
      }}
      onError={(e) => {
        const img = e.currentTarget;
        img.style.display = "none";
        const fallback = img.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = "inline-flex";
      }}
    />
  );
}

function LogoFallback(props: { text: string; size?: number }) {
  const s = props.size ?? 18;
  return (
    <span
      style={{
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        width: s,
        height: s,
        fontSize: 9,
        fontWeight: 900,
        color: "#0f172a",
        lineHeight: 1,
      }}
    >
      {props.text}
    </span>
  );
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

type Props = {
  email?: string | null;
  phoneDigits?: string | null; // 10 digits preferred

  xUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;

  gameChangerUrl?: string | null;
  maxPrepsUrl?: string | null;
  rapsodoUrl?: string | null;
  trackmanUrl?: string | null;
  pocketRadarUrl?: string | null;

  chatUrl?: string | null; // pass whatever route you already use (player/coach)
};

export default function ContactActionRow(props: Props) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const email = String(props.email || "").trim();
  const phoneDigits = digitsOnly(props.phoneDigits).slice(0, 10);

  const mailHref = email ? `mailto:${email}` : null;
  const telHref = phoneDigits ? `tel:+1${phoneDigits}` : null;

  const xUrl = String(props.xUrl || "").trim() || null;
  const igUrl = String(props.instagramUrl || "").trim() || null;
  const youtubeUrl = String(props.youtubeUrl || "").trim() || null;

  const gameChangerUrl = String(props.gameChangerUrl || "").trim() || null;
  const maxPrepsUrl = String(props.maxPrepsUrl || "").trim() || null;
  const rapsodoUrl = String(props.rapsodoUrl || "").trim() || null;
  const trackmanUrl = String(props.trackmanUrl || "").trim() || null;
  const pocketRadarUrl = String(props.pocketRadarUrl || "").trim() || null;

  const chatUrl = String(props.chatUrl || "").trim() || null;

  const hasAny =
    !!mailHref ||
    !!telHref ||
    !!xUrl ||
    !!igUrl ||
    !!youtubeUrl ||
    !!gameChangerUrl ||
    !!maxPrepsUrl ||
    !!rapsodoUrl ||
    !!trackmanUrl ||
    !!pocketRadarUrl ||
    !!chatUrl;

  if (!hasAny) return null;

  const iconSize = isMobile ? 16 : 18;
  const linkStyle: React.CSSProperties = {
    ...iconLink,
    width: isMobile ? 30 : 34,
    height: isMobile ? 30 : 34,
    borderRadius: isMobile ? 9 : 10,
  };

  const rowStyle: React.CSSProperties = {
    ...row,
    gap: isMobile ? 7 : 10,
    justifyContent: isMobile ? "center" : "flex-start",
    maxWidth: "100%",
    overflow: "hidden",
  };

  return (
    <div style={rowStyle}>
      {mailHref ? (
        <a href={mailHref} style={linkStyle} title="Email" aria-label="Email">
          <Mail size={iconSize} color="#0ea5e9" />
        </a>
      ) : null}

      {telHref ? (
        <a href={telHref} style={linkStyle} title="Call" aria-label="Call">
          <Phone size={iconSize} color="#0ea5e9" />
        </a>
      ) : null}

      {xUrl ? (
        <a href={xUrl} target="_blank" rel="noreferrer" style={linkStyle} title="X" aria-label="X">
          <IconX size={iconSize} />
        </a>
      ) : null}

      {igUrl ? (
        <a href={igUrl} target="_blank" rel="noreferrer" style={linkStyle} title="Instagram" aria-label="Instagram">
          <IconInstagram size={iconSize} />
        </a>
      ) : null}

      {youtubeUrl ? (
        <a href={youtubeUrl} target="_blank" rel="noreferrer" style={linkStyle} title="YouTube" aria-label="YouTube">
          <IconYouTube size={iconSize} />
        </a>
      ) : null}

      {gameChangerUrl ? (
        <a
          href={gameChangerUrl}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
          title="GameChanger"
          aria-label="GameChanger"
        >
          <LogoIcon src="/logos/gamechanger.png" alt="GameChanger" size={iconSize} fallback="GC" />
          <LogoFallback text="GC" size={iconSize} />
        </a>
      ) : null}

      {maxPrepsUrl ? (
        <a
          href={maxPrepsUrl}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
          title="MaxPreps"
          aria-label="MaxPreps"
        >
          <LogoIcon src="/logos/maxpreps.png" alt="MaxPreps" size={iconSize} fallback="MP" />
          <LogoFallback text="MP" size={iconSize} />
        </a>
      ) : null}

      {rapsodoUrl ? (
        <a
          href={rapsodoUrl}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
          title="Rapsodo"
          aria-label="Rapsodo"
        >
          <LogoIcon src="/logos/rapsodo.png" alt="Rapsodo" size={iconSize} fallback="RA" />
          <LogoFallback text="RA" size={iconSize} />
        </a>
      ) : null}

      {trackmanUrl ? (
        <a
          href={trackmanUrl}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
          title="TrackMan"
          aria-label="TrackMan"
        >
          <LogoIcon src="/logos/trackman.png" alt="TrackMan" size={iconSize} fallback="TM" />
          <LogoFallback text="TM" size={iconSize} />
        </a>
      ) : null}

      {pocketRadarUrl ? (
        <a
          href={pocketRadarUrl}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
          title="Pocket Radar"
          aria-label="Pocket Radar"
        >
          <LogoIcon src="/logos/pocketradar.png" alt="Pocket Radar" size={iconSize} fallback="PR" />
          <LogoFallback text="PR" size={iconSize} />
        </a>
      ) : null}

      {chatUrl ? (
        <a href={chatUrl} style={linkStyle} title="ScoutLine Chat" aria-label="ScoutLine Chat">
          <MessageCircle size={iconSize} color="#0ea5e9" />
        </a>
      ) : null}
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const iconLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid rgba(14,165,233,0.25)",
  background: "#fff",
  textDecoration: "none",
  overflow: "hidden",
};