import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    // TODO: persist payload (DB)
    console.info("[onboarding:coach] received", payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
