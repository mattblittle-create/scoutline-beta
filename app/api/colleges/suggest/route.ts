import { NextResponse } from "next/server";

// Minimal placeholder autocomplete endpoint.
// Replace with a real DB lookup later.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();

  // Dummy data for now:
  const colleges = [
    { id: "1", name: "Alabama", state: "AL" },
    { id: "2", name: "Arizona State", state: "AZ" },
    { id: "3", name: "Arkansas", state: "AR" },
  ];

  const out = q.length < 2
    ? []
    : colleges.filter(c => c.name.toLowerCase().includes(q));

  return NextResponse.json(out);
}
