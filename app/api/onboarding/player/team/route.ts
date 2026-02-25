import { NextResponse } from "next/server";

type Body = {
  plan?: string | null; // "team" | "teams"

  // legacy fields
  adminEmail?: string | null;
  adminFirstName?: string | null;
  adminLastName?: string | null;
  orgName?: string | null;
  orgCity?: string | null;
  orgState?: string | null;
  orgUrl?: string | null;

  // newer /onboarding/teams fields (may be sent by mistake)
  teamName?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;

  adminPhone?: string | null;
  adminPhoneExt?: string | null;
  phonePrivate?: boolean | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function normalizeText(v: any): string {
  return String(v || "").trim();
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const plan = normalizeText(body.plan);

  const allowedPlans = new Set(["team", "teams"]);
  if (!allowedPlans.has(plan)) return jsonError("Invalid team plan.");

  const adminEmail = normalizeEmail(body.adminEmail);
  const adminFirstName = normalizeText(body.adminFirstName);
  const adminLastName = normalizeText(body.adminLastName);

  // Support either legacy org* or newer team* payloads
  const orgName = normalizeText(body.orgName || body.teamName);
  const orgCity = normalizeText(body.orgCity || body.city);
  const orgState = normalizeText(body.orgState || body.state);
  const orgUrl = normalizeText(body.orgUrl || body.website) || null;

  const adminPhone = digitsOnly(body.adminPhone).slice(0, 10);
  const adminPhoneExt = digitsOnly(body.adminPhoneExt).slice(0, 6);
  const phonePrivate = body.phonePrivate === false ? false : true;

  if (!adminEmail) return jsonError("Admin email is required.");
  if (!isEmail(adminEmail)) return jsonError("Admin email is invalid.");
  if (!adminFirstName) return jsonError("Admin first name is required.");
  if (!adminLastName) return jsonError("Admin last name is required.");
  if (!orgName) return jsonError("Team / Organization name is required.");
  if (!orgCity) return jsonError("City is required.");
  if (!orgState) return jsonError("State is required.");

  // Optional persistence attempt (won't fail the request if schema isn't ready)
  let persisted = false;
  let persistNote: string | null = null;

  try {
    const mod = await import("@/lib/prisma").catch(() => null);
    const prisma: any = (mod as any)?.prisma ?? (mod as any)?.default ?? null;

    if (prisma) {
      // ✅ Enforce "one email per role/account"
      // Block if this email is already a Coach or Player account
      const existing = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: {
          id: true,
          Player: { select: { id: true } },
          coachProfile: { select: { id: true } },
        },
      });

      if (existing?.coachProfile?.id) {
        return jsonError(
          "This email is already registered as a Coach account. Please use a different email for Team Admin.",
          409
        );
      }
      if (existing?.Player?.id) {
        return jsonError(
          "This email is already registered as a Player account. Please use a different email for Team Admin.",
          409
        );
      }

      // Preferred: store as onboarding draft
      if (prisma.onboardingDraft?.upsert) {
        await prisma.onboardingDraft.upsert({
          where: { email: adminEmail },
          create: {
            email: adminEmail,
            kind: "TEAM",
            plan,
            payload: {
              adminEmail,
              adminFirstName,
              adminLastName,
              adminPhone: adminPhone || null,
              adminPhoneExt: adminPhoneExt || null,
              phonePrivate,
              orgName,
              orgCity,
              orgState,
              orgUrl,
              plan,
            },
          },
          update: {
            plan,
            payload: {
              adminEmail,
              adminFirstName,
              adminLastName,
              adminPhone: adminPhone || null,
              adminPhoneExt: adminPhoneExt || null,
              phonePrivate,
              orgName,
              orgCity,
              orgState,
              orgUrl,
              plan,
            },
          },
        });
        persisted = true;
      }
      // Fallback: store directly on Team + create TEAM_ADMIN membership
      else if (prisma.team?.create && prisma.user?.upsert && prisma.teamMembership?.create) {
        // 1) Upsert admin user (minimal fields)
        const adminUser = await prisma.user.upsert({
          where: { email: adminEmail },
          create: {
            email: adminEmail,
            name: `${adminFirstName} ${adminLastName}`.trim(),
            role: "TEAM_ADMIN",
            workPhone: adminPhone || null,
            workPhoneExt: adminPhoneExt || null,
            phonePrivate,
          },
          update: {
            name: `${adminFirstName} ${adminLastName}`.trim(),
            workPhone: adminPhone || null,
            workPhoneExt: adminPhoneExt || null,
            phonePrivate,
          },
          select: { id: true, email: true },
        });

        // 2) If this admin already has a TEAM_ADMIN membership, reuse that team (don’t create duplicates)
        const existingAdminMembership = await prisma.teamMembership.findFirst({
          where: { userId: adminUser.id, role: "TEAM_ADMIN" },
          include: { team: true },
        });

        if (existingAdminMembership?.team) {
          // Update org fields on their existing team
          await prisma.team.update({
            where: { id: existingAdminMembership.team.id },
            data: {
              name: orgName,
              city: orgCity,
              state: orgState,
              websiteUrl: orgUrl,
            },
          });

          persisted = true;
        } else {
          // 3) Create the team (ensure unique slug)
          const baseSlug =
            orgName
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 48) || "team";

          let slug = baseSlug;
          for (let i = 0; i < 25; i++) {
            const exists = await prisma.team.findUnique({ where: { slug }, select: { id: true } });
            if (!exists) break;
            slug = `${baseSlug}-${i + 2}`;
          }

          const team = await prisma.team.create({
            data: {
              name: orgName,
              slug,
              city: orgCity,
              state: orgState,
              websiteUrl: orgUrl,
              // logoUrl stays null until uploaded
            },
            select: { id: true, slug: true },
          });

          // 4) Enforce 1 TEAM_ADMIN per team (should be empty for new team, but safe)
          const existingAdminForTeam = await prisma.teamMembership.findFirst({
            where: { teamId: team.id, role: "TEAM_ADMIN" },
            select: { id: true, userId: true },
          });
          if (existingAdminForTeam) {
            return jsonError("This team already has an admin assigned.", 409);
          }

          // 5) Create TEAM_ADMIN membership
          await prisma.teamMembership.create({
            data: {
              userId: adminUser.id,
              teamId: team.id,
              role: "TEAM_ADMIN",
              season: null,
              isPrimaryForProfile: true,
            },
          });

          persisted = true;
        }
      } else {
        persistNote = "No compatible Prisma model found (skipped persistence).";
      }
    } else {
      persistNote = "Prisma not available at @/lib/prisma (skipped persistence).";
    }
  } catch (e: any) {
    persistNote = e?.message ? `Persistence skipped: ${e.message}` : "Persistence skipped.";
  }

  return NextResponse.json({
    ok: true,
    data: {
      plan,
      adminEmail,
      orgName,
      persisted,
      persistNote,
    },
  });
}
