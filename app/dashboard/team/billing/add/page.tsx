// app/dashboard/team/billing/add/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Add Billing Info • Team Dashboard • ScoutLine",
  description: "Add a payment method for your team billing.",
};

export default function TeamBillingAddPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const teamSlugRaw = searchParams?.teamSlug;
  const teamSlug = Array.isArray(teamSlugRaw) ? teamSlugRaw[0] : teamSlugRaw;

  const backHref = `/dashboard/team/billing${teamSlug ? `?teamSlug=${encodeURIComponent(teamSlug)}` : ""}`;

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
          <span>Add Billing Info</span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Add Billing Info</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add a card or ACH/eCheck account. Cards include a 3% processing charge. Use ACH/eCheck to avoid the charge.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Secure entry</div>
        <div className="mt-2 text-sm text-slate-700">
          This page should be implemented as a secure payment collection flow (Stripe Elements, hosted portal, or
          tokenized iframe). We will never store raw card/bank details in ScoutLine.
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <div className="font-semibold text-slate-900">Processing fee notice</div>
          <div className="mt-1">
            A <span className="font-semibold">3% charge</span> applies to all credit/debit card transactions. To avoid
            this charge, use <span className="font-semibold">ACH / eCheck</span>.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            onClick={() => {
              // TODO: start card flow (Stripe Elements / Checkout / Portal)
              alert("TODO: wire secure Card flow");
            }}
          >
            Add Credit/Debit Card
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            onClick={() => {
              // TODO: start ACH flow (Stripe Financial Connections / ACH)
              alert("TODO: wire secure ACH/eCheck flow");
            }}
          >
            Add ACH / eCheck
          </button>
        </div>

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
