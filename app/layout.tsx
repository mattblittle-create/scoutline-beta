// app/layout.tsx
import "./globals.css";
import React from "react";
import SiteHeader from "./components/SiteHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
          margin: 0,
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        {/* Global overrides to make the header more compact across all pages */}
        <style>{`
          /* tighten vertical space above/below the logo + nav */
          .sl-nav { padding: 6px 12px !important; }            /* was ~12px 16px */
          header.sl-header { padding-top: 6px !important; padding-bottom: 6px !important; }

          /* shrink the logo a bit to reduce perceived header height */
          .sl-logo { max-width: 280px !important; }            /* was 360px default */
          @media (max-width: 768px) {
            .sl-logo { max-width: 200px !important; }          /* was 300px on mobile */
          }
          @media (max-width: 480px) {
            .sl-logo { max-width: 170px !important; }          /* was 200px on small screens */
          }
        `}</style>

        {/* Header (client component with dropdowns/hamburger) */}
        <SiteHeader />

        {/* Page content */}
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
          {children}
        </main>

        {/* Footer */}
       <footer
  style={{
    borderTop: "1px solid #e5e7eb",
    padding: "12px 16px",
    color: "#6b7280",
    fontSize: 12,
  }}
>
  <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
    <span>© {new Date().getFullYear()} ScoutLine</span>
    <nav style={{ display: "flex", gap: 16 }}>
      <a href="/terms" style={{ color: "#6b7280", textDecoration: "none" }}>Terms &amp; Conditions</a>
      <a href="/privacy" style={{ color: "#6b7280", textDecoration: "none" }}>Privacy Policy</a>
    </nav>
  </div>
</footer>

      </body>
    </html>
  );
}
