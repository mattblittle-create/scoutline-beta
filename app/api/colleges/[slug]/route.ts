import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const college = await prisma.college.findUnique({
      where: { slug: params.slug },
      include: {
        academicAreas: true,
        baseballProgram: {
          include: {
            coaches: true,
            rosterNeeds: true,
            metricAverages: true,
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json(
        { ok: false, error: "College not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, college });
  } catch (err) {
    console.error("COLLEGE_DETAIL_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not load college." },
      { status: 500 }
    );
  }
}