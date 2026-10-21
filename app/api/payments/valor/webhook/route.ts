// app/api/payments/valor/webhook/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createBillingAuditLog } from "@/lib/billing/billingAudit";

import {
  isValorValidationPing,
  normalizeValorWebhook,
  verifyValorSignature,
} from "@/lib/payments/providers/valorWebhook";

import {
  applyFailedPlayerPayment,
  applySuccessfulPlayerPayment,
} from "@/lib/payments/processPlayerPaymentWebhook";

import { getValorPaymentOutcome } from "@/lib/payments/providers/valorPaymentOutcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse("OK", {
    status: 200,
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: "GET,HEAD,POST,OPTIONS",
    },
  });
}

export async function POST(
  req: NextRequest
) {
  try {
    const webhookSecret =
      process.env.VALOR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        {
          error:
            "Missing VALOR_WEBHOOK_SECRET.",
        },
        {
          status: 500,
        }
      );
    }

    const rawBody = await req.text();

    console.log(
      "VALOR_WEBHOOK_RECEIVED",
      {
        method: req.method,
        contentLength:
          rawBody.length,
        hasSignature: Boolean(
          req.headers.get(
            "Valor-Signature"
          )
        ),
        hasTimestamp: Boolean(
          req.headers.get(
            "Valor-Timestamp"
          )
        ),
      }
    );

    if (!rawBody.trim()) {
      return new NextResponse("OK", {
        status: 200,
      });
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON payload.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      isValorValidationPing(payload)
    ) {
      return NextResponse.json({
        ok: true,
        received: true,
      });
    }

    const signature =
      req.headers.get(
        "Valor-Signature"
      ) || "";

    const timestamp =
      req.headers.get(
        "Valor-Timestamp"
      ) || "";

    if (!signature || !timestamp) {
      console.warn(
        "VALOR_WEBHOOK_MISSING_AUTH_HEADERS",
        {
          hasSignature:
            Boolean(signature),

          hasTimestamp:
            Boolean(timestamp),

        }
      );

      return NextResponse.json({ error: "Missing Valor authentication headers." }, { status: 401 });
    }

    if (signature && timestamp) {
      const valid =
        verifyValorSignature({
          rawBody,
          timestamp,
          signature,
          secret: webhookSecret,
        });

      if (!valid) {
        return NextResponse.json(
          {
            error:
              "Invalid webhook signature.",
          },
          {
            status: 401,
          }
        );
      }
    }

    const normalized =
      normalizeValorWebhook(payload);

    if (!normalized.reference) {
      console.warn(
        "VALOR_WEBHOOK_MISSING_REFERENCE",
        {
          event:
            normalized.rawEvent,

          status:
            normalized.status,

          transactionId:
            normalized.transactionId,
        }
      );

      await createBillingAuditLog({
        actorType: "SYSTEM",

        targetType: "WEBHOOK",
        targetId: "VALOR",

        eventType:
          "WEBHOOK_REFERENCE_MISSING",

        message:
          "Valor webhook received without transaction reference.",

        metadata: {
          event:
            normalized.rawEvent,

          status:
            normalized.status,

          transactionId:
            normalized.transactionId,
        },
      });

      return NextResponse.json(
        {
          error:
            "Missing transaction reference.",
        },
        {
          status: 400,
        }
      );
    }

    const outcome = getValorPaymentOutcome(payload);
    if (!normalized.transactionId) {
      return NextResponse.json({ error: "Missing transaction identity." }, { status: 400 });
    }
    if (!outcome.approved && !outcome.definitiveFailure) {
      // Unknown, authorization-only and unrelated events must never activate or
      // fail a subscription. A customer must not retry an ambiguous charge.
      return NextResponse.json({ ok: true, received: true, action: "IGNORED", status: outcome.status });
    }

    if (normalized.approved) {
      const result =
        await applySuccessfulPlayerPayment({
          provider: "VALOR",
          normalized,
        });

      return NextResponse.json({
        ok: true,
        received: true,
        approved: true,

        alreadyProcessed:
          result.alreadyProcessed,

        reference:
          normalized.reference,

        transactionId:
          normalized.transactionId,
      });
    }

    await applyFailedPlayerPayment({
      provider: "VALOR",
      normalized,
    });

    return NextResponse.json({
      ok: true,
      received: true,
      approved: false,

      reference:
        normalized.reference,

      transactionId:
        normalized.transactionId,
    });
  } catch (error) {
    console.error(
      "VALOR_WEBHOOK_ERROR",
      error
    );

    await createBillingAuditLog({
      actorType: "SYSTEM",

      targetType: "WEBHOOK",
      targetId: "VALOR",

      eventType:
        "WEBHOOK_ERROR",

      message:
        "Unhandled Valor webhook error.",

      metadata: {
        error:
          error instanceof Error
            ? {
                message:
                  error.message,

                stack:
                  error.stack,
              }
            : String(error),
      },
    });

    return NextResponse.json(
      {
        error:
          "Webhook handler failed.",
      },
      {
        status: 500,
      }
    );
  }
}