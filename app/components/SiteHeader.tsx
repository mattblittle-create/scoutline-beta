"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  // Desktop login dropdown
  const [loginOpen, setLoginOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile menu + mobile login expand
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileLoginOpen, setMobileLoginOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  const openLogin = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setLoginOpen(true);
  };
  const scheduleCloseLogin = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setLoginOpen(false), 200); // your delay
  };
  const instantCloseLogin = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setLoginOpen(false);
  };

  // Close on outside click & Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      // desktop login
      if (menuRef.current && btnRef.current) {
        if (!menuRef.current.contains(t) && !btnRef.current.contains(t)) {
          instantCloseLogin();
        }
      }
      // mobile panel
      if (mobileRef.current && !mobileRef.current.contains(t)) {
        setMobileOpen(false);
        setMobileLoginOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        instantCloseLogin();
        setMobileOpen(false);
        setMobileLoginOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const closeAll = () => {
    instantCloseLogin();
    setMobileOpen(false);
    setMobileLoginOpen(false);
  };

  return (
    <header className="sl-header">
      <style>{`
        .sl-header { position: sticky; top: 0; z-index: 50; background:#fff; border-bottom:1px solid var(--sl-border); backdrop-filter: saturate(150%) blur(4px) }
        .sl-nav { max-width:1100px; margin:0 auto; display:flex; align-items:center; padding: 12px 16px; gap: 16px; }
        .sl-right { margin-left:auto; display:flex; align-items:center; gap: 22px; flex-wrap: wrap; }
        .sl-login-btn { background:#fff; border:1px solid var(--sl-border); border-radius:10px; padding:8px 12px; cursor:pointer; transition: box-shadow .2s ease, transform .04s ease; }
        .sl-login-btn:hover { box-shadow: var(--sl-shadow); transform: translateY(-1px) }
        .sl-dropdown { position:absolute; top:calc(100% + 6px); left:0; background:#fff; border:1px solid var(--sl-border); border-radius:12px; box-shadow: var(--sl-shadow); z-index:60; min-width: 220px; padding: 6px; }
        .sl-item { display:block; padding:10px 12px; border-radius:10px; }
        .sl-item:hover { background:#f8fafc; text-decoration: underline; } /* <-- updated underline */
        .sl-logo { width:100%; max-width: 270px; } /* adjust logo size here */
        .sl-link:hover{ text-decoration:none; }
        .sl-link.is-active{ color: var(--sl-accent); font-weight:600; }
        
        .sl-hamburger { display:none; margin-left:auto; border:1px solid var(--sl-border); background:#fff; border-radius:10px; padding:8px 12px; cursor:pointer; }
        .sl-mobile-panel { display:none; overflow:hidden; transition:max-height .35s ease, opacity .35s ease; max-height:0; opacity:0; }
        .sl-mobile-panel.open { display:block; max-height:600px; opacity:1; }
        .sl-mobile-card { border:1px solid var(--sl-border); border-radius:12px; padding:8px; background:#fff; box-shadow: var(--sl-shadow) }
        .sl-mobile-row { display:flex; flex-direction:column; gap:6px; }
        .sl-mobile-sep { height:1px; background:#f1f5f9; margin:8px 0; }
  display: none;
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.35s ease;
  max-height: 0;
  opacity: 0;
}

.sl-mobile-panel.open {
  display: block;
  max-height: 600px; /* large enough for menu content */
  opacity: 1;
}


        /* Mobile layout */
        @media (max-width: 900px) {
          .sl-right { display: none; }          /* hide desktop links */
          .sl-hamburger { display: inline-flex; }
          .sl-mobile-panel { display: block; width: 100%; }
          .sl-mobile-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; background: #fff; }
          .sl-mobile-row { display: flex; flex-direction: column; gap: 6px; }
          .sl-mobile-sep { height: 1px; background: #f1f5f9; margin: 6px 0; }
          .sl-logo { max-width: 220px; }
        }
        @media (max-width: 520px) {
          .sl-logo { max-width: 180px; }
        }
      `}</style>

      <nav className="sl-nav">
        {/* Logo (PNG) */}
        <Link href="/" aria-label="ScoutLine home" style={{ display: "flex", alignItems: "center", flexShrink: 0, maxWidth: "100%" }} onClick={closeAll}>
          <div className="sl-logo">
            <Image
              src="/scoutline-logo-gold.png"
              alt="ScoutLine"
              width={180}
              height={60}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="sl-right">
          <Link href="/" onClick={closeAll}>Home</Link>
          <Link href="/about" onClick={closeAll}>About</Link>
          <Link href="/recruiting-journey" onClick={closeAll}>Recruiting</Link>
          <Link href="/pricing" onClick={closeAll}>Pricing</Link>
          <Link href="/faq" onClick={closeAll}>FAQ</Link>
          <Link href="/search" onClick={closeAll}>Search</Link>

          {/* Log In (hover to open, delayed close) */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={openLogin}
            onMouseLeave={scheduleCloseLogin}
          >
            <button
              ref={btnRef}
              className="sl-login-btn"
              aria-haspopup="menu"
              aria-expanded={loginOpen}
              onClick={() => (loginOpen ? instantCloseLogin() : openLogin())} // touch/click
              onFocus={openLogin} // keyboard
            >
              Log In ▾
            </button>

            {loginOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="sl-dropdown"
                onMouseEnter={openLogin}
                onMouseLeave={scheduleCloseLogin}
                onFocus={openLogin}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) instantCloseLogin();
                }}
              >
                <Link href="/player" role="menuitem" className="sl-item" onClick={instantCloseLogin}>Player</Link>
                <Link href="/parent" role="menuitem" className="sl-item" onClick={instantCloseLogin}>Parent</Link>
                <Link href="/coach" role="menuitem" className="sl-item" onClick={instantCloseLogin}>Coach</Link>
                <Link href="/admin" role="menuitem" className="sl-item" onClick={instantCloseLogin}>Team Admin</Link>
              </div>
            )}
          </div>
        </div>

        {/* Hamburger (mobile) */}
        <button
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="sl-hamburger"
          onClick={() => {
            setMobileOpen(v => !v);
            setMobileLoginOpen(false);
            instantCloseLogin();
          }}
        >
          {mobileOpen ? "Close ✕" : "Menu ☰"}
        </button>
      </nav>

      {/* Mobile slide-down panel */}
      {mobileOpen && (
       <div
  className={`sl-mobile-panel ${mobileOpen ? "open" : ""}`}
  ref={mobileRef}
>
  <div className="sl-mobile-card">
    <div className="sl-mobile-row">
      <Link href="/" className="sl-item" onClick={closeAll}>Home</Link>
      <Link href="/about" className="sl-item" onClick={closeAll}>About</Link>
      <Link href="/recruiting-journey" className="sl-item" onClick={closeAll}>Recruiting</Link>
      <Link href="/pricing" className="sl-item" onClick={closeAll}>Pricing</Link>
      <Link href="/faq" className="sl-item" onClick={closeAll}>FAQ</Link>
      <Link href="/search" className="sl-item" onClick={closeAll}>Search</Link>

      <div className="sl-mobile-sep" />

      <button
        className="sl-login-btn"
        aria-expanded={mobileLoginOpen}
        aria-controls="mobile-login-menu"
        onClick={() => setMobileLoginOpen(v => !v)}
      >
        Log In ▾
      </button>
      {mobileLoginOpen && (
        <div id="mobile-login-menu" style={{ paddingTop: 6 }}>
          <Link href="/player" className="sl-item" onClick={closeAll}>Player</Link>
          <Link href="/parent" className="sl-item" onClick={closeAll}>Parent</Link>
          <Link href="/coach" className="sl-item" onClick={closeAll}>Coach</Link>
          <Link href="/admin" className="sl-item" onClick={closeAll}>Team Admin</Link>
        </div>
      )}
    </div>
  </div>
</div>

      )}
    </header>
  );
}
