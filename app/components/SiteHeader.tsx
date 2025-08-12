"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [loginOpen, setLoginOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click or Esc (for accessibility / touch)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current || !btnRef.current) return;
      if (!menuRef.current.contains(t) && !btnRef.current.contains(t)) setLoginOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLoginOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="sl-header">
      <style>{`
        .sl-header { border-bottom: 1px solid #e5e7eb; background: #fff; }
        .sl-nav { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; padding: 12px 16px; gap: 16px; }
        .sl-right { margin-left: auto; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .sl-login-btn { background: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .sl-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); z-index: 50; min-width: 200px; padding: 6px; }
        .sl-item { display: block; padding: 8px 12px; text-decoration: none; border-radius: 6px; }

        /* Logo size controls (use your preferred size here) */
        .sl-logo { width: 100%; max-width: 360px; } /* good default */
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
              width={360}
              height={80}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </Link>

        {/* Nav (reordered) */}
        <div className="sl-right">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/recruiting-journey">Recruiting Journey</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>

          {/* Log In: hover to open, hover out to close; also supports keyboard and touch */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setLoginOpen(true)}
            onMouseLeave={() => setLoginOpen(false)}
          >
            <button
              ref={btnRef}
              className="sl-login-btn"
              aria-haspopup="menu"
              aria-expanded={loginOpen}
              // Touch/click toggle for mobile devices (hover doesn't exist there)
              onClick={() => setLoginOpen(v => !v)}
              onFocus={() => setLoginOpen(true)} // keyboard focus opens
            >
              Log In ▾
            </button>
            {loginOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="sl-dropdown"
                // Keep open while focusing inside with keyboard
                onFocus={() => setLoginOpen(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setLoginOpen(false);
                }}
              >
                <Link href="/player" role="menuitem" className="sl-item" onClick={() => setLoginOpen(false)}>Player</Link>
                <Link href="/parent" role="menuitem" className="sl-item" onClick={() => setLoginOpen(false)}>Parent</Link>
                <Link href="/coach" role="menuitem" className="sl-item" onClick={() => setLoginOpen(false)}>Coach</Link>
                <Link href="/admin" role="menuitem" className="sl-item" onClick={() => setLoginOpen(false)}>Team Admin</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
