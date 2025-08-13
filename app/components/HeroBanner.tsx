"use client";
import Image from "next/image";

export default function HeroBanner() {
  return (
    <section style={{ position: "relative", width: "100%", height: "38vh", overflow: "hidden" }}>
      {/* Full-bleed background image */}
      <Image
        src="/track_pic_homepage.jpg"
        alt="Running track starting lanes leading forward"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />

      {/* Soft fade into the page background (NOT fully opaque) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,.88) 100%)",
          pointerEvents: "none",
        }}
      />
    </section>
  );
}
