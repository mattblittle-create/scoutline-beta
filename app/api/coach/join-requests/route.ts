// app/api/coach/join-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };
type StaffRole = "HEAD" | "ASSISTANT" | "RECRUITING" | "ADMIN";

function normalizeRole(v: any): StaffRole {
  const raw = String(v ?? "").trim().toUpperCase();
  if (raw === "HEAD") return "HEAD";
  if (raw === "RECRUITING") return "RECRUITING";
  if (raw === "ADMIN") return "ADMIN";
  return "ASSISTANT";
}

async function notifyProgramAdminsOfJoinRequest(params: {
  collegeId: string;
  requestedByUserId: string;
  requestedRole: StaffRole;
}) {
  const requester = await prisma.user.findUnique({
    where: { id: params.requestedByUserId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const college = await prisma.college.findUnique({
    where: { id: params.collegeId },
    select: {
      id: true,
      name: true,
    },
  });

  const requesterName =
    requester?.name || requester?.email || "A coach";

  const admins = await prisma.user.findMany({
    where: {
      collegeId: params.collegeId,
      id: { not: params.requestedByUserId },
      coachProfile: {
        isProgramAdmin: true,
      },
    },
    select: {
      id: true,
      notificationPreference: {
        select: {
          instantStaffActivity: true,
        },
      },
    },
  });

  const adminIds = admins
    .filter((admin) => admin.notificationPreference?.instantStaffActivity !== false)
    .map((admin) => admin.id);

  if (!adminIds.length) return;

  await prisma.notification.createMany({
    data: adminIds.map((userId) => ({
      userId,
      type: "COACH_JOIN_REQUEST_SUBMITTED",
      message: `${requesterName} requested to join ${college?.name || "your program"} as ${params.requestedRole}.`,
      data: {
        collegeId: params.collegeId,
        collegeName: college?.name || null,
        requestedByUserId: params.requestedByUserId,
        requestedRole: params.requestedRole,
        event: "COACH_JOIN_REQUEST_SUBMITTED",
      },
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Already affiliated? Nothing to request.
  if (user.collegeId) {
    return NextResponse.json<Err>({ ok: false, error: "You are already linked to a college." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const collegeId = String(body?.collegeId || "").trim();
  const requestedRole = normalizeRole(body?.requestedRole);
  const proofUrl = String(body?.proofUrl || "").trim();
  const notes = String(body?.notes || "").trim();

  if (!collegeId) return NextResponse.json<Err>({ ok: false, error: "collegeId is required." }, { status: 400 });

  // Ensure college exists
  const college = await prisma.college.findUnique({ where: { id: collegeId }, select: { id: true, name: true } });
  if (!college) return NextResponse.json<Err>({ ok: false, error: "College not found." }, { status: 404 });

  // Prevent duplicate pending requests for the same user
  const existingPending = await prisma.coachJoinRequest.findFirst({
    where: { requestedByUserId: user.id, status: "PENDING" as any },
    select: { id: true, collegeId: true, createdAt: true },
  });

  if (existingPending) {
    return NextResponse.json({
      ok: true,
      data: {
        request: {
          id: existingPending.id,
          status: "PENDING",
          collegeId: existingPending.collegeId,
          createdAt: existingPending.createdAt.toISOString(),
          message: "You already have a pending join request.",
        },
      },
    });
  }

  const created = await prisma.coachJoinRequest.create({
    data: {
      collegeId,
      requestedByUserId: user.id,
      requestedRole: requestedRole as any,
      proofUrl: proofUrl || null,
      notes: notes || null,
      status: "PENDING" as any,
    },
  });

  await notifyProgramAdminsOfJoinRequest({
  collegeId,
  requestedByUserId: user.id,
  requestedRole,
});

  return NextResponse.json({
    ok: true,
    data: {
      request: {
        id: created.id,
        status: created.status,
        collegeId: created.collegeId,
        requestedRole,
        proofUrl: created.proofUrl,
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
      },
    },
  });
}

// Optional: let the current coach view their latest request (helps UI)
export async function GET(_req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  const latest = await prisma.coachJoinRequest.findFirst({
    where: { requestedByUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { college: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    ok: true,
    data: {
      request: latest
        ? {
            id: latest.id,
            status: latest.status,
            college: latest.college ? { id: latest.college.id, name: latest.college.name } : null,
            requestedRole: latest.requestedRole,
            proofUrl: latest.proofUrl,
            notes: latest.notes,
            createdAt: latest.createdAt.toISOString(),
            decidedAt: latest.decidedAt ? latest.decidedAt.toISOString() : null,
          }
        : null,
    },
  });
}
