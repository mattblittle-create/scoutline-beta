// app/admin/billing/subscritions/page.tsx

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminBillingSubscriptionsRedirect() {
  redirect("/admin/subscriptions");
}
