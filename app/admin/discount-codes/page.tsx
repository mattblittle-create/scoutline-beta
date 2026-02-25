// app/admin/discount-codes/page.tsx

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminDiscountCodesRedirect() {
  redirect("/admin/billing/discounts");
}
