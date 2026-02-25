// app/admin/subscriptions/page.tsx

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminSubscriptionsRedirect() {
  redirect("/admin/billing/subscriptions");
}
