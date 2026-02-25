// app/dashboard/player/profile/billing/page.tsx
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";
import { cookies } from "next/headers";

import DevPlayerSelector from "./DevPlayerSelector";
import PlayerBillingAdminTools from "./PlayerBillingAdminTools";
import BillingDiscountCodeRedeem from "../../../team/billing/BillingDiscountCodeRedeem";
import PlayerBillingInvoices from "./PlayerBillingInvoices";
import PlayerBillingPaymentMethod from "./PlayerBillingPaymentMethod";

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

function computeDerivedStatusFromInvoices(invoices: Array<{ status: string }>) {
  const hasPastDue = invoices.some((i) => i.status === "PAST_DUE" || i.status === "OPEN");
  return hasPastDue ? "PastDue" : "Active";
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

export default async function PlayerBillingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) || {};
  const qp = searchParams["playerProfileId"];
  const playerProfileIdFromQuery = Array.isArray(qp) ? qp[0] : qp;

  const playerProfileId = playerProfileIdFromQuery || getDevPlayerProfileIdFromCookie();

  const profile = playerProfileId
    ? await prisma.playerProfile.findUnique({
        where: { id: playerProfileId },
        select: {
          id: true,
          email: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingStatus: true,
          playerCancelRequestedAt: true,
          playerCancelEffectiveAt: true,
        } as any,
      })
    : null;

const nowMs = Date.now();
const effectiveAtMs = profile?.playerCancelEffectiveAt
  ? new Date(profile.playerCancelEffectiveAt as any).getTime()
  : null;

const showCancelScheduled = effectiveAtMs != null && effectiveAtMs > nowMs;
const isCanceledNow = effectiveAtMs != null && effectiveAtMs <= nowMs;

  const planTier = (profile?.playerPlanTier || "REDSHIRT") as Plan;
  const cadence = (profile?.playerBillingCadence || "monthly") as "monthly" | "annual";

  const baseAmountCents = PRICE_CENTS[cadence][planTier];

  const activeApp = profile
    ? await prisma.discountApplication.findFirst({
        where: {
          targetType: "PLAYER",
          targetId: profile.id,
          status: "ACTIVE",
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        orderBy: { appliedAt: "desc" },
        include: { discountCode: true },
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

  // dev-safe Prisma delegates
  const p: any = prisma as any;

  const billingProfile: { paymentType: string | null; brand: string | null; last4: string | null } | null =
    profile && p.playerBillingProfile?.findUnique
      ? await p.playerBillingProfile.findUnique({
          where: { playerProfileId: profile.id },
          select: { paymentType: true, brand: true, last4: true },
        })
      : null;

  if (profile) {
    await ensureDevInvoices(profile.id, totalCents, cadence);
  }

  const invoices =
    profile && p.playerInvoice?.findMany
      ? await p.playerInvoice.findMany({
          where: { playerProfileId: profile.id },
          orderBy: { invoiceDate: "desc" },
          take: 12,
          select: {
            id: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
            amountCents: true,
            amountPaidCents: true,
            paidAt: true,
            hostedUrl: true,
          },
        })
      : [];

  const derivedStatus = computeDerivedStatusFromInvoices(invoices);

  return (
    <div style={{ padding: 16 }}>
      <DevPlayerSelector />

      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Player Billing</h1>

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
              Cancellation scheduled. Your account will remain active until{" "}
              {fmtDate(profile.playerCancelEffectiveAt as any)}. After that date, access will be removed and billing will stop.
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
              {/* Summary */}
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
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <PlayerBillingAdminTools
                  playerProfileId={profile.id}
                  currentPlan={String(planTier)}
                  currentCadence={cadence}
                  derivedStatus={derivedStatus}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <BillingDiscountCodeRedeem
                  targetType="PLAYER"
                  targetId={profile.id}
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
                <PlayerBillingPaymentMethod playerProfileId={profile.id} summary={billingProfile} />
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
