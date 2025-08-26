// app/api/onboarding/coach/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoachFormPayload = {
  name: string;
  role: string;
  collegeProgram: string;
  workEmail: string;
  workPhone?: string;
  phonePrivate: boolean;
  inviteEmails?: string[]; // collected client-side; not persisted here (yet)
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CoachFormPayload>;

    // Basic validation
    const name = (body.name || "").trim();
    const role = (body.role || "").trim();
    const collegeProgram = (body.collegeProgram || "").trim();
    const workEmail = (body.workEmail || "").trim().toLowerCase();
    const workPhone = (body.workPhone || "").trim();
    const phonePrivate = Boolean(body.phonePrivate);

    if (!name) return bad("Name is required.");
    if (!role) return bad("Role is required.");
    if (!collegeProgram) return bad("College / Program is required.");
    if (!workEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
      return bad("A valid work email is required.");
    }

    // Upsert by email (idempotent)
    await prisma.user.upsert({
      where: { email: workEmail },
      create: {
        email: workEmail,
        name,
        role,
        program: collegeProgram,
        workPhone: workPhone || null,
        phonePrivate,
      },
      update: {
        name,
        role,
        program: collegeProgram,
        workPhone: workPhone || null,
        phonePrivate,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("onboarding/coach error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

function bad(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}
