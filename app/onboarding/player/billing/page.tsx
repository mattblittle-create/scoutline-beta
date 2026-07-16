// app/onboarding/player/billing/page.tsx

"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentMethod } from "@/lib/payments/types";
import { formatUsd } from "@/lib/billing/money";

type Summary = {
  plan: string;
  cadence: "monthly" | "annual";
  paymentMethod: PaymentMethod;
  basePrice: number;
  discountAmount: number;
  discountedPrice: number;
  surchargeAmount: number;
  finalPrice: number;
  error?: string;
};

const PAYMENTS_DISABLED =
  process.env.NEXT_PUBLIC_SC_PAYMENTS_DISABLED === "true";

function PlayerBillingPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [plan, setPlan] = useState<"WALK_ON" | "ALL_AMERICAN">("WALK_ON");
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(PaymentMethod.CARD);
  const [discountCode, setDiscountCode] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [playerProfileId, setPlayerProfileId] = useState("");
  const [pageError, setPageError] = useState("");

  const paymentState = searchParams.get("payment") || "";
  const paymentMessage = searchParams.get("message") || "";
  const paymentRef = searchParams.get("ref") || "";

  useEffect(() => {
  if (PAYMENTS_DISABLED) {
    router.replace("/dashboard/player");
  }
}, [router]);

if (PAYMENTS_DISABLED) {
  return null;
}

  const banner = useMemo(() => {
    if (!paymentState && !paymentMessage) return null;

    let background = "#f5f5f5";
    let border = "#d9d9d9";

    if (paymentState === "success") {
      background = "#edfdf3";
      border = "#b7ebc6";
    } else if (paymentState === "processing" || paymentState === "pending") {
      background = "#fffbe6";
      border = "#ffe58f";
    } else if (paymentState === "failed" || paymentState === "error") {
      background = "#fff1f0";
      border = "#ffa39e";
    }

    return {
      background,
      border,
      message: paymentMessage || "Payment status updated.",
    };
  }, [paymentMessage, paymentState]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setPageError("");

      const res = await fetch("/api/player/billing/activation-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          cadence,
          discountCode,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSummary(null);
        setPageError(data?.error || "Failed to calculate billing summary.");
        return;
      }

      setSummary(data);
    } catch (error) {
      console.error("PLAYER_BILLING_SUMMARY_ERROR", error);
      setSummary(null);
      setPageError("Failed to calculate billing summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, cadence, paymentMethod]);

  useEffect(() => {
    const fromQuery = searchParams.get("playerProfileId");
    if (fromQuery) {
      setPlayerProfileId(fromQuery);
      return;
    }

    let cancelled = false;

    async function hydratePlayerProfileId() {
      try {
        setPageError("");

        const meRes = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const meData = await meRes.json().catch(() => null);
        const email =
          meData?.email ||
          meData?.user?.email ||
          meData?.data?.email ||
          "";

        if (!meRes.ok || !email) {
          if (!cancelled) {
            setPageError("Could not determine the logged-in player account.");
          }
          return;
        }

        const profileRes = await fetch(
          `/api/player/profile?email=${encodeURIComponent(email)}`,
          {
            cache: "no-store",
          }
        );

        const profileData = await profileRes.json().catch(() => null);

        const resolvedProfileId = profileData?.playerProfileId || "";

        if (!profileRes.ok || !resolvedProfileId) {
          if (!cancelled) {
            setPageError("Could not find the player profile for billing.");
          }
          return;
        }

        if (!cancelled) {
          setPlayerProfileId(resolvedProfileId);
        }
      } catch (error) {
        console.error("PLAYER_BILLING_PROFILE_LOOKUP_ERROR", error);
        if (!cancelled) {
          setPageError("Could not load player billing details.");
        }
      }
    }

    hydratePlayerProfileId();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleCheckout = async () => {
    try {
      if (!summary) {
        setPageError("Please wait for pricing to finish loading.");
        return;
      }

      if (!playerProfileId) {
        setPageError("Missing player profile ID for billing checkout.");
        return;
      }

      setCheckoutLoading(true);
      setPageError("");

      const res = await fetch("/api/payments/valor/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          cadence,
          discountCode,
          paymentMethod,
          playerProfileId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPageError(data?.error || "Failed to create checkout.");
        return;
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setPageError("Checkout URL was not returned.");
    } catch (error) {
      console.error("PLAYER_BILLING_CHECKOUT_ERROR", error);
      setPageError("Failed to start checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>Complete Your Subscription</h1>

      {banner && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: `1px solid ${banner.border}`,
            background: banner.background,
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Payment Status: {paymentState || "updated"}
          </div>
          <div>{banner.message}</div>
          {paymentRef ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
              Reference: {paymentRef}
            </div>
          ) : null}
        </div>
      )}

      {pageError ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: "1px solid #ffa39e",
            background: "#fff1f0",
            borderRadius: 8,
          }}
        >
          {pageError}
        </div>
      ) : null}

      {!playerProfileId ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: "1px solid #ffe58f",
            background: "#fffbe6",
            borderRadius: 8,
          }}
        >
          Loading player billing details...
        </div>
      ) : null}

      <div>
        <label>Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as "WALK_ON" | "ALL_AMERICAN")}
          style={{ display: "block", marginTop: 6, minWidth: 220 }}
        >
          <option value="WALK_ON">Walk-On</option>
          <option value="ALL_AMERICAN">All-American</option>
        </select>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Billing</label>
        <div
          style={{
            marginTop: 6,
            padding: "8px 10px",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: "#f7f7f7",
            maxWidth: 220,
          }}
        >
          Monthly
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Payment Method</label>

        <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === PaymentMethod.CARD}
              onChange={() => setPaymentMethod(PaymentMethod.CARD)}
            />
            <span>Card — 3% processing fee applies</span>
          </label>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="ach"
              checked={paymentMethod === PaymentMethod.ACH}
              onChange={() => setPaymentMethod(PaymentMethod.ACH)}
            />
            <span>ACH — no processing fee</span>
          </label>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
          Card payments include a 3% processing fee. ACH payments do not include a processing fee.
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Discount Code</label>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <input
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="Enter code"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button onClick={fetchSummary} disabled={loading}>
            {loading ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          borderTop: "1px solid #ddd",
          paddingTop: 20,
        }}
      >
        {loading && <p>Calculating...</p>}

        {summary && !loading && (
          <>
            <p>Base Price: {formatUsd(summary.basePrice)}</p>
            <p>Discount: -{formatUsd(summary.discountAmount)}</p>
            <p>Subtotal: {formatUsd(summary.discountedPrice)}</p>
            <p>
              {summary.paymentMethod === PaymentMethod.CARD
                ? "Processing Fee (Card): "
                : "Processing Fee (ACH): "}
              {formatUsd(summary.surchargeAmount)}
            </p>
            <h3>Total Due: {formatUsd(summary.finalPrice)}</h3>
          </>
        )}
      </div>

      <button
        onClick={handleCheckout}
        disabled={!summary || checkoutLoading || !playerProfileId}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          fontSize: 16,
          cursor:
            !summary || checkoutLoading || !playerProfileId
              ? "not-allowed"
              : "pointer",
          opacity:
            !summary || checkoutLoading || !playerProfileId ? 0.6 : 1,
        }}
      >
        {checkoutLoading ? "Redirecting..." : "Proceed to Payment"}
      </button>
    </div>
  );
}

export default function PlayerBillingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "Arial" }}>
          <h1>Complete Your Subscription</h1>
          <p>Loading billing page...</p>
        </div>
      }
    >
      <PlayerBillingPageInner />
    </Suspense>
  );
}