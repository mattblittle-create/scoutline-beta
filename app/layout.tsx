import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import SiteHeader from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "ScoutLine",
  description: "Athlete recruiting platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          margin: 0,
        }}
      >
        <SiteHeader />
        <main style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>{children}</main>
        <footer
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "12px 16px",
            color: "#6b7280",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} ScoutLine • Beta
        </footer>
      </body>
    </html>
  );
}
