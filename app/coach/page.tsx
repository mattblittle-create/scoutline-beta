// app/coach/by-email/[email]/page.tsx
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CoachByEmailPage({ params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email || "").toLowerCase().trim();
  if (!email) notFound();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { slug: true }
  });

  if (!user) notFound();
  if (user.slug) redirect(`/coach/${user.slug}`);

  // Fallback if no slug yet — you can render something simple or redirect to home
  redirect("/"); // or render a minimal page saying "profile not claimed yet"
}
