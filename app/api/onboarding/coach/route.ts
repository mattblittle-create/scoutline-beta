// app/api/onboarding/coach/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugifyName, generateUniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name: string;
  role: string;
  collegeProgram: string;
  workEmail: string;
  workPhone?: string;
  phonePrivate?: boolean;
  inviteEmails?: string[];
};

export async function POST(req: Request) {
  try {
    const {
      name,
      role,
      collegeProgram,
      workEmail,
      workPhone = "",
      phonePrivate = true,
    } = (await req.json()) as Body;

    const email = (workEmail || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Work email is required." },
        { status: 400 }
      );
    }
    if (!name?.trim() || !role?.trim() || !collegeProgram?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Name, role, and college program are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, slug: true },
    });

    let slugToSet: string | undefined;
    if (!existing?.slug && name?.trim()) {
      const base = slugifyName(name);
      slugToSet = await generateUniqueSlug(prisma, base);
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name.trim(),
        role: role.trim(),
        program: collegeProgram.trim(),
        workPhone: workPhone.trim() || null,
        phonePrivate,
        ...(slugToSet ? { slug: slugToSet } : {}),
      },
      create: {
        email,
        name: name.trim(),
        role: role.trim(),
        program: collegeProgram.trim(),
        workPhone: workPhone.trim() || null,
        phonePrivate,
        slug: slugToSet, // may be undefined—Prisma will accept
      },
      select: {
        email: true,
        name: true,
        role: true,
        program: true,
        slug: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("coach onboarding error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
