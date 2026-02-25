// app/api/admin/billing/invoices/mark-paid/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  // DEV ONLY safeguard
  if (process.env.NODE_ENV === "production") {
    return jsonError(404, "Not found.");
  }

  const ctx = await getAdminContext().catch(() => null);
  if (!ctx?.ok) return jsonError(401, "Unauthorized.");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const type = String(body?.type || "").trim().toUpperCase();
  const invoiceId = String(body?.invoiceId || "").trim();
  const amountPaidCentsRaw = body?.amountPaidCents;

  if (!invoiceId) return jsonError(400, "Missing invoiceId.");
  if (type !== "PLAYER" && type !== "TEAM") return jsonError(400, "Invalid type. Expected PLAYER or TEAM.");

  const now = new Date();

  try {
    if (type === "PLAYER") {
      // PlayerInvoice has amountPaidCents + paidAt
      const inv = await prisma.playerInvoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, status: true, amountCents: true, amountPaidCents: true },
      });

      if (!inv) return jsonError(404, "Player invoice not found.");

      const amountPaidCents =
        Number.isFinite(Number(amountPaidCentsRaw)) && Number(amountPaidCentsRaw) >= 0
          ? Number(amountPaidCentsRaw)
          : inv.amountCents;

      const updated = await prisma.playerInvoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAt: now,
          amountPaidCents,
        },
        select: { id: true, status: true, paidAt: true, amountCents: true, amountPaidCents: true },
      });

      return NextResponse.json({ ok: true, updated });
    }

    // TEAM
    // TeamInvoice only has paidAt (no amountPaidCents in your schema)
    const inv = await prisma.teamInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, amountCents: true },
    });

    if (!inv) return jsonError(404, "Team invoice not found.");

    const updated = await prisma.teamInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: now,
      },
      select: { id: true, status: true, paidAt: true, amountCents: true },
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    console.error("mark-paid error:", e);
    return jsonError(500, e?.message || "Server error.");
  }
}
