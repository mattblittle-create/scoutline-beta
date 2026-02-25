// app/view-video/page.tsx

export default function ViewVideoPage({
  searchParams,
}: {
  searchParams?: { src?: string; type?: string; title?: string };
}) {
  const src = decodeURIComponent(searchParams?.src ?? "");
  const type = decodeURIComponent(searchParams?.type ?? "");
  const title = decodeURIComponent(searchParams?.title ?? "");

  // Basic guard: only allow files we serve from /public/uploads
  const isAllowed = src.startsWith("/uploads/");
  const safeTitle =
    title || (isAllowed ? src.split("/").pop() || "Video" : "Video");

  if (!isAllowed) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 12 }}>
          Invalid video URL
        </h1>
        <p style={{ color: "#6b7280" }}>
          Only files served from <code>/uploads/…</code> are allowed in this viewer.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 12 }}>
        {safeTitle}
      </h1>

      <video
        controls
        preload="metadata"
        playsInline
        style={{ width: "100%", borderRadius: 12, background: "#111", height: 480, maxHeight: "70vh" }}
      >
        {/* Providing a <source> helps the browser choose the right decoder */}
        <source src={src} type={type || undefined} />
        Your browser can’t play this video. You can{" "}
        <a href={src} download>
          download it here
        </a>
        .
      </video>

      <div style={{ marginTop: 12 }}>
        <a href={src} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          Open raw file
        </a>
        {" · "}
        <a href={src} download style={{ textDecoration: "none" }}>
          Download
        </a>
      </div>
    </main>
  );
}
