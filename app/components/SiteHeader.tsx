"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        menuRef.current &&
        btnRef.current &&
        !menuRef.current.contains(t) &&
        !btnRef.current.contains(t)
      ) {
        setLoginOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(t)) {
        // Only close mobile if the hamburger isn't the target (handled by onClick)
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLoginOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Helpers
  const closeAll = () => {
    setLoginOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sl-header">
      {/* Basic styles + responsive tweaks */}
      <style>{`
        .sl-header {
          border-bottom: 1px solid #e5e7eb;
          background: #fff;
        }
        .sl-nav {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          padding: 12px 16px;
          gap: 16px;
          flex-wrap: nowrap;
        }
        .sl-logo-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          height: 160px; /* desktop */
        }
        .sl-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .sl-link {
          text-decoration: none;
        }
        .sl-login-btn {
          background: none;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .sl-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
          z-index: 50;
          min-width: 200px;
          padding: 6px;
        }
        .sl-item {
          display: block;
          padding: 8px 12px;
          text-decoration: none;
          border-radius: 6px;
        }

        /* Hamburger (hidden on desktop) */
        .sl-hamburger {
          display: none;
          margin-left: auto;
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
        }

        /* Mobile panel (hidden on desktop) */
        .sl-mobile-panel {
          display: none;
        }

        /* Small screens */
        @media (max-width: 768px) {
          .sl-nav { align-items: flex-start; }
          .sl-logo-wrap { height: 120px; } /* shrink logo */
          .sl-right { display: none; }     /* hide desktop links */
          .sl-hamburger { display: inline-flex; }
          .sl-mobile-panel {
            display: block;
            width: 100%;
            padding: 8px 0 2px;
          }
          .sl-mobile-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 8px;
            background: #fff;
          }
          .sl-mobile-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .sl-mobile-sep {
            height: 1px;
            background: #f1f5f9;
            margin: 6px 0;
          }
          .sl-mobile-login {
            position: relative;
          }
          .sl-dropdown {
            position: relative; /* in-flow for mobile */
            top: auto;
            left: auto;
            box-shadow: none;
            border-radius: 8px;
            margin-top: 6px;
          }
        }
      `}</style>

      <nav className="sl-nav">
        {/* Logo */}
        <Link href="/" aria-label="ScoutLine home" className="sl-logo-wrap">
          <Image
            src="/scoutline-logo-gold.svg"
            alt="ScoutLine"
            width={720}
            height={160}
            priority
            style={{ height: "100%", width: "auto", display: "block" }}
            sizes="(max-width: 768px) 100vw, 720px"
          />
        </Link>

        {/* Desktop nav */}
        <div className="sl-right">
          <Link href="/" className="sl-link" onClick={closeAll}>Home</Link>
          <Link href="/about" className="sl-link" onClick={closeAll}>About</Link>
          <Link href="/recruiting-journey" className="sl-link" onClick={closeAll}>Recruiting Journey</Link>
          <Link href="/pricing" className="sl-link" onClick={closeAll}>Pricing</Link>

          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              aria-haspopup="menu"
              aria-expanded={loginOpen}
              onClick={() => setLoginOpen(v => !v)}
              className="sl-login-btn"
            >
              Log In ▾
            </button>
            {loginOpen && (
              <div ref={menuRef} role="menu" className="sl-dropdown">
                <Link href="/player" role="menuitem" className="sl-item" onClick={closeAll}>Player</Link>
                <Link href="/parent" role="menuitem" className="sl-item" onClick={closeAll}>Parent</Link>
                <Link href="/coach" role="menuitem" className="sl-item" onClick={closeAll}>Coach</Link>
                <Link href="/admin" role="menuitem" className="sl-item" onClick={closeAll}>Team Admin</Link>
              </div>
            )}
          </div>

          <Link href="/faq" className="sl-link" onClick={closeAll}>FAQ</Link>
        </div>

        {/* Hamburger (mobile only) */}
        <button
          aria-label="Open navigation menu"
          className="sl-hamburger"
          onClick={() => {
            setMobileOpen(v => !v);
            setLoginOpen(false);
          }}
        >
          {mobileOpen ? "Close ✕" : "Menu ☰"}
        </button>

        {/* Mobile panel */}
        {mobileOpen && (
          <div className="sl-mobile-panel" ref={mobileRef}>
            <div className="sl-mobile-card">
              <div className="sl-mobile-row">
                <Link href="/" className="sl-item" onClick={closeAll}>Home</Link>
                <Link href="/about" className="sl-item" onClick={closeAll}>About</Link>
                <Link href="/recruiting-journey" className="sl-item" onClick={closeAll}>Recruiting Journey</Link>
                <Link href="/pricing" className="sl-item" onClick={closeAll}>Pricing</Link>

                <div className="sl-mobile-sep" />

                {/* Mobile Log In group */}
                <div className="sl-mobile-login">
                  <button
                    aria-haspopup="menu"
                    aria-expanded={loginOpen}
                    className="sl-login-btn"
                    onClick={() => setLoginOpen(v => !v)}
                  >
                    Log In ▾
                  </button>
                  {loginOpen && (
                    <div className="sl-dropdown" role="menu">
                      <Link href="/player" role="menuitem" className="sl-item" onClick={closeAll}>Player</Link>
                      <Link href="/parent" role="menuitem" className="sl-item" onClick={closeAll}>Parent</Link>
                      <Link href="/coach" role="menuitem" className="sl-item" onClick={closeAll}>Coach</Link>
                      <Link href="/admin" role="menuitem" className="sl-item" onClick={closeAll}>Team Admin</Link>
                    </div>
                  )}
                </div>

                <div className="sl-mobile-sep" />

                <Link href="/faq" className="sl-item" onClick={closeAll}>FAQ</Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
