// app/staff/page.tsx
import { redirect } from "next/navigation";

export default function StaffPortalPage() {
  redirect("/login?next=%2Fadmin");
}