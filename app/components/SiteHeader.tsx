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
    <header className="sl-header">
      <style>{`
        .sl-header { border-bottom: 1px solid #e5e7eb; background: #fff; }
        .sl-nav { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; padding: 12px 16px; gap: 16px; }
        .sl-logo { width: 100%; max-width: 800px; } /* big on desktop */
        .sl-right { margin-left: auto; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .sl-login-btn { background: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .sl-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); z-index: 50; min-width: 200px; padding: 6px; }

        /* responsive logo sizes */
        @media (max-width: 768px) { .sl-logo { max-width: 300px; } }
        @media (max-width: 480px) { .sl-logo { max-width: 200px; } }
      `}</style>

      <nav className="sl-nav">
        {/* Logo (PNG) */}
        <Link href="/" aria-label="ScoutLine home" style={{ display: "flex", alignItems: "center", flexShrink: 0, maxWidth: "100%" }}>
          <div className="sl-logo">
            <Image
              src="/scoutline-logo-gold.png"
              alt="ScoutLine"
              width={800}
              height={178}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </Link>

        {/* Nav */}
        <div className="sl-right">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/recruiting-journey">Recruiting Journey</Link>
          <Link href="/pricing">Pricing</Link>

          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              onClick={() => setLoginOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={loginOpen}
              className="sl-login-btn"
            >
              Log In ▾
            </button>
            {loginOpen && (
              <div ref={menuRef} role="menu" className="sl-dropdown">
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
