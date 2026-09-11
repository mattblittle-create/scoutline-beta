// app/dashboard/player/profile/billing/page.tsx
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

import Link from "next/link";

import DevPlayerSelector from "./DevPlayerSelector";
import PlayerBillingAdminTools from "./PlayerBillingAdminTools";
import BillingDiscountCodeRedeem from "../../../team/billing/BillingDiscountCodeRedeem";
import PlayerBillingInvoices from "./PlayerBillingInvoices";
import PlayerBillingPaymentMethod from "./PlayerBillingPaymentMethod";
import { getTeamSponsoredBillingInfo } from "@/lib/billing/getTeamSponsoredBillingInfo";

import {
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";

function formatUSD(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const PRICE_CENTS = {
  monthly: {
    REDSHIRT: 0,
    WALK_ON: 2495,
    ALL_AMERICAN: 4995,
  },
  annual: {
    REDSHIRT: 0,
    WALK_ON: 26500,
    ALL_AMERICAN: 51000,
  },
} as const;

function getDevPlayerProfileIdFromCookie(): string | null {
  try {
    const v = cookies().get("scoutline_dev_playerProfileId")?.value || null;
    return v ? decodeURIComponent(v) : null;
  } catch {
    return null;
  }
}

function computeDerivedStatusFromInvoices(
  invoices: Array<{ status: string }>,
  hasBillingProfile: boolean
) {
  const hasPastDue = invoices.some(
    (i) => i.status === "PAST_DUE" || i.status === "OPEN"
  );

  if (hasPastDue) return "PastDue";

  if (!hasBillingProfile) {
    return PLAYER_BILLING_STATUS.PENDING;
  }

  return "Active";
}

function fmtDate(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString("en-US");
}

/**
 * Dev-only invoice seed helper.
 * IMPORTANT: In early dev, Prisma may not have PlayerInvoice model yet.
 * This function must be safe to call even if prisma.playerInvoice doesn't exist.
 */
async function ensureDevInvoices(playerProfileId: string, amountCents: number, cadence: "monthly" | "annual") {
  if (process.env.NODE_ENV === "production") return;

  const p: any = prisma as any;
  if (!p.playerInvoice?.count || !p.playerInvoice?.createMany) return;

  const existing = await p.playerInvoice.count({ where: { playerProfileId } });
  if (existing > 0) return;

  const now = new Date();
  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

  const periodStartUpcoming = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const periodEndUpcoming = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  const periodStartLast = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEndLast = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const periodStartPastDue = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEndPastDue = new Date(now.getFullYear(), now.getMonth(), 1);

  await p.playerInvoice.createMany({
    data: [
      {
        playerProfileId,
        status: "UPCOMING",
        cadence,
        periodStart: periodStartUpcoming,
        periodEnd: periodEndUpcoming,
        invoiceDate: now,
        dueDate: addDays(periodStartUpcoming, 5),
        amountCents,
        amountPaidCents: 0,
        paidAt: null,
        hostedUrl: "https://example.com/invoice/upcoming",
      },
      {
        playerProfileId,
        status: "PAID",
        cadence,
        periodStart: periodStartLast,
        periodEnd: periodEndLast,
        invoiceDate: addDays(periodStartLast, 1),
        dueDate: addDays(periodStartLast, 5),
        amountCents,
        amountPaidCents: amountCents,
        paidAt: addDays(periodStartLast, 3),
        hostedUrl: "https://example.com/invoice/paid",
      },
      {
        playerProfileId,
        status: "PAST_DUE",
        cadence,
        periodStart: periodStartPastDue,
        periodEnd: periodEndPastDue,
        invoiceDate: addDays(periodStartPastDue, 1),
        dueDate: addDays(periodStartPastDue, 5),
        amountCents,
        amountPaidCents: 0,
        paidAt: null,
        hostedUrl: "https://example.com/invoice/past-due",
      },
    ],
  });
}

type Cadence = "monthly" | "annual";
type PlayerPlan = "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN";

export default async function PlayerBillingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) || {};
  const qp = searchParams["playerProfileId"];
  const playerProfileIdFromQuery = Array.isArray(qp) ? qp[0] : qp;

  // ✅ single source of truth (string or null)
  const rawId = playerProfileIdFromQuery || getDevPlayerProfileIdFromCookie();
  const profileIdStr = typeof rawId === "string" && rawId.trim() ? rawId.trim() : null;

  const profile = profileIdStr
    ? await prisma.playerProfile.findUnique({
        where: { id: profileIdStr },
        select: {
          id: true,
          email: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingStatus: true,
          playerCancelRequestedAt: true,
          playerCancelEffectiveAt: true,
        },
      })
    : null;

  const nowMs = Date.now();
  const effectiveAtMs = profile?.playerCancelEffectiveAt ? new Date(profile.playerCancelEffectiveAt).getTime() : null;

  const showCancelScheduled = effectiveAtMs != null && effectiveAtMs > nowMs;
  const isCanceledNow = effectiveAtMs != null && effectiveAtMs <= nowMs;

  // Player billing page should NEVER price TEAM (TEAM is priced on team billing pages).
  const cadence = (profile?.playerBillingCadence || "monthly") as Cadence;

  // If anything upstream ever feeds TEAM into player billing, we safely coerce it to WALK_ON.
  const planTierRaw = String((profile as any)?.playerPlanTier || "WALK_ON").toUpperCase();
  const planTier: PlayerPlan =
    planTierRaw === "REDSHIRT" || planTierRaw === "WALK_ON" || planTierRaw === "ALL_AMERICAN"
      ? (planTierRaw as PlayerPlan)
      : "WALK_ON";

  const BASE_PRICE_CENTS: Record<Cadence, Record<PlayerPlan, number>> = {
    monthly: { REDSHIRT: 0, WALK_ON: 2495, ALL_AMERICAN: 4995 },
    annual: { REDSHIRT: 0, WALK_ON: 26500, ALL_AMERICAN: 51000 },
  };

  const baseAmountCents = BASE_PRICE_CENTS[cadence][planTier];

  // dev-safe Prisma delegates
  const p: any = prisma as any;

  // Load active discount app + discount code (if model/relations exist)
  const activeApp =
    profileIdStr && p.discountApplication?.findFirst
      ? await p.discountApplication.findFirst({
          where: {
            targetType: "PLAYER",
            targetId: profileIdStr,
            status: "ACTIVE",
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
          },
          include: {
            discountCode: true,
          },
        })
      : null;

  const discountType = activeApp?.discountCode?.type ?? null;
  const discountValue = activeApp?.discountCode?.value ?? null;

  let totalCents = baseAmountCents;
  if (discountType && typeof discountValue === "number") {
    switch (String(discountType)) {
      case "PERCENT": {
        const pct = Math.max(0, Math.min(100, discountValue));
        totalCents = Math.max(0, baseAmountCents - Math.round((baseAmountCents * pct) / 100));
        break;
      }
      case "FIXED": {
        totalCents = Math.max(0, baseAmountCents - Math.max(0, discountValue));
        break;
      }
      case "FREE_TRIAL": {
        totalCents = 0;
        break;
      }
      case "OVERRIDE_PRICE": {
        totalCents = Math.max(0, discountValue);
        break;
      }
      default:
        break;
    }
  }

  const discountCents = Math.max(0, baseAmountCents - totalCents);

  const billingProfile: { paymentType: string | null; brand: string | null; last4: string | null } | null =
    profileIdStr && p.playerBillingProfile?.findUnique
      ? await p.playerBillingProfile.findUnique({
          where: { playerProfileId: profileIdStr },
          select: { paymentType: true, brand: true, last4: true },
        })
      : null;

  // Seed dev invoices if possible
  if (profileIdStr) {
    await ensureDevInvoices(profileIdStr, totalCents, cadence);
  }

  const invoices =
    profileIdStr && p.playerInvoice?.findMany
      ? await p.playerInvoice.findMany({
          where: { playerProfileId: profileIdStr },
          orderBy: { invoiceDate: "desc" },
          take: 12,
select: {
  id: true,
  externalId: true,
  status: true,
  invoiceDate: true,
  dueDate: true,
  amountCents: true,
  cardFeeCents: true,
  amountPaidCents: true,
  paidAt: true,
  hostedUrl: true,
  processorReceiptUrl: true,
},
        })
      : [];

const derivedStatus = computeDerivedStatusFromInvoices(
  invoices,
  !!billingProfile
);

  const teamSponsoredInfo = profileIdStr
  ? await getTeamSponsoredBillingInfo(profileIdStr)
  : null;

return (
  <div style={{ padding: 16 }}>
    <DevPlayerSelector />

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 12,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Player Billing</h1>

      <Link href="/dashboard/player" style={backToDashboardStyle}>
        Back to Dashboard
      </Link>
    </div>

      <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
        {profile ? (
          <>
            {profile.email} • Status: {isCanceledNow ? "Canceled" : derivedStatus}
          </>
        ) : (
          "No player selected yet. Use the Dev Player Loader above."
        )}
      </div>

      {profile ? (
        <>
          {/* Cancellation scheduled banner */}
          {showCancelScheduled ? (
            <div
              style={{
                marginTop: 12,
                border: "1px solid #bae6fd",
                background: "#e0f2fe",
                borderRadius: 12,
                padding: 12,
                color: "#0f172a",
                fontWeight: 800,
              }}
            >
              Cancellation scheduled. Your account will remain active until {fmtDate(profile.playerCancelEffectiveAt)}.
              After that date, access will be removed and billing will stop.
            </div>
          ) : null}

          {/* Canceled notice */}
          {isCanceledNow ? (
            <div
              style={{
                marginTop: 12,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                borderRadius: 12,
                padding: 12,
                color: "#0f172a",
                fontWeight: 800,
              }}
            >
              This account is canceled. Access has been removed and billing has stopped.
            </div>
          ) : (
            <>
              {teamSponsoredInfo ? (
                <TeamSponsoredBillingCard
                  playerFirstName="Your player"
                  teamSponsoredInfo={teamSponsoredInfo}
                />
              ) : (
                <>
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Plan Summary</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Plan</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{String(planTier)}</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Cadence</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{cadence}</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Base Price</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{formatUSD(baseAmountCents)}</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Discount</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>
                      -{formatUSD(discountCents)}{" "}
                      <span style={{ color: "#64748b", fontWeight: 800 }}>
                        {activeApp?.discountCode ? `(${activeApp.discountCode.code})` : "(none)"}
                      </span>
                    </div>
                  </div>

<div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, gridColumn: "1 / span 2" }}>
  <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Total Due</div>
  <div style={{ fontSize: 18, fontWeight: 950 }}>{formatUSD(totalCents)}</div>

  <div style={{ marginTop: 8, color: "#64748b", fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>
    Debit and credit card transactions are subject to a 3% processing fee in accordance with applicable card network regulations and ScoutLine Terms &amp; Conditions. Bank account (ACH / eCheck) payments are available as a fee-free alternative.
  </div>
</div>
                </div>
              </div>

              {profileIdStr ? (
                <div style={{ marginTop: 14 }}>
                  <PlayerBillingAdminTools
                    playerProfileId={profileIdStr}
                    currentPlan={String(planTier)}
                    currentCadence={cadence}
                    derivedStatus={derivedStatus}
                  />
                </div>
              ) : null}

              <div style={{ marginTop: 14 }}>
                <BillingDiscountCodeRedeem
                  targetType="PLAYER"
                  targetId={profileIdStr ?? ""} // ✅ always string
                  planTier={String(planTier)}
                  cadence={cadence}
                  current={
                    activeApp?.discountCode
                      ? {
                          code: activeApp.discountCode.code,
                          type: String(activeApp.discountCode.type),
                          value: Number(activeApp.discountCode.value),
                          endsAt: activeApp.endsAt ? activeApp.endsAt.toISOString() : null,
                        }
                      : null
                  }
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <PlayerBillingInvoices invoices={invoices} />
              </div>

              <div style={{ marginTop: 14 }}>
                <PlayerBillingPaymentMethod playerProfileId={profileIdStr ?? ""} summary={billingProfile} />
              </div>
                </>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function TeamSponsoredBillingCard({
  playerFirstName,
  teamSponsoredInfo,
}: {
  playerFirstName: string;
  teamSponsoredInfo: {
    teamName: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
  };
}) {
  return (
    <section
      style={{
        marginTop: 14,
        border: "1px solid #dbeafe",
        borderRadius: 14,
        padding: 16,
        background: "#eff6ff",
        color: "#0f172a",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 8 }}>
        Billing Managed by Team
      </div>

      <div style={{ color: "#334155", fontWeight: 700, lineHeight: 1.55 }}>
        {playerFirstName}&apos;s ScoutLine billing is currently managed by{" "}
        <strong>{teamSponsoredInfo.teamName}</strong>. Questions or concerns
        should be directed to{" "}
        <strong>{teamSponsoredInfo.adminName}</strong>
        {teamSponsoredInfo.adminEmail ? ` at ${teamSponsoredInfo.adminEmail}` : ""}
        {teamSponsoredInfo.adminPhone ? ` or ${teamSponsoredInfo.adminPhone}` : ""}.
      </div>

      <div style={{ marginTop: 14 }}>
        <Link href="/pricing" style={selfPlanButtonStyle}>
          Start My Own Plan
        </Link>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontWeight: 700, lineHeight: 1.45 }}>
        Starting your own plan will preserve your profile, metrics, videos,
        recruiting data, and login. It only changes billing ownership.
      </div>
    </section>
  );
}

const backToDashboardStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
};

const selfPlanButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "10px 14px",
  background: "#caa042",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
};