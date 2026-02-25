// app/api/admin/billing/discounts/resolve-target/route.ts
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import { resolveDiscountTarget } from "@/lib/admin/resolveDiscountTarget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return jsonError(401, "Unauthorized.");

  const { searchParams } = new URL(req.url);
  const targetType = String(searchParams.get("targetType") || "");
  const q = String(searchParams.get("q") || "");

  const res = await resolveDiscountTarget({ targetTypeRaw: targetType, qRaw: q });

  // NOTE: for "not found" we return 200 with ok:false so UI can show message without treating it as fatal
  if (!res.ok) return NextResponse.json(res, { status: 200 });

  return NextResponse.json(res);
}