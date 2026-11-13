import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { valorFailureMessage } from "@/lib/payments/providers/valorPaymentOutcome";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view payment status." }, { status: 401 });
  const reference = req.nextUrl.searchParams.get("reference") || "";
  if (!reference) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
  const invoice = await prisma.playerInvoice.findFirst({
    where: { externalId: reference, playerProfile: { userId: user.id } },
    select: { status: true, amountCents: true, cardFeeCents: true, amountPaidCents: true, processorResponseCode: true, failureReason: true },
  });
  if (!invoice) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  const code = invoice.processorResponseCode || "";
  const failed = ["REVERSED", "VOIDED", "FAILED", "DECLINED"].includes(code) || ["PAST_DUE", "VOID"].includes(invoice.status);
  const success = !failed && invoice.status === "PAID" && invoice.amountPaidCents > 0;
  return NextResponse.json({
    state: failed ? "failed" : success ? "success" : "pending",
    message: failed ? (invoice.failureReason || valorFailureMessage(code)) : success
      ? "Payment approved. Your subscription is active."
      : "Your payment is not yet confirmed. Do not retry while verification is pending.",
    canRetry: failed,
    payment: success || failed ? {
      subtotalCents: invoice.amountCents,
      feeCents: invoice.cardFeeCents,
      totalCents: invoice.amountCents + invoice.cardFeeCents,
      paidCents: invoice.amountPaidCents,
    } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
