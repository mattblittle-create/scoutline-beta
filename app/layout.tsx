// app/layout.tsx
import "./globals.css";
import React from "react";
import SiteHeader from "./components/SiteHeader";

export const metadata = {
  title: "ScoutLine",
  description: "Athlete recruiting platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          margin: 0,
        }}
      >
        <SiteHeader />

        <main
          style={{
            padding: 24,
            maxWidth: 1024,
            margin: "0 auto",
          }}
        >
          {children}
        </
