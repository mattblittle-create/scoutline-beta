// app/api/player/public/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Legacy endpoint expects ?slug=...
  const slug = url.searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  // Forward to the real endpoint: /api/public/player/[slug]
  const forwardUrl = new URL(`/api/public/player/${encodeURIComponent(slug)}`, url.origin);

  // Preserve debug/fresh/nocache/demo if present (harmless passthrough)
  const passthroughParams = ["debug", "fresh", "nocache", "demo"];
  for (const key of passthroughParams) {
    const v = url.searchParams.get(key);
    if (v != null) forwardUrl.searchParams.set(key, v);
  }

  try {
    const res = await fetch(forwardUrl.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    const bodyText = await res.text();

    // Pass through status; force no-store so nobody caches legacy responses
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json; charset=utf-8",
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Proxy failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}