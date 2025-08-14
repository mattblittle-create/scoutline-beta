// app/page.tsx
import HeroBanner from "./components/HeroBanner";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      {/* Intentionally minimal: the headline/line and "Why ScoutLine" moved to /recruiting-journey */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* You can add any lightweight home-only content here later */}
      </main>
    </>
  );
}
