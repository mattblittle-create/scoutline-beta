// app/dashboard/player/profile/billing/update-payment/page.tsx

import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getPortalUrl(args: {
  playerProfileId?: string;
  invoiceId?: string;
}) {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.myscoutline.com";

    const params = new URLSearchParams();

    if (args.playerProfileId) {
      params.set("playerProfileId", args.playerProfileId);
    }

    if (args.invoiceId) {
      params.set("invoiceId", args.invoiceId);
    }

    const qs = params.toString();
    const url = `${base}/api/player/billing/payment-portal${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();

    return json?.url || null;
  } catch {
    return null;
  }
}

export default async function PlayerUpdatePaymentPage({
  searchParams,
}: PageProps) {
  const sp = (await searchParams) || {};

  const playerProfileId = firstParam(sp.playerProfileId);
  const invoiceId = firstParam(sp.invoiceId);

  const portalUrl = await getPortalUrl({
    playerProfileId,
    invoiceId,
  });

  const backHref = playerProfileId
    ? `/dashboard/player/profile/billing?playerProfileId=${playerProfileId}`
    : "/dashboard/player/profile/billing";

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          background: "#fff",
          padding: 24,
          boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "6px 10px",
            borderRadius: 999,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          Billing Recovery
        </div>

        <h1
          style={{
            marginTop: 14,
            fontSize: 30,
            lineHeight: 1.1,
            color: "#0f172a",
            fontWeight: 950,
          }}
        >
          Update Billing Method
        </h1>

        <div
          style={{
            marginTop: 12,
            color: "#475569",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          Your ScoutLine subscription billing method may need to be updated
          before future recurring payments can be successfully processed.
        </div>

        {invoiceId ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Recovery reference: {invoiceId}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            color: "#475569",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          Updating your payment method helps prevent interruptions to:
        </div>

        <ul
          style={{
            marginTop: 10,
            paddingLeft: 20,
            color: "#334155",
            lineHeight: 1.8,
            fontWeight: 700,
          }}
        >
          <li>Player profile editing</li>
          <li>Recruiting tools and recommendations</li>
          <li>Coach teaser card sharing</li>
          <li>Suggested Programs access</li>
          <li>Truth Fit recruiting analysis</li>
        </ul>

        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#475569",
            lineHeight: 1.7,
            fontSize: 14,
          }}
        >
          ScoutLine securely utilizes a third-party hosted payment platform.
          Full payment credentials are never stored directly within ScoutLine.
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {portalUrl ? (
            <a
              href={portalUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                padding: "12px 18px",
                background: "#0ea5e9",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Update Payment Method
            </a>
          ) : (
            <div
              style={{
                color: "#b91c1c",
                fontWeight: 900,
              }}
            >
              Unable to load billing portal right now.
            </div>
          )}

          <Link
            href={backHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              padding: "12px 18px",
              background: "#fff",
              color: "#0f172a",
              border: "1px solid #e5e7eb",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Back to Billing
          </Link>
        </div>
      </div>
    </main>
  );
}