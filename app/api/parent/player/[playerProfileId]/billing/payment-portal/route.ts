// app/api/parent/player/[playerProfileId]/billing/payment-portal/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type Ctx = {
  params: {
    playerProfileId: string;
  };
};

async function requireLinkedParent(playerProfileId: string, userId: string) {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!parentProfile?.id) return null;

  const link = await prisma.parentPlayerLink.findUnique({
    where: {
      parentProfileId_playerProfileId: {
        parentProfileId: parentProfile.id,
        playerProfileId,
      },
    },
    select: {
      id: true,
      playerProfile: {
        select: {
          id: true,
          playerBillingProfile: {
            select: {
              provider: true,
              providerCustomerId: true,
              providerPaymentRef: true,
            },
          },
        },
      },
    },
  });

  return link;
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const playerProfileId = String(ctx?.params?.playerProfileId || "").trim();
    if (!playerProfileId) {
      return NextResponse.json(
        { ok: false, error: "Missing player profile id." },
        { status: 400 }
      );
    }

    const link = await requireLinkedParent(playerProfileId, user.id);
    if (!link?.playerProfile?.id) {
      return NextResponse.json(
        { ok: false, error: "Parent access not allowed for this player." },
        { status: 403 }
      );
    }

    const billingProfile = link.playerProfile.playerBillingProfile;

    if (
      billingProfile?.providerPaymentRef &&
      /^https?:\/\//i.test(billingProfile.providerPaymentRef)
    ) {
      return NextResponse.json({
        ok: true,
        url: billingProfile.providerPaymentRef,
      });
    }

    return NextResponse.json({
      ok: true,
      url: `/dashboard/parent/player/${encodeURIComponent(
        playerProfileId
      )}/billing`,
      message:
        "Billing portal is not connected yet for this player account. The parent-side action is wired and ready for provider integration.",
    });
  } catch (err: any) {
    console.error("[parent billing portal] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to open billing portal." },
      { status: 500 }
    );
  }
}