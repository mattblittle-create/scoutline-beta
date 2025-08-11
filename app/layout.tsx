import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial", margin: 0 }}>
        <header style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <nav style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", padding: "12px 16px", flexWrap: "wrap" }}>
            
            {/* Massive Logo */}
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

            {/* Nav Links */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              <Link href="/recruiting-journey">Recruiting Journey</Link>
              <Link href="/pricing">Pricing</Link>

              {/* Log In dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setLoginOpen(!loginOpen)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    font: "inherit",
                    padding: 0,
                  }}
                >
                  Log In ▾
                </button>
                {loginOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      background: "#fff",
                      border: "1px solid #ddd",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      zIndex: 50,
                      minWidth: 160,
                    }}
                  >
                    <Link href="/player" style={{ display: "block", padding: "8px 12px" }}>Player</Link>
                    <Link href="/parent" style={{ display: "block", padding: "8px 12px" }}>Parent</Link>
                    <Link href="/coach" style={{ display: "block", padding: "8px 12px" }}>Coach</Link>
                    <Link href="/admin" style={{ display: "block", padding: "8px 12px" }}>Team Admin</Link>
                  </div>
                )}
              </div>

              <Link href="/faq">FAQ</Link>
            </div>
          </nav>
        </header>

        <main style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>{children}</main>

        <footer style={{ borderTop: "1px solid #e5e7eb", padding: "12px 16px", color: "#6b7280", fontSize: 12, textAlign: "center" }}>
          © {new Date().getFullYear()} ScoutLine • Beta
        </footer>
      </body>
    </html>
  );
}
