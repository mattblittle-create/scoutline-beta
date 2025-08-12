"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [loginOpen, setLoginOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current || !btnRef.current) return;
      if (!menuRef.current.contains(t) && !btnRef.current.contains(t)) setLoginOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLoginOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
      <nav style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", padding: "12px 16px", flexWrap: "wrap" }}>
        {/* Logo */}
        <Link href="/" aria-label="ScoutLine home" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Image
            src="/scoutline-logo-gold.svg"
            alt="ScoutLine"
            width={720}
            height={160}
            priority
            style={{ height: 160, width: "auto", display: "block" }}
            sizes="(max-width: 768px) 100vw, 720px"
          />
        </Link>

        {/* Nav */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/recruiting-journey">Recruiting Journey</Link>
          <Link href="/pricing">Pricing</Link>

          {/* Log In dropdown */}
          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              onClick={() => setLoginOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={loginOpen}
              style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
            >
              Log In ▾
            </button>
            {loginOpen && (
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  zIndex: 50,
                  minWidth: 200,
                  padding: 6,
                }}
              >
                <Link href="/player" role="menuitem" style={item} onClick={() => setLoginOpen(false)}>Player</Link>
                <Link href="/parent" role="menuitem" style={item} onClick={() => setLoginOpen(false)}>Parent</Link>
                <Link href="/coach" role="menuitem" style={item} onClick={() => setLoginOpen(false)}>Coach</Link>
                <Link href="/admin" role="menuitem" style={item} onClick={() => setLoginOpen(false)}>Team Admin</Link>
              </div>
            )}
          </div>

          <Link href="/faq">FAQ</Link>
        </div>
      </nav>
    </header>
  );
}

const item: React.CSSProperties = {
  display: "block",
  padding: "8px 12px",
  textDecoration: "none",
  borderRadius: 6,
};
