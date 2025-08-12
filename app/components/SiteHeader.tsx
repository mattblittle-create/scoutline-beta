"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [loginOpen, setLoginOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const open = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setLoginOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setLoginOpen(false), 200);
  };
  const instantClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setLoginOpen(false);
  };

  // Close on outside click / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current || !btnRef.current) return;
      if (!menuRef.current.contains(t) && !btnRef.current.contains(t)) instantClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") instantClose();
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
        .sl-dropdown { position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); z-index: 50; min-width: 220px; padding: 6px; }
        .sl-item { display: block; padding: 8px 12px; text-decoration: none; border-radius: 6px; }
        .sl-logo { width: 100%; max-width: 360px; }
        @media (max-width: 768px) { .sl-logo { max-width: 300px; } }
        @media (max-width: 480px) { .sl-logo { max-width: 200px; } }
      `}</style>

      <nav className="sl-nav">
        {/* Logo */}
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

        {/* Nav (ordered) */}
        <div className="sl-right">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/recruiting-journey">Recruiting Journey</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>

          {/* Log In (hover to open, delayed close) */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={open}
            onMouseLeave={scheduleClose}
          >
            <button
              ref={btnRef}
              className="sl-login-btn"
              aria-haspopup="menu"
              aria-expanded={loginOpen}
              onClick={() => (loginOpen ? instantClose() : open())} // touch/click toggle
              onFocus={open} // keyboard
            >
              Log In ▾
            </button>

            {loginOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="sl-dropdown"
                onMouseEnter={open}
                onMouseLeave={scheduleClose}
                onFocus={open}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) instantClose();
                }}
              >
                <Link href="/player" role="menuitem" className="sl-item" onClick={instantClose}>Player</Link>
                <Link href="/parent" role="menuitem" className="sl-item" onClick={instantClose}>Parent</Link>
                <Link href="/coach" role="menuitem" className="sl-item" onClick={instantClose}>Coach</Link>
                <Link href="/admin" role="menuitem" className="sl-item" onClick={instantClose}>Team Admin</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
