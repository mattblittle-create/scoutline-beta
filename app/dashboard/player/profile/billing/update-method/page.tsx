// app/dashboard/player/profile/billing/update-method/page.tsx

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    PassageJS?: any;
  }
}

function UpdateMethodContent() {
  const params = useSearchParams();
  const playerProfileId = params.get("playerProfileId") || "";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientToken, setClientToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadToken() {
      try {
        setLoading(true);

        const res = await fetch(
          "/api/player/billing/payment-method-token/page-token",
          { method: "POST" }
        );

        const json = await res.json();

        if (!res.ok || !json?.clientToken) {
          throw new Error(json?.error || "Failed to initialize payment form.");
        }

        if (!mounted) return;
        setClientToken(json.clientToken);
      } catch (err: any) {
        setError(err?.message || "Failed to load payment form.");
      } finally {
        setLoading(false);
      }
    }

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit() {
    try {
      setError("");
      setSuccess("");
      setSaving(true);

      if (!playerProfileId) {
        throw new Error("Missing player profile.");
      }

      if (!window.PassageJS) {
        throw new Error("Payment form not loaded.");
      }

      const result = await window.PassageJS.createCardToken();

      const cardToken =
        result?.cardToken ||
        result?.token ||
        result?.data?.cardToken ||
        "";

      if (!cardToken) {
        throw new Error(
          result?.message || "Valor did not return a reusable card token."
        );
      }

      const last4 = result?.last4 || result?.card_last4 || "";
      const brand = result?.card_brand || result?.brand || "";
      const paymentType = result?.card_type || result?.paymentType || "";

      const saveRes = await fetch(
        "/api/player/billing/payment-method-token/save",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            playerProfileId,
            cardToken,
            last4,
            brand,
            paymentType,
          }),
        }
      );

      const saveJson = await saveRes.json();

      if (!saveRes.ok || !saveJson?.ok) {
        throw new Error(saveJson?.error || "Failed to save payment method.");
      }

      setSuccess("Payment information updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to update payment method.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Update Payment Info</h1>

      <p style={{ opacity: 0.75, marginBottom: 24 }}>
        Your card will NOT be charged. This updates the payment method used for
        future recurring billing.
      </p>

      {error ? (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #ef4444",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #22c55e",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            color: "#166534",
          }}
        >
          {success}
        </div>
      ) : null}

      <div
        id="payment-form"
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          minHeight: 180,
        }}
      >
        {loading ? "Loading secure payment form..." : null}
      </div>

      {clientToken ? (
        <script
          src="https://passage.valorpaytech.com/PassageJS/v2/PassageJS.min.js"
          onLoad={() => {
            if (!window.PassageJS) return;

            window.PassageJS.init({
              clientToken,
              container: "payment-form",
            });
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || loading || !clientToken}
        style={{
          background: "#0369a1",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "12px 18px",
          fontWeight: 700,
          cursor: saving || loading || !clientToken ? "not-allowed" : "pointer",
          opacity: saving || loading || !clientToken ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Update Payment Info"}
      </button>
    </main>
  );
}

export default function UpdateMethodPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading payment form...</div>}>
      <UpdateMethodContent />
    </Suspense>
  );
}