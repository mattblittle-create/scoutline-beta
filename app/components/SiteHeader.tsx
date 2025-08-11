"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current || !btnRef.current) return;
      if (!menuRef.current.contains(t) && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);

  return (
    <header style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
      <nav
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Logo */}
        <Link href="/" aria-label="ScoutLine home" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Image
            src="/scoutline-logo-gold.svg"
            alt="ScoutLine"
            width={720}
            height={160}
            priority
            style={{ height: 160, width: "auto", display: "block" }}
            sizes="(max-width: 640px) 100vw, 720px"
          />
        </Link>

        {/* Nav */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/" onClick={close}>Home</Link>
          <Link href="/about" onClick={close}>About</Link>
          <Link href="/recruiting-journey" onClick={close}>Recruiting Journey</Link>
          <Link href="/pricing" onClick={close}>Pricing</Link>

          {/* Log In dropdown */}
          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
              style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
            >
              Log In ▾
            </button>
            {open && (
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
                <Link href="/player" role="menuitem" onClick={close} style={item}>Player</Link>
                <Link href="/parent" role="menuitem" onClick={close} style={item}>Parent</Link>
                <Link href="/coach" role="menuitem" onClick={close} style={item}>Coach</Link>
                <Link href="/admin" role="menuitem" onClick={close} style={item}>Team Admin</Link>
              </div>
            )}
          </div>

          <Link href="/faq" onClick={close}>FAQ</Link>
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
