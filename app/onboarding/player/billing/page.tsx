// app/onboarding/player/billing/page.tsx

"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentMethod } from "@/lib/payments/types";
import { formatUsd } from "@/lib/billing/money";

type ClearentPaymentTokenResponse = {
  code?: string;
  status?: string;
  message?: string;
  error?: string;
  payload?: {
    "mobile-jwt"?: {
      jwt?: string;
      "last-four"?: string;
    };
    payloadType?: string;
  };
};

type ClearentSdk = {
  init: (options: {
    baseUrl?: string;
    pk: string;
    paymentFormId?: string;
    showValidationMessages?: boolean;
    clearFormOnSuccess?: boolean;
    accountNumberMasked?: boolean;
    routingNumberMasked?: boolean;
    styles?: string;
  }) => void;

  getPaymentToken: () => Promise<ClearentPaymentTokenResponse>;

  reset?: () => void;
};

declare global {
  interface Window {
    ClearentSDK?: ClearentSdk;
  }
}

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

const XPLOR_GATEWAY_URL =
  process.env.NEXT_PUBLIC_XPLOR_GATEWAY_URL ||
  "https://gateway-sb.clearent.net";

const XPLOR_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_XPLOR_PUBLIC_KEY || "";

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

  const [xplorScriptReady, setXplorScriptReady] = useState(false);
  const [xplorFormReady, setXplorFormReady] = useState(false);
  const [achSubmitting, setAchSubmitting] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState("");
  const [achAccountType, setAchAccountType] =
    useState<"Checking" | "Savings">("Checking");

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

  useEffect(() => {
  if (
    paymentMethod !== PaymentMethod.ACH ||
    !xplorScriptReady
  ) {
    return;
  }

  if (!XPLOR_PUBLIC_KEY) {
    setXplorFormReady(false);
    setPageError(
      "Xplor ACH is missing its browser public key."
    );
    return;
  }

  if (!window.ClearentSDK) {
    setXplorFormReady(false);
    setPageError(
      "The Xplor ACH payment form could not be loaded."
    );
    return;
  }

  try {
    setPageError("");

    window.ClearentSDK.reset?.();

window.ClearentSDK.init({
  pk: XPLOR_PUBLIC_KEY,
  paymentFormId: "payment-form",
  showValidationMessages: true,
  clearFormOnSuccess: false,
  accountNumberMasked: true,
  routingNumberMasked: true,
  styles: `
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: #0f172a;
    }

        .form-control {
          width: 100%;
          box-sizing: border-box;
          min-height: 42px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 15px;
        }

        .form-control:focus {
          border-color: #64748b;
          outline: none;
        }
      `,
    });

    setXplorFormReady(true);
  } catch (error) {
    console.error(
      "XPLOR_ACH_FORM_INIT_ERROR",
      error
    );

    setXplorFormReady(false);
    setPageError(
      "The Xplor ACH payment form could not be initialized."
    );
  }

  return () => {
    try {
      window.ClearentSDK?.reset?.();
    } catch {
      // Do not interrupt navigation if SDK cleanup fails.
    }

    setXplorFormReady(false);
  };
}, [paymentMethod, xplorScriptReady]);

const handleAchCheckout = async () => {
  try {
    if (!summary) {
      setPageError(
        "Please wait for pricing to finish loading."
      );
      return;
    }

    if (!playerProfileId) {
      setPageError(
        "Missing player profile ID for ACH checkout."
      );
      return;
    }

    if (!accountHolderName.trim()) {
      setPageError(
        "Enter the name shown on the bank account."
      );
      return;
    }

    if (!XPLOR_PUBLIC_KEY) {
      setPageError(
        "Xplor ACH is missing its browser public key."
      );
      return;
    }

    if (
      !xplorFormReady ||
      !window.ClearentSDK
    ) {
      setPageError(
        "The ACH payment form is still loading."
      );
      return;
    }

    setAchSubmitting(true);
    setPageError("");

    /*
     * Bank account and routing details remain
     * inside Xplor's hosted form. ScoutLine
     * receives only the short-lived mobile JWT.
     */
    const tokenResult =
      await window.ClearentSDK.getPaymentToken();

    const mobileJwt =
      tokenResult?.payload?.["mobile-jwt"]?.jwt || "";

    if (!mobileJwt) {
      throw new Error(
        tokenResult?.message ||
          tokenResult?.error ||
          "Xplor did not return an ACH payment token."
      );
    }

    const res = await fetch(
      "/api/payments/clearent/ach/debit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerProfileId,
          plan,
          cadence,
          discountCode,

          mobileJwt,
          accountHolderName:
            accountHolderName.trim(),
          accountType:
            achAccountType,
        }),
      }
    );

    const data = await res
      .json()
      .catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(
        data?.error ||
          "The ACH payment could not be submitted."
      );
    }

    const query = new URLSearchParams({
      payment:
        String(data.status || "")
          .toLowerCase() || "pending",

      message:
        data.message ||
        "ACH payment submitted.",

      ref:
        data.reference || "",
    });

    router.push(
      `/onboarding/player/billing?${query.toString()}`
    );
  } catch (error) {
    console.error(
      "PLAYER_ACH_CHECKOUT_ERROR",
      error
    );

    setPageError(
      error instanceof Error
        ? error.message
        : "The ACH payment could not be submitted."
    );
  } finally {
    setAchSubmitting(false);
  }
};

  const handleCheckout = async () => {
if (paymentMethod === PaymentMethod.ACH) {
  await handleAchCheckout();
  return;
}

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
  <>
    <Script
      id="xplor-ach-sdk"
      src={`${XPLOR_GATEWAY_URL}/js-sdk/js/clearent-host.js`}
      strategy="afterInteractive"
      onLoad={() => {
        setXplorScriptReady(true);
      }}
      onError={() => {
        setXplorScriptReady(false);
        setPageError(
          "The secure Xplor ACH form could not be loaded."
        );
      }}
    />

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

{paymentMethod === PaymentMethod.ACH ? (
  <div
    style={{
      marginTop: 18,
      padding: 16,
      border: "1px solid #d1d5db",
      borderRadius: 10,
      background: "#ffffff",
    }}
  >
    <h2
      style={{
        margin: "0 0 12px",
        fontSize: 18,
      }}
    >
      Bank Account
    </h2>

    <div style={{ marginBottom: 12 }}>
      <label
        htmlFor="ach-account-holder-name"
        style={{
          display: "block",
          marginBottom: 6,
          fontWeight: 700,
        }}
      >
        Name on Account
      </label>

      <input
        id="ach-account-holder-name"
        value={accountHolderName}
        onChange={(event) =>
          setAccountHolderName(event.target.value)
        }
        autoComplete="name"
        placeholder="Account holder name"
        disabled={achSubmitting}
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: 42,
          padding: "9px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 15,
        }}
      />
    </div>

    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor="ach-account-type"
        style={{
          display: "block",
          marginBottom: 6,
          fontWeight: 700,
        }}
      >
        Account Type
      </label>

      <select
        id="ach-account-type"
        value={achAccountType}
        onChange={(event) =>
          setAchAccountType(
            event.target.value as
              | "Checking"
              | "Savings"
          )
        }
        disabled={achSubmitting}
        style={{
          width: "100%",
          minHeight: 42,
          padding: "9px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          background: "#ffffff",
          fontSize: 15,
        }}
      >
        <option value="Checking">Checking</option>
        <option value="Savings">Savings</option>
      </select>
    </div>

    {!xplorScriptReady ? (
      <div
        style={{
          padding: "12px 0",
          color: "#64748b",
        }}
      >
        Loading secure bank account form...
      </div>
    ) : null}

    <div id="payment-form" />

    <div
      style={{
        marginTop: 12,
        fontSize: 12,
        lineHeight: 1.5,
        color: "#64748b",
      }}
    >
      Bank account and routing information are
      entered securely through Xplor Pay and are
      not stored by ScoutLine.
    </div>
  </div>
) : null}

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
  disabled={
    !summary ||
    checkoutLoading ||
    achSubmitting ||
    !playerProfileId ||
    (paymentMethod === PaymentMethod.ACH &&
      (!xplorScriptReady ||
        !xplorFormReady ||
        !accountHolderName.trim()))
  }
  style={{
    marginTop: 20,
    padding: "10px 20px",
    fontSize: 16,
    cursor:
      !summary ||
      checkoutLoading ||
      achSubmitting ||
      !playerProfileId ||
      (paymentMethod === PaymentMethod.ACH &&
        (!xplorScriptReady ||
          !xplorFormReady ||
          !accountHolderName.trim()))
        ? "not-allowed"
        : "pointer",
    opacity:
      !summary ||
      checkoutLoading ||
      achSubmitting ||
      !playerProfileId ||
      (paymentMethod === PaymentMethod.ACH &&
        (!xplorScriptReady ||
          !xplorFormReady ||
          !accountHolderName.trim()))
        ? 0.6
        : 1,
  }}
>
  {paymentMethod === PaymentMethod.ACH
    ? achSubmitting
      ? "Submitting ACH Payment..."
      : "Submit ACH Payment"
    : checkoutLoading
      ? "Redirecting..."
      : "Proceed to Card Payment"}
</button>
    </div>
  </>
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