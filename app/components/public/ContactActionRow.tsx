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

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

type Props = {
  email?: string | null;
  phoneDigits?: string | null; // 10 digits preferred
  xUrl?: string | null;
  instagramUrl?: string | null;
  chatUrl?: string | null; // pass whatever route you already use (player/coach)
};

export default function ContactActionRow(props: Props) {
  const email = String(props.email || "").trim();
  const phoneDigits = digitsOnly(props.phoneDigits).slice(0, 10);

  const mailHref = email ? `mailto:${email}` : null;
  const telHref = phoneDigits ? `tel:+1${phoneDigits}` : null;

  const xUrl = String(props.xUrl || "").trim() || null;
  const igUrl = String(props.instagramUrl || "").trim() || null;
  const chatUrl = String(props.chatUrl || "").trim() || null;

  const hasAny = !!mailHref || !!telHref || !!xUrl || !!igUrl || !!chatUrl;
  if (!hasAny) return null;

  return (
    <div style={row}>
      {mailHref ? (
        <a href={mailHref} style={iconLink} title="Email">
          <Mail size={18} color="#0ea5e9" />
        </a>
      ) : null}

      {telHref ? (
        <a href={telHref} style={iconLink} title="Call">
          <Phone size={18} color="#0ea5e9" />
        </a>
      ) : null}

      {xUrl ? (
        <a href={xUrl} target="_blank" rel="noreferrer" style={iconLink} title="X">
          <IconX size={18} />
        </a>
      ) : null}

      {igUrl ? (
        <a href={igUrl} target="_blank" rel="noreferrer" style={iconLink} title="Instagram">
          <IconInstagram size={18} />
        </a>
      ) : null}

      {chatUrl ? (
        <a href={chatUrl} style={iconLink} title="ScoutLine Chat">
          <MessageCircle size={18} color="#0ea5e9" />
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
};
