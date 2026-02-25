// app/dashboard/team/billing/methods/[methodId]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function maskLast4(last4?: string | null) {
  const l4 = String(last4 || "").trim();
  return l4 ? `•••• ${l4}` : "•••• ••••";
}

export const metadata = {
  title: "Manage Billing Method • Team Dashboard • ScoutLine",
  description: "Update billing method details securely.",
};

export default async function TeamBillingMethodPage({
  params,
  searchParams,
}: {
  params: { methodId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const methodId = params.methodId;

  const teamSlugRaw = searchParams?.teamSlug;
  const teamSlug = Array.isArray(teamSlugRaw) ? teamSlugRaw[0] : teamSlugRaw;

  const backHref = `/dashboard/team/billing${teamSlug ? `?teamSlug=${encodeURIComponent(teamSlug)}` : ""}`;

  // Safe, schema-agnostic fetch (won’t type-break before model exists)
  let method: any | null = null;
  try {
    method = await (prisma as any).billingMethod?.findUnique?.({
      where: { id: methodId },
    });
  } catch {
    method = null;
  }

  const kind = String(method?.kind || "CARD").toUpperCase() === "ACH" ? "ACH" : "CARD";
  const label =
    kind === "ACH"
      ? String(method?.bankName || method?.institutionName || "Bank")
      : String(method?.brand || method?.cardBrand || "Card");
  const last4 = String(method?.last4 || method?.accountLast4 || method?.cardLast4 || "");
  const exp =
    kind === "CARD" && (method?.expMonth || method?.expYear)
      ? `${String(method?.expMonth || "").padStart(2, "0")}/${String(method?.expYear || "").slice(-2)}`
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <div className="text-sm text-slate-500">
          <Link href="/dashboard/team" className="hover:underline">
            Teams Dashboard
          </Link>{" "}
          <span className="mx-2">/</span>
          <Link href={backHref} className="hover:underline">
            Billing
          </Link>{" "}
          <span className="mx-2">/</span>
          <span>Manage Method</span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Manage Billing Method</h1>
        <p className="mt-1 text-sm text-slate-600">
          Billing methods are always displayed with masked details only. Updates should be handled in a secure payment
          flow.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {!method ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Could not load this billing method (or it doesn’t exist yet in the database).
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  {kind === "ACH" ? "ACH / eCheck" : "Card"}
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {label} {maskLast4(last4)}
                  {kind === "CARD" && exp ? (
                    <span className="ml-2 text-sm font-normal text-slate-500">exp {exp}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-slate-500">ID: {methodId}</div>
              </div>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Masked
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Processing fee notice</div>
              <div className="mt-1">
                A <span className="font-semibold">3% charge</span> applies to all credit/debit card transactions. To
                avoid this charge, use <span className="font-semibold">ACH / eCheck</span>.
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => alert("TODO: secure update flow (change exp / update details)")}
              >
                Update Details
              </button>

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => alert("TODO: set default method")}
              >
                Set as Default
              </button>

              <button
                type="button"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 hover:bg-rose-100 sm:col-span-2"
                onClick={() => alert("TODO: delete method (secure)")}
              >
                Delete Billing Method
              </button>
            </div>
          </>
        )}

        <div className="mt-6">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Back to Billing
          </Link>
        </div>
      </div>
    </div>
  );
}
