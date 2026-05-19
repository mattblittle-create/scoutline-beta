// app/dashboard/player/profile/billing/update-method/page.tsx

"use client";

import Script from "next/script";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    PassageJS?: any;
  }
}

function getTokenFromResult(result: any) {
  return (
    result?.cardToken ||
    result?.token ||
    result?.data?.cardToken ||
    result?.data?.token ||
    ""
  );
}

function getLast4FromResult(result: any) {
  const explicit =
    result?.last4 ||
    result?.card_last4 ||
    result?.data?.last4 ||
    result?.data?.card_last4 ||
    "";

  if (explicit) return String(explicit);

  const masked =
    result?.masked_card_no ||
    result?.maskedCard ||
    result?.data?.masked_card_no ||
    "";

  return masked ? String(masked).slice(-4) : "";
}

function UpdateMethodContent() {
  const params = useSearchParams();
  const playerProfileId = params.get("playerProfileId") || "";

  const passageRef = useRef<any>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clientToken, setClientToken] = useState("");
  const [epi, setEpi] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveToken(result: any) {
    const cardToken = getTokenFromResult(result);

    if (!cardToken) {
      throw new Error("Valor did not return a reusable card token.");
    }

    const last4 = getLast4FromResult(result);

    const brand =
      result?.card_brand ||
      result?.brand ||
      result?.data?.card_brand ||
      result?.data?.brand ||
      "";

    const paymentType =
      result?.card_type ||
      result?.paymentType ||
      result?.data?.card_type ||
      result?.data?.paymentType ||
      "";

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
  }

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

        setClientToken(String(json.clientToken));
        setEpi(String(json.epi || ""));
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

  useEffect(() => {
    if (!scriptReady || !clientToken || !epi || !window.PassageJS) return;

    try {
      setError("");

      passageRef.current = new window.PassageJS({
        clientToken,
        epi,
        container: "payment-form",
        submitText: "Update Payment Info",

        onTokenReceived: async (token: any, method: any) => {
          try {
            setSaving(true);
            await saveToken({
              token,
              paymentType: method,
            });
          } catch (err: any) {
            setError(err?.message || "Failed to save payment method.");
          } finally {
            setSaving(false);
          }
        },

        onError: (err: any) => {
          setError(
            err?.message ||
              err?.msg ||
              "Valor could not tokenize this payment method."
          );
        },
      });

      if (passageRef.current?.on) {
        passageRef.current.on("tokenReceived", async (data: any) => {
          try {
            setSaving(true);
            await saveToken(data);
          } catch (err: any) {
            setError(err?.message || "Failed to save payment method.");
          } finally {
            setSaving(false);
          }
        });
      }
    } catch (err: any) {
      setError(err?.message || "Payment form failed to initialize.");
    }
  }, [scriptReady, clientToken, epi]);

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Script
        src="https://js.valorpaytech.com/V2/js/Passage.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Payment form script failed to load.")}
      />

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
          minHeight: 220,
        }}
      >
        {loading || !scriptReady || !clientToken
          ? "Loading secure payment form..."
          : null}
      </div>

      {saving ? (
        <div style={{ color: "#64748b", fontWeight: 800 }}>
          Saving payment method...
        </div>
      ) : null}
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