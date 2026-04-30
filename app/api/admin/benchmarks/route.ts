// app/api/admin/benchmarks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_SCOPES = ["SCHOOL", "CONFERENCE", "DIVISION", "GLOBAL"] as const;

function asString(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

function asNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isValidScope(value: unknown): value is (typeof VALID_SCOPES)[number] {
  return VALID_SCOPES.includes(String(value) as any);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const scope = url.searchParams.get("scope");
    const sourceKey = url.searchParams.get("sourceKey");
    const position = url.searchParams.get("position");
    const metricKey = url.searchParams.get("metricKey");

    const where: any = {};

    if (scope && isValidScope(scope)) where.scope = scope;
    if (sourceKey) where.sourceKey = sourceKey;
    if (position) where.position = position;
    if (metricKey) where.metricKey = metricKey;

    const benchmarks = await prisma.baseballMetricBenchmark.findMany({
      where,
      orderBy: [
        { scope: "asc" },
        { sourceKey: "asc" },
        { position: "asc" },
        { metricKey: "asc" },
      ],
      take: 500,
    });

    return NextResponse.json({ ok: true, benchmarks });
  } catch (err) {
    console.error("ADMIN_BENCHMARKS_GET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not load benchmarks." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const scope = body?.scope;
    const sourceKey = asString(body?.sourceKey);
    const position = asString(body?.position)?.toUpperCase();
    const metricKey = asString(body?.metricKey);

    if (!isValidScope(scope)) {
      return NextResponse.json({ ok: false, error: "Invalid scope." }, { status: 400 });
    }

    if (!sourceKey || !position || !metricKey) {
      return NextResponse.json(
        { ok: false, error: "Missing sourceKey, position, or metricKey." },
        { status: 400 }
      );
    }

    const saved = await prisma.baseballMetricBenchmark.upsert({
      where: {
        scope_sourceKey_position_metricKey: {
          scope,
          sourceKey,
          position,
          metricKey,
        },
      },
      update: {
        metricLabel: asString(body?.metricLabel),
        averageValue: asNumber(body?.averageValue),
        minValue: asNumber(body?.minValue),
        maxValue: asNumber(body?.maxValue),
        unit: asString(body?.unit),
        sampleSize: asNumber(body?.sampleSize),
        sourceUrl: asString(body?.sourceUrl),
        sourceNote: asString(body?.sourceNote),
        verifiedAt: body?.verifiedAt ? new Date(body.verifiedAt) : null,
      },
      create: {
        scope,
        sourceKey,
        position,
        metricKey,
        metricLabel: asString(body?.metricLabel),
        averageValue: asNumber(body?.averageValue),
        minValue: asNumber(body?.minValue),
        maxValue: asNumber(body?.maxValue),
        unit: asString(body?.unit),
        sampleSize: asNumber(body?.sampleSize),
        sourceUrl: asString(body?.sourceUrl),
        sourceNote: asString(body?.sourceNote),
        verifiedAt: body?.verifiedAt ? new Date(body.verifiedAt) : null,
      },
    });

    return NextResponse.json({ ok: true, benchmark: saved });
  } catch (err) {
    console.error("ADMIN_BENCHMARKS_POST_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not save benchmark." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    const id = asString(body?.id);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing benchmark id." }, { status: 400 });
    }

    await prisma.baseballMetricBenchmark.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ADMIN_BENCHMARKS_DELETE_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not delete benchmark." },
      { status: 500 }
    );
  }
}