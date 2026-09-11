//  app/api/player/current-card-route/route.ts

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const slug = user.slug || "";

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "No public player slug found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      cardUrl: `/player/${encodeURIComponent(slug)}/card`,
      slug,
    },
  });
}