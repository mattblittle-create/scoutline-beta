// app/dashboard/team/billing/page.tsx

import { prisma } from "@/lib/prisma";
import { getCurrentTeam } from "@/lib/team/getCurrentTeam";
import { PLAN_PRICES_CENTS } from "@/lib/billing/plans";

import DevTeamSelector from "./DevTeamSelector";
import BillingAdminTools from "./BillingAdminTools";
import BillingDiscountCodeRedeem from "./BillingDiscountCodeRedeem";

import BillingInvoices from "./BillingInvoices";
import BillingPaymentMethod from "./BillingPaymentMethod";

function formatUSD(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const TEAM_UNIT_PRICE_FALLBACK_CENTS = 3995;

function getTeamUnitPriceCents(cadence: string) {
  const fromConst = (PLAN_PRICES_CENTS as any)?.TEAM?.[cadence];
  if (typeof fromConst === "number" && fromConst > 0) return fromConst;
  return TEAM_UNIT_PRICE_FALLBACK_CENTS;
}

function computeTotalCents(args: {
  baseTotalCents: number;
  seats: number;
  discountType?: string | null;
  discountValue?: number | null;
}) {
  const base = Math.max(0, args.baseTotalCents);
  const seats = Math.max(0, args.seats);
  const type = args.discountType || null;
  const value = typeof args.discountValue === "number" ? args.discountValue : null;

  if (!type || value == null) return base;

  switch (type) {
    case "PERCENT": {
      const pct = Math.max(0, Math.min(100, value));
      const off = Math.round((base * pct) / 100);
      return Math.max(0, base - off);
    }
    case "FIXED": {
      const off = Math.max(0, value);
      return Math.max(0, base - off);
    }
    case "FREE_TRIAL":
      return 0;
    case "OVERRIDE_PRICE": {
      // TEAM semantics: value = override UNIT PRICE cents per active player
      const overrideUnit = Math.max(0, value);
      return seats * overrideUnit;
    }
    default:
      return base;
  }
}

function fmtDate(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString("en-US");
}

export default async function TeamBillingPage() {
  const team = await getCurrentTeam();

  // If canceled effective has passed, getCurrentTeam returns null
  const teamId = team?.id || null;

  const dbTeam = teamId
    ? await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          slug: true,
          planTier: true,
          billingCadence: true,
          billingStatus: true,
          billingMode: true,
          sponsorName: true,
          sponsorNote: true,
          cancelRequestedAt: true,
          cancelEffectiveAt: true,
        } as any,
      })
    : null;

  // If no team selected or canceled, still show dev loader, but block the billing UI.
const billingStatus =
  typeof (dbTeam as any)?.billingStatus === "string"
    ? (dbTeam as any).billingStatus
    : "";

const billingMode =
  typeof (dbTeam as any)?.billingMode === "string"
    ? (dbTeam as any).billingMode
    : "";

const teamName =
  typeof (dbTeam as any)?.name === "string"
    ? (dbTeam as any).name
    : "";

const sponsorName =
  typeof (dbTeam as any)?.sponsorName === "string"
    ? (dbTeam as any).sponsorName
    : "";

const planTier =
  typeof (dbTeam as any)?.planTier === "string"
    ? (dbTeam as any).planTier
    : "Teams";

const isCanceledNow = billingStatus === "Canceled";

const teamIdStr =
  typeof (dbTeam as any)?.id === "string"
    ? (dbTeam as any).id
    : "";

const seats = teamIdStr
  ? await prisma.teamMembership.count({
      where: { teamId: teamIdStr, role: "PLAYER", isActive: true },
    })
  : 0;

const cadence = "monthly";
const unitPriceCents = getTeamUnitPriceCents(cadence);
const baseTotalCents = seats * unitPriceCents;

const activeApp = teamIdStr
  ? await prisma.discountApplication.findFirst({
      where: {
        targetType: "TEAM",
        targetId: teamIdStr,
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

  const totalCents = computeTotalCents({
    baseTotalCents,
    seats,
    discountType: discountType ? String(discountType) : null,
    discountValue: typeof discountValue === "number" ? discountValue : null,
  });

  const discountCents = Math.max(0, baseTotalCents - totalCents);

const billingProfile = teamIdStr
  ? await prisma.teamBillingProfile.findUnique({
      where: { teamId: teamIdStr },
      select: { paymentType: true, brand: true, last4: true },
    })
  : null;

const invoices = teamIdStr
  ? await prisma.teamInvoice.findMany({
      where: { teamId: teamIdStr },
      orderBy: { periodStart: "desc" },
      take: 12,
      select: {
          id: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          amountCents: true,
          hostedUrl: true,
          paidAt: true,
          createdAt: true,
        } as any,
      })
    : [];

  const showCancelScheduled =
    Boolean(dbTeam?.cancelRequestedAt) &&
    Boolean(dbTeam?.cancelEffectiveAt) &&
    (dbTeam!.cancelEffectiveAt as any).getTime() > Date.now();

  return (
    <div style={{ padding: 16 }}>
      <DevTeamSelector />

      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Team Billing</h1>

      <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
        {dbTeam ? (
<>
  {teamName} • Status: {billingStatus} • Mode: {billingMode}
  {billingMode === "SPONSORED" && sponsorName ? ` • Sponsor: ${sponsorName}` : ""}
</>
        ) : (
          "No team selected yet. Use the Dev Team Loader above."
        )}
      </div>

      {dbTeam ? (
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
              Cancellation scheduled. Your Teams account will remain active until{" "}
              {fmtDate(dbTeam.cancelEffectiveAt as any)}. After that date, access will be removed and billing will stop.
            </div>
          ) : null}

          {/* If canceled already, show final notice and stop rendering billing controls */}
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
              This Teams account is canceled. Access has been removed and billing has stopped.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Plan Summary</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Plan</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{planTier}</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Cadence</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>monthly</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Active Players (Seats)</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{seats}</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Unit Price (per player)</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{formatUSD(unitPriceCents)}</div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Base Total</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{formatUSD(baseTotalCents)}</div>
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
                <BillingAdminTools
                  teamId={teamIdStr}
                  planTier={planTier}
                  billingCadence="monthly"
                  billingStatus={billingStatus}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <BillingDiscountCodeRedeem
                  targetType="TEAM"
                  targetId={teamIdStr}
                  planTier={planTier}
                  cadence="monthly"
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
                <BillingInvoices invoices={invoices as any} />
              </div>

              <div style={{ marginTop: 14 }}>
                <BillingPaymentMethod teamId={teamIdStr} summary={billingProfile} />
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
