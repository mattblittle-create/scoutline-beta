// app/api/player/billing/activation-summary/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ActivationSummaryError,
  calculateActivationSummary,
} from "@/lib/billing/calculateActivationSummary";

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    const summary =
      calculateActivationSummary({
        plan: body?.plan,
        cadence: body?.cadence,
        paymentMethod:
          body?.paymentMethod,
        discountCode:
          body?.discountCode,
      });

    return NextResponse.json(summary);
  } catch (error) {
    if (
      error instanceof
      ActivationSummaryError
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status: 400,
        }
      );
    }

    console.error(
      "PLAYER_BILLING_ACTIVATION_SUMMARY_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to calculate summary",
      },
      {
        status: 500,
      }
    );
  }
}