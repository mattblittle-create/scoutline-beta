// app/api/admin/billing/send-payment-update-email/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaymentUpdateEmail } from "@/lib/email/sendPaymentUpdateEmail";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";

export const dynamic = "force-dynamic";

function formatUSD(cents: number | null | undefined) {
  return ((cents || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.myscoutline.com"
  ).replace(/\/$/, "");
}

function getPlayerName(data: any, fallbackEmail: string) {
  const firstName =
    data?.normalized?.firstName ||
    data?.firstName ||
    data?.playerFirstName ||
    "";

  const lastName =
    data?.normalized?.lastName ||
    data?.lastName ||
    data?.playerLastName ||
    "";

  const full = `${firstName} ${lastName}`.trim();

  return full || fallbackEmail;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const invoiceId = String(body?.invoiceId || "").trim();

    if (!invoiceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing invoiceId.",
        },
        { status: 400 }
      );
    }

    const invoice = await prisma.playerInvoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        playerProfile: {
          include: {
            user: true,

            parentLinks: {
              include: {
                parentProfile: {
                  include: {
                    user: {
                      select: {
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invoice not found.",
        },
        { status: 404 }
      );
    }

    const playerEmail = String(
      invoice.playerProfile.email || ""
    )
      .trim()
      .toLowerCase();

    const parentEmails =
      invoice.playerProfile.parentLinks
        ?.map((link: any) =>
          String(link?.parentProfile?.user?.email || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean) || [];

    const recipients = Array.from(
      new Set([playerEmail, ...parentEmails].filter(Boolean))
    );

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No recipient email found.",
        },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();

    const updateUrl =
      `${baseUrl}/dashboard/player/profile/billing/update-payment` +
      `?playerProfileId=${encodeURIComponent(invoice.playerProfileId)}` +
      `&invoiceId=${encodeURIComponent(invoice.id)}`;

    const amountDueText = formatUSD(
      Number(invoice.amountCents || 0) +
        Number(invoice.cardFeeCents || 0)
    );

    const playerName = getPlayerName(
      invoice.playerProfile.data,
      playerEmail
    );

    const sendResults = [];

    for (const to of recipients) {
      const result = await sendPaymentUpdateEmail({
        to,
        playerName,
        updateUrl,
        invoiceNumber: invoice.externalId || invoice.id,
        amountDueText,
      });

      sendResults.push({
        to,
        id: (result as any)?.data?.id ?? null,
      });
    }

    await createBillingAuditLog({
      actorType: "ADMIN",

      targetType: "PLAYER_INVOICE",
      targetId: invoice.id,

      eventType: "PAYMENT_UPDATE_EMAIL_SENT",

      message: `Payment update email sent for invoice ${
        invoice.externalId || invoice.id
      }.`,

      metadata: {
        invoiceId: invoice.id,
        playerProfileId: invoice.playerProfileId,
        externalId: invoice.externalId,
        recipients,
        amountDueText,
        updateUrl,
        sendResults,
      },
    });

    return NextResponse.json({
      ok: true,
      sent: true,
      recipients,
      sendResults,
      updateUrl,
    });
  } catch (error) {
    console.error(
      "SEND_PAYMENT_UPDATE_EMAIL_ERROR",
      error
    );

    await createBillingAuditLog({
      actorType: "ADMIN",

      targetType: "ADMIN_BILLING",
      targetId: "SEND_PAYMENT_UPDATE_EMAIL",

      eventType: "PAYMENT_UPDATE_EMAIL_ERROR",

      message:
        "Unhandled error while sending payment update email.",

      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to send payment update email.",
      },
      { status: 500 }
    );
  }
}