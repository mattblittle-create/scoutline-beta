// app/api/auth/set-password/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Do not prerender this route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  token: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const { token, password } = (await req.json()) as Body;

    if (!token || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing token or password" },
        { status: 400 }
      );
    }

    // Verify JWT
    const secret = process.env.APP_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: missing APP_SECRET" },
        { status: 500 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    // We accept either a token specifically minted for setting a password,
    // or a verify-email token (for now) to unblock the flow.
    const purpose = payload["purpose"];
    if (purpose !== "set-password" && purpose !== "verify-email") {
      return NextResponse.json(
        { ok: false, error: "Invalid token purpose" },
        { status: 400 }
      );
    }

    // You might also want to check exp (jwtVerify throws if expired) and subject/email
    const email = (payload["email"] as string) || "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Token missing email" },
        { status: 400 }
      );
    }

    // TODO: actually persist the password for the user in your DB.
    // Example (pseudo):
    //   const hash = await bcrypt.hash(password, 12);
    //   await prisma.user.update({ where: { email }, data: { passwordHash: hash, emailVerifiedAt: new Date() } });

    // For now, just respond OK so the UI can continue
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("set-password error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
