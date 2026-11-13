// app/api/player/billing/payment-method-token/page-token/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getValorBaseUrl() {
  return (
    process.env.VALOR_PASSAGE_BASE_URL ||
    process.env.VALOR_DIRECT_TOKEN_URL ||
    "https://securelink-prod.valorpaytech.com:4430/"
  ).replace(/\/+$/, "");
}

export async function POST() {
  try {
    const appid = process.env.VALOR_APP_ID || "";
    const appkey = process.env.VALOR_APP_KEY || "";
    const epi = process.env.VALOR_EPI || "";

    if (!appid || !appkey || !epi) {
      return NextResponse.json(
        { ok: false, error: "Missing Valor credentials." },
        { status: 500 }
      );
    }

    const valorBaseUrl = getValorBaseUrl();
    const url = `${valorBaseUrl}/?gptoken`;

    const valorRes = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        appid,
        appkey,
        epi,
        txn_type: "clientToken",
      }),
      cache: "no-store",
    });

    const json: any = await valorRes.json().catch(() => null);

    const clientToken =
      json?.clientToken ||
      json?.client_token ||
      json?.token ||
      json?.data?.clientToken ||
      json?.data?.client_token ||
      "";

    if (!valorRes.ok || !clientToken) {
      console.error("VALOR_PAGE_TOKEN_ERROR", {
        status: valorRes.status,
        response: json,
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            json?.desc ||
            json?.msg ||
            json?.message ||
            "Valor did not return a client token.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      clientToken: String(clientToken),
      epi,
      valorBaseUrl,
    });
  } catch (error) {
    console.error("VALOR_PAGE_TOKEN_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create Valor client token." },
      { status: 500 }
    );
  }
}